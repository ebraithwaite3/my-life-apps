// hooks/useTaskActions.js
import React, { useCallback } from "react";
import {
  createDocument,
  updateDocument,
  getDocument,
  getDocumentsByField,
} from "../services/firestoreService";
import { addMessageToUser } from "../services/messageService";
import { DateTime } from "luxon";

export const useTaskActions = () => {
  const createTaskDoc = useCallback(async (groupData, groupId, creatorInfo) => {
    const createdAt = DateTime.now().toISO();

    const taskData = {
      groupId,
      name: groupData.groupName || "",
      createdBy: creatorInfo,
      createdDate: createdAt,
      updatedDate: createdAt,
      tasks: [],
    };

    await createDocument("tasks", groupId, taskData);
    console.log("✅ Task document created for group:", groupId);

    return taskData;
  }, []);

  const createIndividualTaskDoc = useCallback(async (userId, username) => {
    const createdAt = DateTime.now().toISO();

    const taskData = {
      userId: userId,
      name: `${username}'s Tasks`,
      createdBy: { userId, username },
      createdDate: createdAt,
      updatedDate: createdAt,
      tasks: [],
    };

    await createDocument("tasks", userId, taskData);
    console.log("✅ Individual Task document created for user:", userId);

    return taskData;
  }, []);

  const addTask = useCallback(async (taskData, creatorUserId) => {
    console.log("Adding task:", taskData);
    const groupId = taskData.groupId;
    const userId = taskData.userId;
    console.log("Group ID for task:", groupId);

    if (groupId === "" && userId === "") {
      throw new Error("Either a Group ID or User ID is required to add a task.");
    }

    if (!taskData.taskId) {
      throw new Error("Task ID is required to add a task.");
    }

    if (!taskData.calendarId) {
      throw new Error("Calendar ID is required to add a task.");
    }

    if (!taskData.eventId) {
      throw new Error("Event ID is required to add a task.");
    }

    if (!creatorUserId) {
      throw new Error("Creator user ID is required to add a task.");
    }

    try {
      // Get the existing task document for this group
      const idToUse = userId === "" ? groupId : userId;
      const taskDoc = await getDocument("tasks", idToUse);

      if (!taskDoc) {
        throw new Error(`No task document found for group ID: ${idToUse}`);
      }

      // Check if a task with this ID already exists
      const existingTaskIndex = taskDoc.tasks.findIndex(
        (task) => task.taskId === taskData.taskId
      );

      if (existingTaskIndex !== -1) {
        console.log(
          "Task with ID",
          taskData.taskId,
          "already exists. Skipping addition."
        );
        return { success: false, message: "Task already exists" };
      }

      // Add the new task to the tasks array
      const updatedTasks = [...taskDoc.tasks, taskData];

      // Update the document with the new tasks array and updated timestamp
      const updatedDoc = {
        ...taskDoc,
        tasks: updatedTasks,
        updatedDate: DateTime.now().toISO(),
      };

      await updateDocument("tasks", idToUse, updatedDoc);

      console.log("✅ Task added successfully to group:", idToUse);

      // STEP 2: Send notifications to selected members who want newTasks notifications
      if (groupId !== "") {
      try {
        // Get the group document to access member notification preferences
        const groupQuery = await getDocumentsByField(
          "groups",
          "groupId",
          groupId
        );

        if (groupQuery.length === 0) {
          console.warn(
            "Group not found for notifications, skipping notifications"
          );
        } else {
          const group = groupQuery[0];

          // Find members who:
          // 1. Are in the selectedMembers array for this task
          // 2. Have notifyFor.newTasks = true
          // 3. Are not the creator of the task
          // 4. Are active members
          const membersToNotify = group.members.filter((member) => {
            return (
              taskData.selectedMembers?.includes(member.userId) && // Task is visible to them
              member.notifyFor?.newTasks === true && // They want newTask notifications
              member.userId !== creatorUserId && // Not the creator
              member.active === true // Active member
            );
          });

          console.log(
            "Members to notify of new task:",
            membersToNotify.map((m) => ({
              userId: m.userId,
              username: m.username,
            }))
          );

          if (membersToNotify.length > 0) {
            // Format the event date if available
            let eventDateText = "";
            if (taskData.startTime) {
              try {
                const eventDate = DateTime.fromISO(taskData.startTime);
                const day = eventDate.day;
                let suffix = "th";
                if (day === 1 || day === 21 || day === 31) {
                  suffix = "st";
                } else if (day === 2 || day === 22) {
                  suffix = "nd";
                } else if (day === 3 || day === 23) {
                  suffix = "rd";
                }

                eventDateText = ` on ${eventDate.toFormat(
                  "ccc, LLL d"
                )}${suffix}`;
              } catch (error) {
                console.warn("Error formatting event date:", error);
              }
            }
            // Create notification message
            const taskTypeText = taskData.selectedTaskType || "Task";
            const notificationMessage = `A new ${taskTypeText} task has been created for the event "${
              taskData.title || "Unknown Event"
            }" on ${eventDateText}, in group ${group.name}.`;

            // Send notifications to all relevant members
            const notificationResults = await Promise.allSettled(
              membersToNotify.map((member) =>
                addMessageToUser(
                  member.userId,
                  {
                    userId: creatorUserId,
                    username:
                      group.members.find((m) => m.userId === creatorUserId)
                        ?.username || "Unknown User",
                    groupName: group.name,
                    screenForNavigation: {
                      screen: "EventDetailsScreen", // Adjust based on your navigation structure
                      params: {
                        taskId: taskData.taskId,
                        groupId: groupId,
                        calendarId: taskData.calendarId,
                        eventId: taskData.eventId,
                      },
                    },
                  },
                  notificationMessage
                )
              )
            );

            const successfulNotifications = notificationResults.filter(
              (result) => result.status === "fulfilled"
            ).length;

            const failedNotifications = notificationResults.filter(
              (result) => result.status === "rejected"
            );

            console.log(
              `✅ Sent new task notification to ${successfulNotifications} member(s)`
            );

            if (failedNotifications.length > 0) {
              console.warn(
                `⚠️ Failed to send ${failedNotifications.length} notification(s)`
              );
              failedNotifications.forEach((result, index) => {
                console.error(
                  `Notification error for member ${membersToNotify[index]?.userId}:`,
                  result.reason
                );
              });
            }
          } else {
            console.log("No members to notify for new task");
          }
        }
      } catch (notificationError) {
        console.error(
          "Error sending new task notifications (task creation still successful):",
          notificationError
        );
        // Don't throw - notification failures shouldn't fail the task creation
      }
    }

      return { success: true, taskData };
    } catch (error) {
      console.error("Error adding task:", error);
      throw new Error(`Failed to add task: ${error.message}`);
    }
  }, []);

  const updateTask = useCallback(
    async (documentId, taskId, updates, updaterUserId) => {
      console.log("Updating task:", { documentId, taskId, updates });

      if (!documentId || !taskId || !updaterUserId) {
        throw new Error("Document ID, Task ID, and updater user ID are required.");
      }

      try {
        // Get the existing task document (could be group or personal)
        const taskDoc = await getDocument("tasks", documentId);

        if (!taskDoc) {
          throw new Error(`No task document found for document ID: ${documentId}`);
        }

        // Find the task to update
        const taskIndex = taskDoc.tasks.findIndex(
          (task) => task.taskId === taskId
        );

        if (taskIndex === -1) {
          throw new Error(
            `Task with ID ${taskId} not found in document ${documentId}`
          );
        }

        // Update the specific task with the provided updates
        const updatedTask = {
          ...taskDoc.tasks[taskIndex],
          ...updates,
          updatedAt: DateTime.now().toISO(),
        };

        // Replace the task in the tasks array
        const updatedTasks = [...taskDoc.tasks];
        updatedTasks[taskIndex] = updatedTask;

        // Update the document with the new tasks array and updated timestamp
        const updatedDoc = {
          ...taskDoc,
          tasks: updatedTasks,
          updatedDate: DateTime.now().toISO(),
        };

        await updateDocument("tasks", documentId, updatedDoc);

        console.log("✅ Task updated successfully:", taskId);
        return { success: true, taskData: updatedTask };
      } catch (error) {
        console.error("Error updating task:", error);
        throw new Error(`Failed to update task: ${error.message}`);
      }
    },
    []
  );

  const deleteTask = useCallback(async (documentId, taskId, deleterUserId) => {
    console.log("Deleting task:", { documentId, taskId });

    if (!documentId || !taskId || !deleterUserId) {
      throw new Error("Document ID, Task ID, and deleter user ID are required.");
    }

    try {
      // Get the existing task document (could be group or personal)
      const taskDoc = await getDocument("tasks", documentId);

      if (!taskDoc) {
        throw new Error(`No task document found for document ID: ${documentId}`);
      }

      // Find the task to delete
      const taskIndex = taskDoc.tasks.findIndex(
        (task) => task.taskId === taskId
      );

      if (taskIndex === -1) {
        throw new Error(`Task with ID ${taskId} not found in document ${documentId}`);
      }

      // Get the task data before deletion for notifications
      const taskToDelete = taskDoc.tasks[taskIndex];
      console.log("Task to be deleted:", taskToDelete);

      // Remove the task from the tasks array
      const updatedTasks = taskDoc.tasks.filter(
        (task) => task.taskId !== taskId
      );

      // Update the document with the new tasks array and updated timestamp
      const updatedDoc = {
        ...taskDoc,
        tasks: updatedTasks,
        updatedDate: DateTime.now().toISO(),
      };

      await updateDocument("tasks", documentId, updatedDoc);

      console.log("✅ Task deleted successfully:", taskId);

      // STEP 2: Send notifications (only for group tasks, skip for personal tasks)
      if (!taskToDelete.isPersonalTask && taskToDelete.groupId) {
        try {
          // Get the group document to access member notification preferences
          const groupQuery = await getDocumentsByField(
            "groups",
            "groupId",
            taskToDelete.groupId // Use the task's groupId, not documentId
          );

          if (groupQuery.length === 0) {
            console.warn(
              "Group not found for notifications, skipping notifications"
            );
          } else {
            const group = groupQuery[0];

            // Find members who:
            // 1. Were in the selectedMembers array for this task
            // 2. Have notifyFor.taskDeleted = true (or similar notification preference)
            // 3. Are not the deleter of the task
            // 4. Are active members
            const membersToNotify = group.members.filter((member) => {
              console.log("Checking member for notification:", member.userId, {
                isSelected: taskToDelete.selectedMembers?.includes(member.userId),
                wantsNotification: member.notifyFor?.updatedTasks === true,
                isNotDeleter: member.userId !== deleterUserId,
                isActive: member.active === true,
              });
              return (
                taskToDelete.selectedMembers?.includes(member.userId) && // Task was visible to them
                member.notifyFor?.updatedTasks === true && // They want task deletion notifications
                member.userId !== deleterUserId && // Not the deleter
                member.active === true // Active member
              );
            });

            console.log(
              "Members to notify of deleted task:",
              membersToNotify.map((m) => ({
                userId: m.userId,
                username: m.username,
              }))
            );

            if (membersToNotify.length > 0) {
              // Format the event date if available
              let eventDateText = "";
              if (taskToDelete.startTime) {
                try {
                  const eventDate = DateTime.fromISO(taskToDelete.startTime);
                  const day = eventDate.day;
                  let suffix = "th";
                  if (day === 1 || day === 21 || day === 31) {
                    suffix = "st";
                  } else if (day === 2 || day === 22) {
                    suffix = "nd";
                  } else if (day === 3 || day === 23) {
                    suffix = "rd";
                  }

                  eventDateText = ` on ${eventDate.toFormat(
                    "ccc, LLL d"
                  )}${suffix}`;
                } catch (error) {
                  console.warn("Error formatting event date:", error);
                }
              }

              // Create notification message
              const taskTypeText = taskToDelete.taskType || "Task";
              const notificationMessage = `A ${taskTypeText} task for the event "${
                taskToDelete.title || "Unknown Event"
              }"${eventDateText} has been deleted from group ${group.name}.`;

              // Send notifications to all relevant members
              const notificationResults = await Promise.allSettled(
                membersToNotify.map((member) =>
                  addMessageToUser(
                    member.userId,
                    {
                      userId: deleterUserId,
                      username:
                        group.members.find((m) => m.userId === deleterUserId)
                          ?.username || "Unknown User",
                      groupName: group.name,
                      screenForNavigation: {
                        screen: "GroupsHome", // Navigate back to group since task is deleted
                        params: {
                          groupId: taskToDelete.groupId,
                        },
                      },
                    },
                    notificationMessage
                  )
                )
              );

              const successfulNotifications = notificationResults.filter(
                (result) => result.status === "fulfilled"
              ).length;

              const failedNotifications = notificationResults.filter(
                (result) => result.status === "rejected"
              );

              console.log(
                `✅ Sent task deletion notification to ${successfulNotifications} member(s)`
              );

              if (failedNotifications.length > 0) {
                console.warn(
                  `⚠️ Failed to send ${failedNotifications.length} notification(s)`
                );
                failedNotifications.forEach((result, index) => {
                  console.error(
                    `Notification error for member ${membersToNotify[index]?.userId}:`,
                    result.reason
                  );
                });
              }
            } else {
              console.log("No members to notify for deleted task");
            }
          }
        } catch (notificationError) {
          console.error(
            "Error sending task deletion notifications (task deletion still successful):",
            notificationError
          );
          // Don't throw - notification failures shouldn't fail the task deletion
        }
      } else {
        console.log("Personal task deleted, no group notifications needed");
      }

      return { success: true, deletedTask: taskToDelete };
    } catch (error) {
      console.error("Error deleting task:", error);
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }, []);

  const shareChecklist = useCallback(async (checklist, selectedUserIds) => {
    console.log(
      "Sharing checklist:",
      checklist,
      "with users:",
      selectedUserIds
    );

    if (!checklist || !selectedUserIds || selectedUserIds.length === 0) {
      throw new Error("Checklist and selected user IDs are required.");
    }

    try {
      const results = [];

      // Process each user
      for (const userId of selectedUserIds) {
        try {
          console.log(`Processing checklist share for user: ${userId}`);

          // Get the user's current data
          const userDoc = await getDocument("users", userId);

          if (!userDoc) {
            console.warn(`User document not found for userId: ${userId}`);
            results.push({ userId, success: false, error: "User not found" });
            continue;
          }

          // Get current saved checklists (ensure it's an array)
          const currentChecklists = userDoc.savedChecklists || [];

          // Check if user can save more checklists (limit of 8)
          if (currentChecklists.length >= 8) {
            console.warn(`User ${userId} has reached checklist limit (8)`);
            results.push({
              userId,
              success: false,
              error: "User has reached maximum checklist limit (8)",
            });
            continue;
          }

          // Find a unique name for the checklist
          const originalName = checklist.name;
          let uniqueName = originalName;
          let counter = 1;

          // Keep checking until we find a name that doesn't exist
          while (
            currentChecklists.some(
              (cl) => cl.name.toLowerCase() === uniqueName.toLowerCase()
            )
          ) {
            uniqueName = `${originalName} (${counter})`;
            counter++;
          }

          console.log(
            `Original name: "${originalName}", Unique name: "${uniqueName}"`
          );

          // Create the new checklist object
          const newChecklist = {
            id: checklist.id, // Keep the same ID for reference
            name: uniqueName,
            items: [...checklist.items], // Copy items array
            createdAt: checklist.createdAt,
            updatedAt: DateTime.now().toISO(),
            sharedBy: checklist.sharedBy,
            accepted: false, // Mark as not accepted initially
          };

          // Add to user's saved checklists
          const updatedChecklists = [...currentChecklists, newChecklist];

          // Update the user document
          await updateDocument("users", userId, {
            savedChecklists: updatedChecklists,
          });

          console.log(`✅ Checklist shared successfully with user: ${userId}`);
          results.push({
            userId,
            success: true,
            checklistName: uniqueName,
          });

          // STEP 2: Send notification if user wants groupActivity notifications
          try {
            // Check if user has notifications enabled and wants groupActivity notifications
            const userPreferences = userDoc.preferences || {};
            const shouldNotify =
              userPreferences.notifications === true &&
              userPreferences.notifyFor?.groupActivity === true;

            if (shouldNotify) {
              console.log(
                `Sending checklist share notification to user: ${userId}`
              );

              const notificationMessage = `${checklist.sharedBy.username} has shared a new checklist with you.`;

              await addMessageToUser(
                userId,
                {
                  userId: checklist.sharedBy.userId,
                  username: checklist.sharedBy.username,
                  groupName: null, // Not group-specific
                  screenForNavigation: {
                    screen: "Preferences", // Navigate to preferences where checklists are managed
                    params: {
                      openChecklists: true, // Optional param to auto-open checklist section
                    },
                  },
                },
                notificationMessage
              );

              console.log(`✅ Notification sent to user: ${userId}`);
              results[results.length - 1].notificationSent = true;
            } else {
              console.log(
                `User ${userId} doesn't want groupActivity notifications, skipping notification`
              );
              results[results.length - 1].notificationSent = false;
            }
          } catch (notificationError) {
            console.error(
              `Error sending notification to user ${userId}:`,
              notificationError
            );
            results[results.length - 1].notificationError =
              notificationError.message;
            // Don't throw - notification failures shouldn't fail the sharing
          }
        } catch (userError) {
          console.error(
            `Error sharing checklist with user ${userId}:`,
            userError
          );
          results.push({
            userId,
            success: false,
            error: userError.message,
          });
        }
      }

      // Summary logging
      const successfulShares = results.filter((r) => r.success).length;
      const failedShares = results.filter((r) => !r.success).length;
      const notificationsSent = results.filter(
        (r) => r.notificationSent
      ).length;

      console.log(`✅ Checklist sharing complete:`);
      console.log(`  - Successful shares: ${successfulShares}`);
      console.log(`  - Failed shares: ${failedShares}`);
      console.log(`  - Notifications sent: ${notificationsSent}`);

      return {
        success: successfulShares > 0,
        results,
        summary: {
          total: selectedUserIds.length,
          successful: successfulShares,
          failed: failedShares,
          notificationsSent,
        },
      };
    } catch (error) {
      console.error("Error in shareChecklist:", error);
      throw new Error(`Failed to share checklist: ${error.message}`);
    }
  }, []);

  return {
    createTaskDoc,
    createIndividualTaskDoc,
    addTask,
    updateTask,
    deleteTask,
    shareChecklist,
  };
};
