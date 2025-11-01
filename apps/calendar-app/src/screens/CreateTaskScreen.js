import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  Alert
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import * as Crypto from "expo-crypto";
import EventHeader from "../components/EventHeader";
import GroupSelector from "../components/GroupSelector";
import VisibilitySelector from "../components/VisibilitySelector";
import AttendanceForm from "../components/tasks/AttendanceForm";
import TransportForm from "../components/tasks/TransportForm";
import ListForm from "../components/tasks/ListForm";
import { useTaskActions } from "../hooks";
import { Ionicons } from "@expo/vector-icons";

const CreateTaskScreen = ({ route, navigation }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user, calendars, groups, tasks } = useData();
    const { addTask } = useTaskActions();
  const { eventId, calendarId } = route.params || {
    eventId: null,
    calendarId: null,
  };
  console.log(
    "CreateTaskScreen received eventId:",
    eventId,
    "and calendarId:",
    calendarId
  );

  const taskTypes = ["Attendance", "Transport", "Checklist"];
  const [selectedTaskType, setSelectedTaskType] = useState(null);
  const [notes, setNotes] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [visibilityOption, setVisibilityOption] = useState("all");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [taskData, setTaskData] = useState({});
  const [errors, setErrors] = useState([]);
  console.log("ERRORS:", errors);

  console.log(
    "Create Task Screen States - selectedTaskType:",
    selectedTaskType,
    "notes:",
    notes,
    "selectedGroup:",
    selectedGroup,
    "visibilityOption:",
    visibilityOption,
    "selectedMembers:",
    selectedMembers
  );

  const scrollViewRef = useRef(null);
  const notesInputRef = useRef(null);

  const uuidv4 = () => Crypto.randomUUID();

  // Find the calendar that has the calendarId
  const event = useMemo(() => {
    if (!calendars || calendars.length === 0 || !calendarId || !eventId) {
      return null;
    }

    const calendar = calendars.find((cal) => cal.id === calendarId);
    if (!calendar || !calendar.events) {
      return null;
    }

    console.log("Found calendar for event:", calendar);
    const enhancedEvent = {
      ...calendar.events[eventId],
      eventId: eventId,
      calendarId: calendarId,
      calendarName: calendar.name,
      calendarColor: calendar.color,
    };
    console.log("Enhanced event data:", enhancedEvent);

    return enhancedEvent;
  }, [calendars, calendarId, eventId]);

  console.log("Found event:", event);

  // Find which groups this event belongs to (if any)
  const eventGroups = useMemo(() => {
    if (!groups || groups.length === 0 || !calendarId) return [];
    return groups.filter(
      (group) =>
        group.calendars &&
        group.calendars.some((cal) => cal.calendarId === calendarId)
    );
  }, [groups, calendarId]);

  console.log(
    "Event belongs to groups:",
    eventGroups,
    "Groups data:",
    groups,
    "CalendarId:",
    calendarId
  );

  // Create "Me" option as a personal group
  const meOption = useMemo(() => {
    if (!user?.userId) return null;
    return {
      groupId: "",  // <- Now empty string instead of prefixed ID
      groupName: "Me",
      isPersonal: true,
      userId: user.userId,  // <- Added this new field
      members: [{
        userId: user.userId,
        username: user.username,
      }]
    };
  }, [user]);

  // Format groups for GroupSelector component, including the "Me" option
  const userGroups = useMemo(() => {
    const groupOptions = eventGroups.map((group) => ({
      groupId: group.groupId,
      groupName: group.name,
      isPersonal: false,
      userId: "",  // <- No userId for regular groups
    }));

    // Always add "Me" option at the beginning if user exists
    if (meOption) {
      groupOptions.unshift({
        groupId: meOption.groupId,
        groupName: meOption.groupName,
        isPersonal: true,
        userId: meOption.userId,
      });
    }

    return groupOptions;
  }, [eventGroups, meOption]);

  // Get current group members for visibility selector
  const groupMembers = useMemo(() => {
    if (!selectedGroup) return [];
    
    // If "Me" option is selected, return just the current user
    if (selectedGroup.isPersonal && meOption) {
      return meOption.members;
    }
    
    // Otherwise, find the group from the groups data
    if (!groups) return [];
    const fullGroup = groups.find((g) => g.groupId === selectedGroup.groupId);
    return fullGroup?.members || [];
  }, [selectedGroup, groups, meOption]);

  // Get all member IDs for "all" visibility option
  const allMemberIds = useMemo(() => {
    if (!groupMembers) return [];
    return groupMembers.map((member) => member.userId);
  }, [groupMembers]);

  // useEffect if there's only 1 group option (including Me), set that as the selectedGroup
  useEffect(() => {
    if (userGroups.length === 1) {
      setSelectedGroup(userGroups[0]);
    }
  }, [userGroups]);

  // useEffect to set selectedMembers when allMemberIds changes and visibility is "all"
  useEffect(() => {
    if (visibilityOption === "all" && allMemberIds.length > 0) {
      setSelectedMembers(allMemberIds);
    }
  }, [allMemberIds, visibilityOption]);

  // Scroll to Notes TextInput when focused
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      if (notesInputRef.current && notesInputRef.current.isFocused()) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleGroupSelect = (group) => {
    const wasGroupChanged = selectedGroup?.groupId !== group.groupId;
    setSelectedGroup(group);
    if (wasGroupChanged) {
      setVisibilityOption("all");
    }
    console.log("Selected group:", group);
  };

  const handleVisibilityChange = (option) => {
    setVisibilityOption(option);
    if (option === "all") {
      setSelectedMembers(allMemberIds);
    } else if (option === "custom" && user?.userId) {
      setSelectedMembers([user.userId]);
    }
  };

  const handleMembersChange = (members) => {
    setSelectedMembers(members);
    if (
      members.length === allMemberIds.length &&
      allMemberIds.every((id) => members.includes(id))
    ) {
      setVisibilityOption("all");
    } else {
      setVisibilityOption("custom");
    }
  };

  // Sync selected members with task assignments
  useEffect(() => {
    if (selectedTaskType === "Transport" && visibilityOption === "custom") {
      const assignedIds = new Set();
      if (taskData.dropOff?.assignedToId) {
        assignedIds.add(taskData.dropOff.assignedToId);
      }
      if (taskData.pickUp?.assignedToId) {
        assignedIds.add(taskData.pickUp.assignedToId);
      }

      setSelectedMembers((prevSelectedMembers) => {
        const newMembers = new Set([...prevSelectedMembers, ...Array.from(assignedIds)]);
        return Array.from(newMembers);
      });
    }
  }, [selectedTaskType, taskData, visibilityOption]);

  const handleSubmit = async () => {
    // Check for errors from child components first
    if (errors.length > 0) {
      Alert.alert(
        "Cannot Create Task",
        "Please fix the following errors:\n\n" + errors.join("\n"),
        [{ text: "OK" }]
      );
      return;
    }

    // Basic form validation
    if (!selectedTaskType || !selectedGroup) {
      Alert.alert(
        "Incomplete Form",
        "Please select a task type and group before creating the task.",
        [{ text: "OK" }]
      );
      return;
    }

    // Clean up checklist items before submitting
    if (selectedTaskType === "Checklist") {
        const cleanedItems = (taskData.checklistData?.items || []).filter(item => item.text && item.text.trim() !== '');
        setTaskData(prev => ({
          ...prev,
          checklistData: {
            ...prev.checklistData,
            items: cleanedItems
          }
        }));
        taskData.checklistData = { ...taskData.checklistData, items: cleanedItems };
    }

    const taskId = uuidv4();
    const taskDataToSubmit = {
        title: event?.title || "Untitled Event",
      taskId,
      taskType: selectedTaskType,
      groupId: selectedGroup.groupId,
      groupName: selectedGroup.groupName,
      isPersonalTask: selectedGroup.isPersonal, // Add flag for personal tasks
      userId: selectedGroup.userId,
      notes: notes !== "" ? [{
        note: notes,
        author: user?.username,
        authorId: user?.userId,
        createdAt: new Date().toISOString(),
      }] : [],
      visibilityOption,
      selectedMembers,
        eventId,
        calendarId,
        startTime: event?.startTime || null,
        ...taskData,
    };

    console.log("Submit new task", taskDataToSubmit);

    try {
        await addTask(taskDataToSubmit, user?.userId);

        // On successful submission
        Alert.alert(
            "Success",
            "Task successfully created!",
            [{ text: "OK", onPress: () => navigation.goBack() }]
        );
    } catch (error) {
        // On submission error
        console.error("Error adding task:", error);
        Alert.alert(
            "Submission Failed",
            "There was an error creating the task. Please try again.",
            [{ text: "OK" }]
        );
    }
  };

  const handleCancel = () => {
    setSelectedTaskType(null);
    setNotes("");
    setSelectedGroup(null);
    setVisibilityOption("all");
    setSelectedMembers([]);
    setTaskData({});
    setErrors([]);
    navigation.goBack();
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: getSpacing.md,
      paddingTop: getSpacing.lg,
      paddingBottom: getSpacing.xl * 2, // Increased bottom padding for keyboard
    },
    header: {
      marginBottom: getSpacing.lg,
    },
    title: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    taskTypeSection: {
      marginBottom: getSpacing.lg,
    },
    sectionTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: getTypography.h4.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    taskTypeScrollView: {
      marginBottom: getSpacing.sm,
    },
    taskTypeOption: {
      padding: getSpacing.md,
      backgroundColor: theme.button.secondary,
      borderRadius: 8,
      marginRight: getSpacing.md,
      minWidth: 100,
      alignItems: "center",
    },
    taskTypeOptionSelected: {
      backgroundColor: theme.primary,
    },
    taskTypeOptionText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "500",
    },
    taskTypeOptionTextSelected: {
      color: theme.text.inverse,
    },
    notesSection: {
      marginBottom: getSpacing.lg,
    },
    notesInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      minHeight: 80,
      textAlignVertical: "top",
    },
    formSection: {
      marginBottom: getSpacing.lg,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: getSpacing.xl,
      paddingBottom: getSpacing.xl,
    },
    button: {
      flex: 1,
      padding: getSpacing.md,
      borderRadius: 8,
      alignItems: "center",
      marginHorizontal: getSpacing.xs,
    },
    cancelButton: {
      backgroundColor: theme.button.secondary,
    },
    submitButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
    },
    cancelButtonText: {
      color: theme.button.secondaryText,
    },
    submitButtonText: {
      color: theme.text.inverse,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: getSpacing.md,
      gap: getSpacing.sm, // Add space between icon and text
    },
    backButtonText: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
  <Ionicons
    name="arrow-back"
    size={28}
    color={theme.text.primary}
  />
  <Text style={styles.backButtonText}>Back</Text>
</TouchableOpacity>

          {/* Event Header */}
          <EventHeader event={event} hideDetails={true} />

          <View style={styles.header}>
            <Text style={styles.title}>Create New Task</Text>
          </View>

          {/* Task Type Selection */}
          <View style={styles.taskTypeSection}>
            <Text style={styles.sectionTitle}>Select Task Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.taskTypeScrollView}
            >
              {taskTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setSelectedTaskType(type)}
                  style={[
                    styles.taskTypeOption,
                    selectedTaskType === type && styles.taskTypeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.taskTypeOptionText,
                      selectedTaskType === type && styles.taskTypeOptionTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Group Selection - Only show if task type is selected */}
          {selectedTaskType && (
            <GroupSelector
              userGroups={userGroups}
              selectedGroup={selectedGroup}
              onGroupSelect={handleGroupSelect}
              sectionTitle="Select Group or Personal Task"
            />
          )}

          {/* Task-Specific Forms - Show after task type and group are selected */}
          {selectedTaskType && selectedGroup && (
            <View style={styles.formSection}>
              {selectedTaskType === "Attendance" && (
                <AttendanceForm
                  taskData={taskData}
                  setTaskData={setTaskData}
                  selectedGroup={selectedGroup}
                  setErrors={setErrors}
                />
              )}
              {selectedTaskType === "Transport" && (
                <TransportForm
                  taskData={taskData}
                  setTaskData={setTaskData}
                  selectedGroup={selectedGroup}
                  setErrors={setErrors}
                />
              )}
              {selectedTaskType === "Checklist" && (
                <ListForm
                  taskData={taskData}
                  setTaskData={setTaskData}
                  selectedGroup={selectedGroup}
                  setErrors={setErrors}
                />
              )}
            </View>
          )}

          {/* Visibility Selection - Only show if task type and group are selected and it's not a personal task */}
          {selectedTaskType && selectedGroup && !selectedGroup.isPersonal && (
            <VisibilitySelector
              visibilityOption={visibilityOption}
              onVisibilityChange={handleVisibilityChange}
              taskData={taskData}
              selectedTaskType={selectedTaskType}
              selectedMembers={selectedMembers}
              onMembersChange={handleMembersChange}
              groupMembers={groupMembers}
              currentUserId={user?.userId}
              sectionTitle="Who Can See This Task"
            />
          )}

          {/* Notes Section - Only show if task type and group are selected */}
          {selectedTaskType && selectedGroup && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
              <TextInput
                ref={notesInputRef}
                style={styles.notesInput}
                placeholder="Add any additional notes or instructions..."
                placeholderTextColor={theme.text.tertiary}
                value={notes}
                onChangeText={setNotes}
                multiline={true}
                maxLength={500}
                returnKeyType="done"
                blurOnSubmit={true}
                textAlignVertical="top"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>
          )}

          {/* Action Buttons - Only show if task type and group are selected */}
          {selectedTaskType && selectedGroup && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={[styles.buttonText, styles.submitButtonText]}>
                  Create Task
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateTaskScreen;