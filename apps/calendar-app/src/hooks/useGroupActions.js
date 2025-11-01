// hooks/useGroupActions.js
import { use, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useTaskActions } from "./useTaskActions";
import { addUserToCalendar } from "../services/calendarService";
import { addMessageToUser } from "../services/messageService";
import {
  updateDocument,
  createDocument,
  deleteDocument,
  getDocumentsByField,
} from "../services/firestoreService";
import { DateTime } from "luxon";
import * as Crypto from "expo-crypto";
import { arrayUnion } from "firebase/firestore";

export const useGroupActions = () => {
  const { user: authUser } = useAuth();
  const { user, myUsername, myUserId } = useData();
  const { createTaskDoc } = useTaskActions();

  const uuidv4 = () => Crypto.randomUUID();

  // Secure random invite code generator
  const generateInviteCode = async (length = 8) => {
    // Generate random bytes
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    // Convert each byte to base36 (0-9, A-Z) and slice to desired length
    return Array.from(randomBytes)
      .map((b) => (b % 36).toString(36).toUpperCase())
      .join("")
      .substring(0, length);
  };

  const createGroup = useCallback(
    async (groupData) => {
      try {
        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }

        console.log(
          "Creating group with data:",
          groupData,
          "for user:",
          authUser.uid
        );
        console.log("My User Info:", { myUserId, myUsername });

        // Validate required data
        if (!myUserId || !myUsername) {
          throw new Error("User profile data missing");
        }

        // Generate group Id
        const groupId = uuidv4();
        const groupCalendarId = uuidv4();
        console.log(
          "Generated Group ID:",
          groupId,
          "and internal Group Calendar ID:",
          groupCalendarId
        );

        // Generate invite codes
        const adminInviteCode = await generateInviteCode();
        const memberInviteCode = await generateInviteCode();
        const childInviteCode = await generateInviteCode();

        console.log("Generated Invite Codes:");
        console.log("  Admin:", adminInviteCode);
        console.log("  Member:", memberInviteCode);
        console.log("  Child:", childInviteCode);

        // Get Selected Calendars Details - FIX: Handle the correct calendar structure
        let sharedCalendars = [
          {
            calendarId: groupCalendarId,
            name: `${groupData.groupName} Group Calendar`,
            calendarType: "internal",
            isOwner: true,
            permissions: "write",
            color: groupData.groupCalendarColor || "#3B82F6",
            description: `${groupData.groupName} Group Calendar`,
            importedBy: myUserId,
          },
        ];
        if (groupData.calendars && groupData.calendars.length > 0) {
          sharedCalendars = groupData.calendars.map((cal) => ({
            calendarId: cal.id || cal.calendarId,
            name: cal.name || "",
            calendarAddress: cal.calendarAddress || cal.address || "",
            calendarType: cal.calendarType || cal.type || "unknown",
            isOwner: false,
            permissions: "read",
            color: cal.color || "#2196F3",
            description: cal.description || "",
            importedBy: myUserId,
          }));
        }

        const createdAt = DateTime.now().toISO();

        // FIX: Ensure no undefined values in the document
        const newGroup = {
          groupId,
          name: groupData.groupName || "",
          description: groupData.description || "",
          createdBy: {
            userId: myUserId,
            username: myUsername,
          },
          createdDate: createdAt,
          updatedDate: createdAt,
          color: groupData.color || "#2196F3",
          members: [
            {
              userId: myUserId,
              username: myUsername,
              role: "admin",
              joinedAt: createdAt,
              active: true,
              groupCreator: true,
              notifyFor: {
                groupActivity:
                  user.preferences?.notifyFor?.groupActivity ?? true,
                newTasks: user.preferences?.notifyFor?.newTasks ?? true,
                updatedTasks: user.preferences?.notifyFor?.updatedTasks ?? true,
                deletedTasks: user.preferences?.notifyFor?.deletedTasks ?? true,
                newNotes: user.preferences?.notifyFor?.newNotes ?? true,
                mentions: user.preferences?.notifyFor?.mentions ?? true,
                reminders: user.preferences?.notifyFor?.reminders ?? true,
                messages: user.preferences?.notifyFor?.messages ?? true,
                newEvents: user.preferences?.notifyFor?.newEvents ?? true,
                updatedEvents: user.preferences?.notifyFor?.updatedEvents ?? true,
                deletedEvents: user.preferences?.notifyFor?.deletedEvents ?? true,
              },
            },
          ],
          calendars: sharedCalendars,
          inviteCodes: {
            admin: adminInviteCode,
            member: memberInviteCode,
            child: childInviteCode,
          },
        };

        console.log(
          "Creating group document:",
          JSON.stringify(newGroup, null, 2)
        );

        const internalCalendarData = {
          admins: [myUserId],
          calendarId: groupCalendarId,
          color: groupData.groupCalendarColor || "#3B82F6",
          createdAt: createdAt,
          createdBy: myUserId,
          events: {},
          description: `${groupData.groupName} Group Calendar`,
          isActive: true,
          name: `${groupData.groupName} Group Calendar`,
          subscribingUsers: [myUserId],
          type: "internal",
          updatedAt: createdAt,
        };

        // ATOMIC OPERATIONS: Create group and task documents
        try {
          // Step 1: Create group document
          await createDocument("groups", groupId, newGroup);
          console.log("✅ Group document created");

          // Step 2: Create task document using the dedicated function
          await createTaskDoc(groupData, groupId, {
            userId: myUserId,
            username: myUsername,
          });
          console.log("✅ Task document created");

          // Step 3: Create the internal calendar document
          await createDocument(
            "calendars",
            groupCalendarId,
            internalCalendarData
          );
          console.log("✅ Internal calendar document created");
        } catch (error) {
          console.error("❌ Atomic operation failed:", error);

          // Rollback: Delete created documents
          const rollbackPromises = [
            deleteDocument("groups", groupId).catch((err) =>
              console.error("Group rollback failed:", err)
            ),
            deleteDocument("calendars", groupCalendarId).catch((err) =>
              console.error("Calendar rollback failed:", err)
            ),
            deleteDocument("tasks", groupId).catch((err) =>
              console.error("Task rollback failed:", err)
            ),
          ];

          await Promise.allSettled(rollbackPromises);
          console.log("🔄 Rollback operations completed");

          throw new Error("Failed to create complete group structure");
        }

        // Step 4: Update user's groups and calendars arrays (only after all documents are created)
        const groupRef = {
          groupId,
          name: groupData.groupName,
          role: "admin",
          joinedAt: createdAt,
        };

        // Create calendar reference for user's calendars array
        const userCalendarRef = {
          calendarId: groupCalendarId,
          name: `${groupData.groupName} Group Calendar`,
          calendarType: "internal",
          isOwner: true,
          permissions: "write",
          color: groupData.groupCalendarColor || "#3B82F6",
          description: `${groupData.groupName} Group Calendar`,
          importedBy: myUserId,
        };

        // Update both arrays in a single operation
        const updatedGroups = [...(user.groups || []), groupRef];
        const updatedCalendars = [...(user.calendars || []), userCalendarRef];

        await updateDocument("users", authUser.uid, {
          groups: updatedGroups,
          calendars: updatedCalendars,
        });

        console.log("✅ Successfully created group and updated user:", groupId);
        return newGroup;
      } catch (error) {
        console.error("Error creating group:", error);
        throw error; // Re-throw so the UI can handle it
      }
    },
    [authUser, myUserId, myUsername, user?.groups, user?.calendars, createTaskDoc]
  );

  const joinGroup = useCallback(
    async (groupName, joinCode) => {
      try {
        console.log("Joining group:", groupName, "with code:", joinCode);

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!myUserId || !myUsername) {
          throw new Error("User profile data missing");
        }

        // Check if already in group
        if (user.groups?.some((g) => g.name === groupName)) {
          throw new Error("You are already a member of this group");
        }

        // Fetch group by name
        const groupQuery = await getDocumentsByField(
          "groups",
          "name",
          groupName
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        console.log(`Found ${groupQuery.length} groups with name ${groupName}`);

        // Find matching invite code
        const groupRole =
          groupQuery[0].inviteCodes.admin === joinCode
            ? "admin"
            : groupQuery[0].inviteCodes.member === joinCode
            ? "member"
            : groupQuery[0].inviteCodes.child === joinCode
            ? "child"
            : null;
        if (!groupRole) {
          throw new Error("Invalid join code");
        }

        const groupToJoin = groupQuery[0];
        console.log(
          "Joining group:",
          groupToJoin.groupId,
          "as role:",
          groupRole
        );
        const joinedAt = DateTime.now().toISO();

        // Get the userId of each member who has notifyFor.groupActivity = true
        const membersWhoWantNotified = groupToJoin.members
          .filter((m) => m.notifyFor?.groupActivity)
          .map((m) => m.userId);
        console.log("Members to notify of new joiner:", membersWhoWantNotified);

        // Update group document to add member
        const newMember = {
          userId: myUserId,
          username: myUsername,
          role: groupRole,
          joinedAt,
          active: true,
          notifyFor: {
            groupActivity: user.preferences?.notifyFor?.groupActivity ?? true,
            newTasks: user.preferences?.notifyFor?.newTasks ?? true,
            updatedTasks: user.preferences?.notifyFor?.updatedTasks ?? true,
            deletedTasks: user.preferences?.notifyFor?.deletedTasks ?? true,
            newNotes: user.preferences?.notifyFor?.newNotes ?? true,
            mentions: user.preferences?.notifyFor?.mentions ?? true,
            reminders: user.preferences?.notifyFor?.reminders ?? true,
            messages: user.preferences?.notifyFor?.messages ?? true,
            newEvents: user.preferences?.notifyFor?.newEvents ?? true,
            updatedEvents: user.preferences?.notifyFor?.updatedEvents ?? true,
            deletedEvents: user.preferences?.notifyFor?.deletedEvents ?? true,
          },
        };
        const updatedMembers = [...(groupToJoin.members || []), newMember];
        await updateDocument("groups", groupToJoin.groupId, {
          members: updatedMembers,
          updatedDate: joinedAt,
        });

        // Add group to user's groups array
        const groupRef = {
          groupId: groupToJoin.groupId,
          name: groupToJoin.name,
          role: groupRole,
          joinedAt,
        };
        const updatedGroups = [...(user.groups || []), groupRef];
        await updateDocument("users", authUser.uid, { groups: updatedGroups });

        // Compare the groups calendars to user's existing calendars (and add any missing)
        let newCalendars = [];
        if (groupToJoin.calendars && groupToJoin.calendars.length > 0) {
          const userCalendarIds = (user.calendars || []).map(
            (c) => c.calendarId
          );
          newCalendars = groupToJoin.calendars.filter(
            (c) => !userCalendarIds.includes(c.calendarId)
          );

          if (newCalendars.length > 0) {
            try {
              // Prepare user data update
              const updatedUserCalendars = [
                ...(user.calendars || []),
                ...newCalendars,
              ];

              // Prepare calendar updates (bulk operation)
              const calendarUpdates = newCalendars.map((calendar) => ({
                docId: calendar.calendarId,
                updateData: {
                  subscribingUsers: arrayUnion(myUserId),
                  updatedAt: DateTime.now().toISO(),
                },
              }));

              // Execute all updates concurrently
              await Promise.all([
                // Update user document
                updateDocument("users", authUser.uid, {
                  calendars: updatedUserCalendars,
                }),

                // Update all calendar documents
                ...calendarUpdates.map((update) =>
                  updateDocument("calendars", update.docId, update.updateData)
                ),
              ]);

              console.log(
                `Added ${newCalendars.length} new calendars from group to user and updated calendar subscriptions`
              );
            } catch (error) {
              console.error("Error updating calendars:", error);
              // Consider partial rollback if needed
              throw error;
            }
          }
        }

        // If there are members to notify, send them a message
        if (membersWhoWantNotified.length > 0) {
          const notificationMessage = `${myUsername} has joined the group ${groupToJoin.name}.`;

          // Send message to each member who wants to be notified
          await Promise.all(
            membersWhoWantNotified.map((memberId) =>
              addMessageToUser(
                memberId,
                {
                  userId: myUserId,
                  username: myUsername,
                  groupName: groupToJoin.name,
                  screenForNavigation: {
                    screen: "Groups",
                    params: { groupId: groupToJoin.groupId },
                  },
                },
                notificationMessage
              )
            )
          );

          console.log(
            `Sent join notification to ${membersWhoWantNotified.length} members`
          );
        }

        console.log("✅ Successfully joined group:", groupToJoin.groupId);
        return groupToJoin;
      } catch (error) {
        console.error("❌ Error joining group:", error);
        throw error;
      }
    },
    [authUser, myUserId, myUsername, user?.groups, user?.calendars]
  );

  const leaveGroup = useCallback(
    async (groupId, removedUserId, removingUserInfo) => {
      if (!groupId || !removedUserId || !removingUserInfo) {
        throw new Error("Missing parameters to leave group");
      }
      try {
        console.log("Leaving group:", groupId, "for user:", removedUserId);

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Check if user is a member of the group
        if (!group.members.some((m) => m.userId === removedUserId)) {
          throw new Error("You are not a member of this group");
        }

        // Find the removing user's role and the removed user's info
        const removingUser = group.members.find(
          (m) => m.userId === removingUserInfo.userId
        );
        const removedUser = group.members.find(
          (m) => m.userId === removedUserId
        );

        if (!removingUser) {
          throw new Error("Removing user is not a member of this group");
        }

        const isRemovingSelf = removedUserId === removingUserInfo.userId;
        const isCreator = removedUser?.groupCreator === true;
        const removingUserRole = removingUser.role;

        // ✅ PERMISSION CHECKS
        if (!isRemovingSelf) {
          // Someone else is trying to remove a user

          // Only admins can remove other users
          if (removingUserRole !== "admin") {
            throw new Error(
              "Only admins can remove other members from the group"
            );
          }

          // Cannot remove the group creator
          if (isCreator) {
            throw new Error(
              "The group creator cannot be removed from the group"
            );
          }
        } else {
          // User is trying to leave themselves

          // Group creator cannot leave the group
          if (isCreator) {
            throw new Error(
              "Group creator cannot leave the group. Transfer ownership first or delete the group."
            );
          }

          // Child users cannot remove themselves
          if (removingUserRole === "child") {
            throw new Error(
              "Child users cannot leave the group. Ask an admin to remove you."
            );
          }
        }

        // Update the group document to change active to false, add a removedAt and IF removedUserId is NOT the same as removeingUserInfo.userId add a removedBy
        const updatedMembers = group.members.map((member) => {
          if (member.userId === removedUserId) {
            const updatedMember = {
              ...member,
              active: false,
              removedAt: DateTime.now().toISO(),
            };
            if (removedUserId !== removingUserInfo.userId) {
              updatedMember.removedBy = {
                userId: removingUserInfo.userId,
                username: removingUserInfo.username,
              };
            }
            return updatedMember;
          }
          return member;
        });
        console.log(
          "About to update doc for group Id:",
          group.groupId,
          "and Updated Members:",
          updatedMembers
        );
        try {
          await updateDocument("groups", group.groupId, {
            members: updatedMembers,
            updatedDate: DateTime.now().toISO(),
          });
          console.log("✅ Group document updated successfully");
        } catch (error) {
          console.error("❌ Failed to update group document:", error);
          throw error;
        }

        // In the users document, add to the group inactive: true AND if was removed by someone else, removedBy and removedAt
        const updatedGroups = (user.groups || []).map((g) => {
          if (g.groupId === groupId) {
            const baseUpdate = {
              ...g,
              active: false,
              removedAt: DateTime.now().toISO(),
            };

            // Only add removedBy if someone else removed the user
            if (removedUserId !== removingUserInfo.userId) {
              baseUpdate.removedBy = {
                userId: removingUserInfo.userId,
                username: removingUserInfo.username,
              };
            }

            return baseUpdate;
          }
          return g;
        });
        console.log(
          "About to update user doc for user Id:",
          authUser.uid,
          "and Updated Groups:",
          updatedGroups
        );
        try {
          await updateDocument("users", authUser.uid, {
            groups: updatedGroups,
          });
          console.log("✅ User document updated successfully");
        } catch (error) {
          console.error("❌ Failed to update user document:", error);
          throw error;
        }
        // From the group gather members who have notifyFor.groupActivity = true and are not the removedUserId and are still active
        const membersWhoWantNotified = group.members
          .filter(
            (m) =>
              m.notifyFor?.groupActivity &&
              m.userId !== removedUserId &&
              m.active
          )
          .map((m) => m.userId);
        console.log(
          "Members to notify of member leaving:",
          membersWhoWantNotified
        );

        // If there are members to notify, send them a message
        if (membersWhoWantNotified.length > 0) {
          const notificationMessage =
            removedUserId === removingUserInfo.userId
              ? `${removingUserInfo.username} has left the group ${group.name}.`
              : `${removingUserInfo.username} has removed ${
                  removedUser?.username || "a member"
                } from the group ${group.name}.`;

          // Send message to each member who wants to be notified
          await Promise.all(
            membersWhoWantNotified.map((memberId) =>
              addMessageToUser(
                memberId,
                {
                  userId: myUserId,
                  username: myUsername,
                  groupName: group.name,
                  screenForNavigation: {
                    screen: "Groups",
                    params: { groupId: groupId },
                  },
                },
                notificationMessage
              )
            )
          );

          console.log(
            `Sent leave notification to ${membersWhoWantNotified.length} members`
          );
        }

        // If the user is being removed by someone else AND the user has notifyFor.groupActivity = true, send them a message
        if (
          removedUserId !== removingUserInfo.userId &&
          removedUser?.notifyFor?.groupActivity
        ) {
          const personalNotificationMessage = `${removingUserInfo.username} has removed you from the group ${group.name}.`;
          await addMessageToUser(
            removedUserId,
            {
              userId: myUserId,
              username: myUsername,
              groupName: group.name,
              screenForNavigation: {
                screen: "Groups",
                params: { groupId: groupId },
              },
            },
            personalNotificationMessage
          );
          console.log(
            `Sent personal removal notification to user ${removedUserId}`
          );
        }

        console.log("✅ Successfully left group:", groupId);
      } catch (error) {
        console.error("❌ Error leaving group:", error);
        throw error;
      }
    },
    [authUser, user?.groups]
  );

  const rejoinGroup = useCallback(
    async (groupId, userIdToAdd, addedBy) => {
      try {
        console.log(
          "Rejoining group:",
          groupId,
          "for user:",
          userIdToAdd,
          "added by:",
          addedBy
        );

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!userIdToAdd || !addedBy) {
          throw new Error("User profile data missing");
        }

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Check if user is already an active member of the group
        if (group.members?.some((m) => m.userId === userIdToAdd && m.active)) {
          throw new Error("User is already an active member of this group");
        }

        // Make sure the user is an inactive member of the group
        const existingMember = group.members.find(
          (m) => m.userId === userIdToAdd
        );
        if (!existingMember) {
          throw new Error("User is not a member of this group");
        }
        if (existingMember.active) {
          throw new Error("User is already an active member of this group");
        }

        // Find the adding user's info
        const addingUser = group.members.find(
          (m) => m.userId === addedBy.userId
        );
        if (!addingUser) {
          throw new Error("Adding user is not a member of this group");
        }

        const isAddingSelf = userIdToAdd === addedBy.userId;
        const wasRemovedBySomeoneElse = !!existingMember.removedBy;
        const addingUserRole = addingUser.role;

        // Check if adding user has permission (different rules for self vs others)
        // if (!isAddingSelf) {
        //   throw new Error("Adding user is not an active member of this group");
        // }

        // ✅ PERMISSION CHECKS
        if (isAddingSelf) {
          // User is trying to rejoin themselves

          // If they were removed by someone else, they cannot rejoin themselves
          if (wasRemovedBySomeoneElse) {
            throw new Error(
              `You were removed from this group by ${existingMember.removedBy.username}. Contact an admin to rejoin.`
            );
          }

          // Members and admins can rejoin if they removed themselves
          if (addingUserRole === "child") {
            throw new Error(
              "Child users cannot rejoin groups. Contact an admin to be re-added."
            );
          }
        } else {
          // Someone else is trying to add a user back

          // Only admins can add other users back
          if (addingUserRole !== "admin") {
            throw new Error(
              "Only admins can add other members back to the group"
            );
          }
        }

        // Update group document to set active to true, remove removedAt and removedBy
        const updatedMembers = group.members.map((member) => {
          if (member.userId === userIdToAdd) {
            const { removedAt, removedBy, ...memberWithoutRemovedFields } =
              member;
            return {
              ...memberWithoutRemovedFields,
              active: true,
              rejoinedAt: DateTime.now().toISO(),
              ...(isAddingSelf
                ? {}
                : {
                    addedBackBy: {
                      userId: addedBy.userId,
                      username: addedBy.username,
                      addedAt: DateTime.now().toISO(),
                    },
                  }),
            };
          }
          return member;
        });
        await updateDocument("groups", group.groupId, {
          members: updatedMembers,
          updatedDate: DateTime.now().toISO(),
        });

        // Fetch the rejoining user's document to update their calendars
        const userQuery = await getDocumentsByField(
          "users",
          "userId",
          userIdToAdd
        );
        if (userQuery.length === 0) {
          throw new Error(`User document not found for userId: ${userIdToAdd}`);
        }
        const userDoc = userQuery[0];

        // Check which group calendars the user doesn't have yet
        const userCalendarIds = new Set(
          (userDoc.calendars || []).map((c) => c.calendarId)
        );
        const calendarsToAdd = (group.calendars || []).filter(
          (c) => !userCalendarIds.has(c.calendarId)
        );

        let updatedUserCalendars = userDoc.calendars || [];

        // Add missing group calendars to user's calendar list
        if (calendarsToAdd.length > 0) {
          updatedUserCalendars = [...updatedUserCalendars, ...calendarsToAdd];
          console.log(
            `✅ Adding ${calendarsToAdd.length} group calendar(s) to rejoining user ${userIdToAdd}`
          );
        }

        // Update user's groups and calendars
        const updatedGroups = (userDoc.groups || []).map((g) => {
          if (g.groupId === groupId) {
            // Remove the unwanted fields using destructuring
            const { removedAt, removedBy, ...groupWithoutRemovedFields } = g;

            const baseUpdate = {
              ...groupWithoutRemovedFields,
              active: true,
              rejoinedAt: DateTime.now().toISO(),
            };

            // Only add addedBackBy if someone else is adding them back
            if (!isAddingSelf) {
              baseUpdate.addedBackBy = {
                userId: addedBy.userId,
                username: addedBy.username,
                addedAt: DateTime.now().toISO(),
              };
            }

            return baseUpdate;
          }
          return g;
        });

        await updateDocument("users", authUser.uid, {
          groups: updatedGroups,
          calendars: updatedUserCalendars,
        });

        // Add the user as a subscriber to each calendar they're getting
        if (calendarsToAdd.length > 0) {
          const calendarSubscriptionResults = await Promise.allSettled(
            calendarsToAdd.map((calendar) =>
              addUserToCalendar(calendar.calendarId, userIdToAdd)
            )
          );

          const successfulSubscriptions = calendarSubscriptionResults.filter(
            (result) => result.status === "fulfilled"
          ).length;

          console.log(
            `✅ Successfully subscribed user ${userIdToAdd} to ${successfulSubscriptions} calendar(s)`
          );

          // Log any failures for debugging
          const failedSubscriptions = calendarSubscriptionResults.filter(
            (result) => result.status === "rejected"
          );
          if (failedSubscriptions.length > 0) {
            console.warn(
              `⚠️ Failed to subscribe user ${userIdToAdd} to ${failedSubscriptions.length} calendar(s)`
            );
            failedSubscriptions.forEach((result, index) => {
              console.error(
                `Calendar subscription error for ${calendarsToAdd[index].calendarId}:`,
                result.reason
              );
            });
          }
        }

        // Update all other members who have notifyFor.groupActivity = true and are active (excluding the rejoining user) that the user has rejoined
        const membersWhoWantNotified = group.members
          .filter(
            (m) =>
              m.notifyFor?.groupActivity && m.userId !== userIdToAdd && m.active
          )
          .map((m) => m.userId);
        console.log(
          "Members to notify of member rejoining:",
          membersWhoWantNotified
        );

        // If there are members to notify, send them a message
        if (membersWhoWantNotified.length > 0) {
          const notificationMessage = isAddingSelf
            ? `${existingMember.username} has rejoined the group ${group.name}.`
            : `${addedBy.username} has added ${existingMember.username} back to the group ${group.name}.`;

          // Send message to each member who wants to be notified
          await Promise.allSettled(
            membersWhoWantNotified.map((memberId) =>
              addMessageToUser(
                memberId,
                {
                  userId: myUserId,
                  username: myUsername,
                  groupName: group.name,
                  screenForNavigation: {
                    screen: "Groups",
                    params: { groupId: groupId },
                  },
                },
                notificationMessage
              )
            )
          );

          console.log(
            `Sent rejoin notification to ${membersWhoWantNotified.length} members`
          );
        }

        // If someone else added the user back AND the user has notifyFor.groupActivity = true, send them a personal message
        if (!isAddingSelf && existingMember?.notifyFor?.groupActivity) {
          const personalNotificationMessage = `${addedBy.username} has added you back to the group ${group.name}.`;
          await addMessageToUser(
            userIdToAdd,
            {
              userId: myUserId,
              username: myUsername,
              groupName: group.name,
              screenForNavigation: {
                screen: "Groups",
                params: { groupId: groupId },
              },
            },
            personalNotificationMessage
          );
          console.log(
            `Sent personal rejoin notification to user ${userIdToAdd}`
          );
        }

        console.log("✅ Successfully rejoined group:", groupId);
        return group;
      } catch (error) {
        console.error("❌ Error rejoining group:", error);
        throw error;
      }
    },
    [authUser, user?.groups, addUserToCalendar]
  );

  const updateGroupRole = useCallback(
    async (groupId, targetUserId, newRole, actingUserInfo) => {
      try {
        console.log(
          `Updating role for user ${targetUserId} in group ${groupId} to ${newRole} by ${actingUserInfo.userId}`
        );

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!targetUserId || !actingUserInfo) {
          throw new Error("User profile data missing");
        }
        if (!["admin", "member", "child"].includes(newRole)) {
          throw new Error("Invalid role specified");
        }

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Check if target user is a member of the group
        const targetMember = group.members.find(
          (m) => m.userId === targetUserId
        );
        if (!targetMember) {
          throw new Error("Target user is not a member of this group");
        }
        if (!targetMember.active) {
          throw new Error("Cannot change role of an inactive member");
        }

        // Find the acting user's info
        const actingMember = group.members.find(
          (m) => m.userId === actingUserInfo.userId
        );
        if (!actingMember || !actingMember.active) {
          throw new Error("Acting user is not an active member of this group");
        }

        const isTargetCreator = targetMember.groupCreator === true;
        const actingUserRole = actingMember.role;

        // ✅ SIMPLE PERMISSION CHECKS

        // Only admins can change roles
        if (actingUserRole !== "admin") {
          throw new Error("Only admins can change member roles");
        }

        // Cannot change the group creator's role
        if (isTargetCreator) {
          throw new Error("Cannot change the role of the group creator");
        }

        // Check if role is actually changing
        if (targetMember.role === newRole) {
          throw new Error(`User is already a ${newRole}`);
        }

        // Update group document to change the member's role
        const updatedMembers = group.members.map((member) => {
          if (member.userId === targetUserId) {
            return {
              ...member,
              role: newRole,
              roleUpdatedAt: DateTime.now().toISO(),
              roleUpdatedBy: {
                userId: actingUserInfo.userId,
                username: actingUserInfo.username,
              },
            };
          }
          return member;
        });
        await updateDocument("groups", group.groupId, {
          members: updatedMembers,
          updatedDate: DateTime.now().toISO(),
        });

        // In the users document, update the group role
        const updatedGroups = (user.groups || []).map((g) =>
          g.groupId === groupId
            ? {
                ...g,
                role: newRole,
                roleUpdatedAt: DateTime.now().toISO(),
              }
            : g
        );
        await updateDocument("users", authUser.uid, { groups: updatedGroups });

        // ✅ FIXED NOTIFICATION LOGIC - Maximum 2 notifications
        const notifications = [];

        // 1. Notify the creator if they're NOT the one making the change and have notifications on
        const creator = group.members.find(
          (m) => m.groupCreator === true && m.active
        );
        if (
          creator &&
          creator.userId !== actingUserInfo.userId &&
          creator.notifyFor?.groupActivity
        ) {
          const creatorNotificationMessage = `${actingUserInfo.username} has changed ${targetMember.username}'s role in the group ${group.name} to ${newRole}.`;

          notifications.push(
            addMessageToUser(
              creator.userId,
              {
                userId: myUserId,
                username: myUsername,
                groupName: group.name,
                screenForNavigation: {
                  screen: "Groups",
                  params: { groupId: groupId },
                },
              },
              creatorNotificationMessage
            )
          );
        }

        // 2. Notify the target user if they have notifications enabled and aren't the acting user
        if (
          targetMember.notifyFor?.groupActivity &&
          targetUserId !== actingUserInfo.userId
        ) {
          const personalNotificationMessage = `${actingUserInfo.username} has changed your role in the group ${group.name} to ${newRole}.`;

          notifications.push(
            addMessageToUser(
              targetUserId,
              {
                userId: myUserId,
                username: myUsername,
                groupName: group.name,
                screenForNavigation: {
                  screen: "Groups",
                  params: { groupId: groupId },
                },
              },
              personalNotificationMessage
            )
          );
        }

        // Send all notifications
        if (notifications.length > 0) {
          await Promise.all(notifications);
          console.log(
            `Sent ${notifications.length} role change notification(s) (max 2)`
          );
        }

        console.log("✅ Successfully updated group role");
        return group;
      } catch (error) {
        console.error("❌ Error updating group role:", error);
        throw error;
      }
    },
    [authUser, user?.groups]
  );

  const deleteGroup = useCallback(
    async (groupId, deletingUserInfo) => {
      try {
        console.log("Deleting group:", groupId, "by user:", deletingUserInfo);

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!deletingUserInfo) {
          throw new Error("User profile data missing");
        }

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Check if deleting user is the creator of the group
        const deletingMember = group.members.find(
          (m) => m.userId === deletingUserInfo.userId
        );
        if (deletingMember.groupCreator !== true) {
          throw new Error("Only the group creator can delete the group");
        }

        if (!deletingMember || !deletingMember.active) {
          throw new Error("You are not an active member of this group");
        }

        // Get all userIds of group members before deletion
        const allMemberIds = group.members.map((m) => m.userId);
        console.log(
          `Preparing to remove group ${groupId} from ${allMemberIds.length} user documents`
        );

        // Gather all active members who have notifyFor.groupActivity = true and are not the deleting user
        const membersWhoWantNotified = group.members
          .filter(
            (m) =>
              m.notifyFor?.groupActivity &&
              m.userId !== deletingUserInfo.userId &&
              m.active
          )
          .map((m) => m.userId);
        console.log(
          "Members to notify of group deletion:",
          membersWhoWantNotified
        );

        // ✅ STEP 1: Remove the group from all members' user documents FIRST (atomic operation)
        const userUpdateErrors = [];
        const userUpdateResults = await Promise.allSettled(
          allMemberIds.map(async (memberId) => {
            try {
              // Fetch user document
              const userQuery = await getDocumentsByField(
                "users",
                "userId",
                memberId
              );
              if (userQuery.length === 0) {
                throw new Error(
                  `User document not found for userId: ${memberId}`
                );
              }
              const userDoc = userQuery[0];

              // Update groups array to remove the deleted group
              const updatedGroups = (userDoc.groups || []).filter(
                (g) => g.groupId !== groupId
              );

              await updateDocument("users", memberId, {
                groups: updatedGroups,
              });
              console.log(
                `✅ Successfully removed group ${groupId} from user ${memberId}`
              );
              return { success: true, userId: memberId };
            } catch (error) {
              const errorDetail = `Failed to update user ${memberId}: ${error.message}`;
              console.error(errorDetail);
              userUpdateErrors.push(errorDetail);
              throw error;
            }
          })
        );

        // Check if any user updates failed
        const failedUserUpdates = userUpdateResults.filter(
          (result) => result.status === "rejected"
        );
        if (failedUserUpdates.length > 0) {
          const errorMessage = `Failed to update ${
            failedUserUpdates.length
          } user document(s). Errors: ${userUpdateErrors.join("; ")}`;
          console.error("❌ User document update failures:", errorMessage);
          throw new Error(
            `Cannot delete group - user document updates failed: ${errorMessage}`
          );
        }

        console.log(
          `✅ Successfully removed group from all ${allMemberIds.length} user documents`
        );

        // ✅ STEP 2: Delete the group and task documents
        try {
          // Delete the group document
          await deleteDocument("groups", group.groupId);
          console.log(
            `✅ Successfully deleted group document ${group.groupId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to delete group document ${group.groupId}:`,
            error
          );
          throw new Error(`Failed to delete group document: ${error.message}`);
        }

        try {
          // Delete the task document
          await deleteDocument("tasks", group.groupId);
          console.log(`✅ Successfully deleted task document ${group.groupId}`);
        } catch (error) {
          console.error(
            `❌ Failed to delete task document ${group.groupId}:`,
            error
          );
          // Note: We don't throw here since the task document might not exist
          console.warn(
            "Task document deletion failed, but continuing with group deletion"
          );
        }

        // ✅ STEP 3: Send notifications
        if (membersWhoWantNotified.length > 0) {
          const notificationMessage = `The group ${group.name} has been deleted by ${deletingUserInfo.username}.`;

          try {
            // Send message to each member who wants to be notified
            const notificationResults = await Promise.allSettled(
              membersWhoWantNotified.map((memberId) =>
                addMessageToUser(
                  memberId,
                  {
                    userId: myUserId,
                    username: myUsername,
                    groupName: group.name,
                    screenForNavigation: {
                      screen: "Groups",
                      params: { groupId: groupId },
                    },
                  },
                  notificationMessage
                )
              )
            );

            const failedNotifications = notificationResults.filter(
              (result) => result.status === "rejected"
            );
            if (failedNotifications.length > 0) {
              console.warn(
                `⚠️ Failed to send ${failedNotifications.length} notification(s), but group deletion completed successfully`
              );
            } else {
              console.log(
                `✅ Successfully sent group deletion notification to ${membersWhoWantNotified.length} members`
              );
            }
          } catch (error) {
            console.error(
              "❌ Error sending notifications (group deletion still successful):",
              error
            );
            // Don't throw - notifications failing shouldn't fail the whole operation
          }
        }

        console.log("✅ Successfully completed group deletion:", groupId);
        return {
          success: true,
          deletedGroupId: groupId,
          groupName: group.name,
        };
      } catch (error) {
        console.error("❌ Error deleting group:", error);
        throw error;
      }
    },
    [authUser, myUserId, myUsername, user?.groups]
  );

  const removeCalendarFromGroup = useCallback(
    async (groupId, calendarsToRemove) => {
      try {
        console.log(
          `Removing calendars from group ${groupId}:`,
          calendarsToRemove.map((c) => c.calendarId)
        );

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (
          !Array.isArray(calendarsToRemove) ||
          calendarsToRemove.length === 0
        ) {
          throw new Error("No calendars provided to remove");
        }
        // Validate that each calendar object has calendarId and name
        calendarsToRemove.forEach((cal) => {
          if (!cal.calendarId || !cal.name) {
            throw new Error(
              `Calendar ID and name are required for calendar: ${JSON.stringify(
                cal
              )}`
            );
          }
        });

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Check if all calendars are part of the group
        const calendarIdsToRemove = new Set(
          calendarsToRemove.map((c) => c.calendarId)
        );
        const invalidCalendars = calendarsToRemove.filter(
          (c) => !group.calendars?.some((gc) => gc.calendarId === c.calendarId)
        );
        if (invalidCalendars.length > 0) {
          throw new Error(
            `Some calendars are not part of this group: ${invalidCalendars
              .map((c) => c.calendarId)
              .join(", ")}`
          );
        }

        // Make sure the remover is an active admin of the group
        const remover = group.members.find(
          (m) => m.userId === authUser.uid && m.active
        );
        if (!remover) {
          throw new Error("You are not an active member of this group");
        }
        if (remover.role !== "admin") {
          throw new Error("Only admins can remove calendars from the group");
        }

        // STEP 1: Update group document to remove the calendars
        const updatedCalendars = group.calendars.filter(
          (c) => !calendarIdsToRemove.has(c.calendarId)
        );

        try {
          await updateDocument("groups", group.groupId, {
            calendars: updatedCalendars,
            updatedDate: DateTime.now().toISO(),
          });
          console.log(
            `✅ Successfully removed ${calendarsToRemove.length} calendar(s) from group ${groupId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to update group document ${group.groupId}:`,
            error
          );
          throw new Error(
            `Failed to remove calendars from group: ${error.message}`
          );
        }

        // STEP 2: Remove tasks linked to the removed calendars
        try {
          const taskQuery = await getDocumentsByField(
            "tasks",
            "taskId",
            group.groupId
          );

          if (taskQuery.length > 0) {
            const taskDoc = taskQuery[0];
            const originalTasksCount = taskDoc.tasks?.length || 0;
            const updatedTasks = (taskDoc.tasks || []).filter(
              (a) => !calendarIdsToRemove.has(a.calendarId)
            );

            const removedTasksCount = originalTasksCount - updatedTasks.length;

            await updateDocument("tasks", taskDoc.docId, {
              tasks: updatedTasks,
              updatedAt: DateTime.now().toISO(),
            });

            console.log(
              `✅ Removed ${removedTasksCount} tasks linked to calendars ${[
                ...calendarIdsToRemove,
              ].join(", ")}`
            );
          } else {
            console.log(
              "No task document found for this group, skipping task cleanup"
            );
          }
        } catch (error) {
          console.error(`❌ Failed to update tasks for calendars:`, error);
          console.warn(
            "Calendar removal from group succeeded, but task cleanup failed"
          );
        }

        // STEP 3: Send notifications (non-critical)
        const membersWhoWantNotified = group.members
          .filter(
            (m) =>
              m.notifyFor?.groupActivity &&
              m.userId !== authUser.uid &&
              m.active
          )
          .map((m) => m.userId);

        console.log(
          "Members to notify of calendar removal:",
          membersWhoWantNotified
        );

        if (membersWhoWantNotified.length > 0) {
          try {
            const notificationResults = await Promise.allSettled(
              membersWhoWantNotified.map(async (memberId) => {
                const calendarNames = calendarsToRemove
                  .map((c) => c.name)
                  .join(", ");
                const notificationMessage = `The following calendar(s) have been removed from the group ${group.name} by ${remover.username}: ${calendarNames}.`;

                return addMessageToUser(
                  memberId,
                  {
                    userId: myUserId,
                    username: myUsername,
                    groupName: group.name,
                    screenForNavigation: {
                      screen: "Groups",
                      params: { groupId: groupId },
                    },
                  },
                  notificationMessage
                );
              })
            );

            const failedNotifications = notificationResults.filter(
              (result) => result.status === "rejected"
            );
            if (failedNotifications.length > 0) {
              console.warn(
                `⚠️ Failed to send ${failedNotifications.length} notification(s), but calendar removal completed successfully`
              );
            } else {
              console.log(
                `✅ Successfully sent calendar removal notification to ${membersWhoWantNotified.length} members`
              );
            }
          } catch (error) {
            console.error(
              "❌ Error sending notifications (calendar removal still successful):",
              error
            );
          }
        }

        console.log(
          `✅ Successfully completed calendar removal from group ${groupId}: ${calendarsToRemove
            .map((c) => c.calendarId)
            .join(", ")}`
        );
        return {
          success: true,
          groupId,
          removedCalendars: calendarsToRemove.map((c) => ({
            calendarId: c.calendarId,
            name: c.name,
          })),
          removedBy: remover.username,
        };
      } catch (error) {
        console.error("❌ Error removing calendars from group:", error);
        throw error;
      }
    },
    [authUser, myUserId, myUsername, user?.groups]
  );

  const addCalendarsToGroup = useCallback(
    async (groupId, calendarsToAdd) => {
      try {
        console.log(
          `Adding calendars to group ${groupId}:`,
          calendarsToAdd.map((c) => c.calendarId)
        );

        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!Array.isArray(calendarsToAdd) || calendarsToAdd.length === 0) {
          throw new Error("No calendars provided to add");
        }

        // Fetch group document
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );
        if (groupQuery.length === 0) {
          throw new Error("Group not found");
        }
        const group = groupQuery[0];

        // Make sure the adder is an active admin of the group
        const adder = group.members.find(
          (m) => m.userId === authUser.uid && m.active
        );
        if (!adder) {
          throw new Error("You are not an active member of this group");
        }
        if (adder.role !== "admin") {
          throw new Error("Only admins can add calendars to the group");
        }

        // Filter out any calendars that are already in the group
        const existingCalendarIds = new Set(
          group.calendars.map((c) => c.calendarId)
        );
        const newCalendars = calendarsToAdd.filter(
          (c) => !existingCalendarIds.has(c.calendarId)
        );

        if (newCalendars.length === 0) {
          throw new Error("All provided calendars are already in the group");
        }

        // Update group document to add the new calendars
        const updatedCalendars = [...group.calendars, ...newCalendars];

        try {
          await updateDocument("groups", group.groupId, {
            calendars: updatedCalendars,
            updatedDate: DateTime.now().toISO(),
          });
          console.log(
            `✅ Successfully added ${newCalendars.length} calendar(s) to group ${groupId}`
          );
        } catch (error) {
          console.error(
            `❌ Failed to update group document ${group.groupId}:`,
            error
          );
          throw new Error(`Failed to add calendars to group: ${error.message}`);
        }

        // Track which calendars each user gets added to (for personalized notifications)
        const userCalendarAdditions = new Map(); // userId -> array of calendar objects they got

        // Make sure the calendar is added to each user's calendar list (if its not there already)
        const userUpdateResults = await Promise.allSettled(
          group.members.map(async (member) => {
            try {
              // Fetch user document
              const userQuery = await getDocumentsByField(
                "users",
                "userId",
                member.userId
              );
              if (userQuery.length === 0) {
                throw new Error(
                  `User document not found for userId: ${member.userId}`
                );
              }
              const userDoc = userQuery[0];

              // Check if any of the new calendars are already in the user's calendar list
              const userCalendarIds = new Set(
                (userDoc.calendars || []).map((c) => c.calendarId)
              );
              const calendarsToActuallyAdd = newCalendars.filter(
                (c) => !userCalendarIds.has(c.calendarId)
              );

              if (calendarsToActuallyAdd.length === 0) {
                console.log(
                  `No new calendars to add for user ${member.userId}`
                );
                return {
                  success: true,
                  userId: member.userId,
                  added: false,
                  calendarsAdded: [],
                };
              }

              // Add the new calendars to the user's calendar list
              const updatedUserCalendars = [
                ...(userDoc.calendars || []),
                ...calendarsToActuallyAdd,
              ];

              await updateDocument("users", member.userId, {
                calendars: updatedUserCalendars,
              });
              console.log(
                `✅ Successfully added ${calendarsToActuallyAdd.length} calendar(s) to user ${member.userId}`
              );

              // Track which calendars this user got for notifications
              userCalendarAdditions.set(member.userId, calendarsToActuallyAdd);

              return {
                success: true,
                userId: member.userId,
                added: true,
                calendarsAdded: calendarsToActuallyAdd,
              };
            } catch (error) {
              const errorDetail = `Failed to update user ${member.userId}: ${error.message}`;
              console.error(errorDetail);
              throw error;
            }
          })
        );

        const usersWhoGotNewCalendars = userUpdateResults
          .filter(
            (result) => result.status === "fulfilled" && result.value.added
          )
          .map((result) => result.value.userId);

        console.log(
          `✅ Calendars added to ${usersWhoGotNewCalendars.length} user(s)`
        );

        // Add users to calendar subscribers using the utility function
        const calendarUpdateResults = await Promise.allSettled(
          newCalendars.map(async (calendar) => {
            try {
              // Get users who actually got this calendar added
              const usersToAddAsSubscribers = usersWhoGotNewCalendars;

              if (usersToAddAsSubscribers.length === 0) {
                console.log(
                  `No new subscribers to add for calendar ${calendar.calendarId}`
                );
                return {
                  success: true,
                  calendarId: calendar.calendarId,
                  added: false,
                };
              }

              // Add each user to the calendar using the utility function
              const userAddResults = await Promise.allSettled(
                usersToAddAsSubscribers.map((userId) =>
                  addUserToCalendar(calendar.calendarId, userId)
                )
              );

              const successfulAdds = userAddResults.filter(
                (result) => result.status === "fulfilled"
              ).length;
              console.log(
                `✅ Successfully added ${successfulAdds} subscriber(s) to calendar ${calendar.calendarId}`
              );

              return {
                success: true,
                calendarId: calendar.calendarId,
                added: true,
                count: successfulAdds,
              };
            } catch (error) {
              console.error(
                `❌ Failed to update calendar ${calendar.calendarId}:`,
                error
              );
              throw error;
            }
          })
        );

        const successfulCalendarUpdates = calendarUpdateResults.filter(
          (result) => result.status === "fulfilled" && result.value.added
        ).length;

        console.log(
          `✅ Updated subscribers for ${successfulCalendarUpdates} calendar(s)`
        );

        // Send personalized notifications to members who want them
        const membersWhoWantNotified = group.members.filter(
          (m) =>
            m.notifyFor?.groupActivity &&
            m.userId !== adder.userId &&
            m.active &&
            userCalendarAdditions.has(m.userId) // Only notify users who actually got new calendars
        );

        console.log(
          "Members to notify of calendar addition:",
          membersWhoWantNotified.map((m) => m.userId)
        );

        if (membersWhoWantNotified.length > 0) {
          try {
            const notificationResults = await Promise.allSettled(
              membersWhoWantNotified.map(async (member) => {
                // Get the specific calendars this user received
                const userSpecificCalendars = userCalendarAdditions.get(
                  member.userId
                );
                const calendarNames = userSpecificCalendars
                  .map((c) => c.name)
                  .join(", ");

                const notificationMessage = `The following calendar(s) have been added to the group ${group.name} by ${adder.username}: ${calendarNames}.`;

                return addMessageToUser(
                  member.userId,
                  {
                    userId: myUserId,
                    username: myUsername,
                    groupName: group.name,
                    screenForNavigation: {
                      screen: "Groups",
                      params: { groupId: groupId },
                    },
                  },
                  notificationMessage
                );
              })
            );

            const failedNotifications = notificationResults.filter(
              (result) => result.status === "rejected"
            );
            if (failedNotifications.length > 0) {
              console.warn(
                `⚠️ Failed to send ${failedNotifications.length} notification(s), but calendar addition completed successfully`
              );
            } else {
              console.log(
                `✅ Successfully sent calendar addition notification to ${membersWhoWantNotified.length} members`
              );
            }
          } catch (error) {
            console.error(
              "❌ Error sending notifications (calendar addition still successful):",
              error
            );
            // Don't throw - notifications failing shouldn't fail the whole operation
          }
        }

        console.log(
          `✅ Successfully completed calendar addition to group ${groupId}`
        );
        return {
          success: true,
          groupId,
          addedCalendars: newCalendars.map((c) => ({
            calendarId: c.calendarId,
            name: c.name,
          })),
          addedBy: adder.username,
          usersNotifiedCount: membersWhoWantNotified.length,
        };
      } catch (error) {
        console.error("❌ Error adding calendars to group:", error);
        throw error;
      }
    },
    [authUser, myUserId, myUsername, user?.groups, addUserToCalendar]
  );

  const inviteUsersToGroup = useCallback(
    async (groupId, invites, invitingUserInfo) => {
      try {
        if (!authUser?.uid) {
          throw new Error("User not authenticated");
        }
        if (!Array.isArray(invites) || invites.length === 0) {
          throw new Error("No invites provided");
        }
        if (!invitingUserInfo) {
          throw new Error("Inviting user profile data missing");
        }

        console.log(
          `Inviting users to group ${groupId}:`,
          invites.map((i) => i.email)
        );

        let nonExistentEmails = [];
        let processedInvites = [];

        // Go through EACH invite separately
        for (const invite of invites) {
          const email = invite.email.trim().toLowerCase();

          // Fetch user document by email
          const userQuery = await getDocumentsByField("users", "email", email);

          if (userQuery.length === 0) {
            // User doesn't exist - add entire invite info to nonExistentEmails
            nonExistentEmails.push(invite);
          } else {
            // User exists - get their full document
            const userDoc = userQuery[0];

            // Check if the user is already in the group
            const groupQuery = await getDocumentsByField(
              "groups",
              "groupId",
              groupId
            );
            if (groupQuery.length === 0) {
              throw new Error("Group not found");
            }
            const group = groupQuery[0];
            const alreadyMember = group.members.some(
              (m) => m.userId === userDoc.userId && m.active
            );
            if (alreadyMember) {
              console.log(
                `User ${userDoc.userId} is already an active member of group ${groupId}, skipping invite`
              );
              continue;
            }

            // Add the invite to their groupInvites array
            const currentGroupInvites = userDoc.groupInvites || [];
            const newInvite = {
              groupId: invite.groupId,
              groupName: invite.groupName,
              inviteCode: invite.inviteCode,
              role: invite.role,
              inviterUserId: invitingUserInfo.userId,
              inviterName: invite.inviterName,
              invitedAt: DateTime.now().toISO(),
              status: "pending",
            };

            const updatedGroupInvites = [...currentGroupInvites, newInvite];

            // Update the user's document with the new invite
            await updateDocument("users", userDoc.userId, {
              groupInvites: updatedGroupInvites,
            });

            // Check if they want notifications for group activity
            if (userDoc.preferences?.notifyFor?.groupActivity === true) {
              const messageText = `${invite.inviterName} has invited you to join their group, ${invite.groupName}`;

              const sendingUserInfo = {
                userId: invitingUserInfo.userId,
                username: invite.inviterName,
                groupName: invite.groupName,
                screenForNavigation: {
                  screen: "Groups",
                },
              };

              await addMessageToUser(
                userDoc.userId,
                sendingUserInfo,
                messageText
              );
            }

            // Add to our tracking array
            processedInvites.push(invite);
          }
        }

        console.log("Non-existent emails:", nonExistentEmails);
        console.log("Processed invites:", processedInvites);

        // For each member in nonExistentEmails, need to go to the doc in admin collection
        // that has type: storedInvites and add ALL the nonExistenEmails objects to the invites array
        if (nonExistentEmails.length > 0) {
          console.log("Checking for existing admin storedInvites document...");
          const adminQuery = await getDocumentsByField(
            "admin",
            "type",
            "storedInvites"
          );
          console.log("Admin query result:", adminQuery);
          console.log("Admin query length:", adminQuery.length);
          let adminDoc;
          if (adminQuery.length === 0) {
            // No admin doc exists yet - create one
            const newAdminDoc = {
              type: "storedInvites",
              invites: nonExistentEmails,
              createdAt: DateTime.now().toISO(),
              updatedAt: DateTime.now().toISO(),
            };
            const docId = await addDocument("admin", newAdminDoc);
            adminDoc = { ...newAdminDoc, docId };
            console.log("Created new admin storedInvites document:", docId);
          } else {
            // Admin doc exists - update it
            adminDoc = adminQuery[0];
            const updatedInvites = [
              ...(adminDoc.invites || []),
              ...nonExistentEmails,
            ];
            await updateDocument("admin", adminDoc.id, {
              invites: updatedInvites,
              updatedAt: DateTime.now().toISO(),
            });
            console.log(
              `Updated admin storedInvites document ${adminDoc.id} with ${nonExistentEmails.length} new invite(s)`
            );
          }
        }

        // Create summary object
        const summary = {
          invitedUsers: processedInvites.length,
          storedEmails: nonExistentEmails.length,
          totalProcessed: processedInvites.length + nonExistentEmails.length,
        };

        console.log(
          `✅ Successfully processed invites. ${summary.invitedUsers} user(s) invited, ${summary.storedEmails} email(s) stored for future.`
        );

        if (summary.totalProcessed === 0) {
          throw new Error(
            "No valid invites to process. All users may already be members."
          );
        }

        return summary;
      } catch (error) {
        console.error("❌ Error inviting users to group:", error);
        throw error;
      }
    },
    [authUser, user?.groups]
  );

  return {
    createGroup,
    joinGroup,
    leaveGroup,
    rejoinGroup,
    updateGroupRole,
    deleteGroup,
    removeCalendarFromGroup,
    addCalendarsToGroup,
    inviteUsersToGroup,
  };
};
