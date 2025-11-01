import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { useTaskActions } from "../hooks";

// Global ref to store the main scroll view
let globalScrollViewRef = null;

export const setGlobalScrollRef = (ref) => {
  globalScrollViewRef = ref;
};

const NotesComponent = ({
  notes = [],
  isEventPast,
  assignmentId, // This might be taskId in your new structure
  docId,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
    const { updateTask } = useTaskActions();
  const addNoteContainerRef = useRef(null);

  const [localNotes, setLocalNotes] = useState(notes);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Update local notes when props change
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // ALL FUNCTION DEFINITIONS FIRST
  function amITheAuthor(note) {
    return note.author === user?.username || note.authorId === user?.userId;
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const scrollToAddNote = () => {
    console.log('scrollToAddNote called');
    console.log('globalScrollViewRef:', !!globalScrollViewRef);
    console.log('addNoteContainerRef.current:', !!addNoteContainerRef.current);
    
    if (globalScrollViewRef && addNoteContainerRef.current) {
      addNoteContainerRef.current.measureInWindow((x, y, width, height) => {
        console.log('Measuring add note container at:', y);
        const targetY = Math.max(0, y - 100);
        console.log('Scrolling to target Y:', targetY);
        
        try {
          globalScrollViewRef.scrollTo({ 
            y: targetY,
            animated: true 
          });
          console.log('Scroll command executed successfully');
        } catch (error) {
          console.error('Error scrolling:', error);
        }
      });
    } else {
      console.log('Global scroll ref not available or container ref missing');
      console.log('Available refs:', {
        globalScrollViewRef: !!globalScrollViewRef,
        addNoteContainerRef: !!addNoteContainerRef.current
      });
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || isUpdating) return;

    setIsUpdating(true);

    try {
      const newNote = {
        author: user?.username || "Unknown",
        authorId: user?.userId,
        note: newNoteText.trim(),
        createdAt: new Date().toISOString(),
      };

      const updatedNotes = [...localNotes, newNote];
      
      // Update the task in the database
      const result = await updateTask(docId, assignmentId, {
        notes: updatedNotes
      }, user?.userId);

      if (result.success) {
        setLocalNotes(updatedNotes);
        
        setNewNoteText("");
        setIsAddingNote(false);
        
        console.log('✅ Successfully added note');
      } else {
        throw new Error(result.error || 'Failed to add note');
      }
    } catch (error) {
      console.error("Error adding note:", error);
      Alert.alert("Error", "Failed to add note. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditNote = async (noteIndex) => {
    if (!editText.trim() || isUpdating) return;

    setIsUpdating(true);

    try {
      const updatedNotes = localNotes.map((note, index) =>
        index === noteIndex
          ? {
              ...note,
              note: editText.trim(),
              createdAt: new Date().toISOString(), // Updated timestamp
            }
          : note
      );

      // Update the task in the database
      const result = await updateTask(docId, assignmentId, {
        notes: updatedNotes
      }, user?.userId);

      if (result.success) {
        setLocalNotes(updatedNotes);
        setEditingNoteId(null);
        setEditText("");
        
        console.log('✅ Successfully edited note');
      } else {
        throw new Error(result.error || 'Failed to edit note');
      }
    } catch (error) {
      console.error("Error editing note:", error);
      Alert.alert("Error", "Failed to update note. Please try again.");
      setEditingNoteId(null);
      setEditText("");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteNote = (noteIndex) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDeleteNote(noteIndex),
      },
    ]);
  };

  const confirmDeleteNote = async (noteIndex) => {
    if (isUpdating) return;

    setIsUpdating(true);

    try {
      const updatedNotes = localNotes.filter((_, index) => index !== noteIndex);
      
      // Update the task in the database
      const result = await updateTask(docId, assignmentId, {
        notes: updatedNotes
      }, user?.userId);

      if (result.success) {
        setLocalNotes(updatedNotes);
        console.log('✅ Successfully deleted note');
      } else {
        throw new Error(result.error || 'Failed to delete note');
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      Alert.alert("Error", "Failed to delete note. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const startEditing = (note, index) => {
    setEditingNoteId(index);
    setEditText(note.note);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const handleAddNotePress = () => {
    setIsAddingNote(true);
    // Delay to ensure the input is rendered, then measure and scroll
    setTimeout(() => {
      scrollToAddNote();
    }, 150);
  };

  const renderAddNoteSection = () => {
    if (isEventPast) return null;

    if (isAddingNote) {
      return (
        <View 
          ref={addNoteContainerRef}
          style={styles.addNoteContainer}
        >
          <TextInput
            value={newNoteText}
            onChangeText={setNewNoteText}
            placeholder="Add a note..."
            placeholderTextColor={theme.text.tertiary}
            maxLength={500}
            multiline
            style={[styles.textInput, { marginBottom: getSpacing.sm }]}
            autoFocus
            editable={!isUpdating}
          />
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, isUpdating && styles.disabledButton]}
              onPress={() => {
                setIsAddingNote(false);
                setNewNoteText("");
              }}
              disabled={isUpdating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!newNoteText.trim() || isUpdating) && styles.disabledButton,
              ]}
              onPress={handleAddNote}
              disabled={!newNoteText.trim() || isUpdating}
            >
              <Text style={styles.saveButtonText}>
                {isUpdating ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.addButton, isUpdating && styles.disabledButton]}
        onPress={handleAddNotePress}
        disabled={isUpdating}
      >
        <Ionicons name="add" size={20} color={theme.primary} />
        <Text style={styles.addButtonText}>Add Note</Text>
      </TouchableOpacity>
    );
  };

  // STYLES DEFINITION
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.surface,
      borderRadius: 8,
      marginTop: getSpacing.sm,
      overflow: "hidden",
    },
    content: {
      padding: getSpacing.md,
    },
    title: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    noteItem: {
      marginBottom: getSpacing.sm,
      paddingBottom: getSpacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    noteText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      lineHeight: 20,
      marginBottom: getSpacing.xs,
    },
    noteFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    noteAuthor: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
      flex: 1,
    },
    noteActions: {
      flexDirection: "row",
      gap: getSpacing.sm,
    },
    actionButton: {
      padding: getSpacing.xs,
    },
    editContainer: {
      marginTop: getSpacing.xs,
    },
    actionButtons: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: getSpacing.sm,
    },
    cancelButton: {
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.surface,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cancelButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      fontWeight: "600",
    },
    saveButton: {
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.primary,
      borderRadius: 6,
    },
    saveButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.inverse,
      fontWeight: "600",
    },
    disabledButton: {
      opacity: 0.5,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: getSpacing.sm,
      backgroundColor: theme.primary + "15",
      borderRadius: 6,
      marginTop: getSpacing.sm,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      marginLeft: getSpacing.xs,
      fontWeight: "600",
    },
    addNoteContainer: {
      marginTop: getSpacing.sm,
      padding: getSpacing.sm,
      backgroundColor: theme.background,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    textInput: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 6,
      padding: getSpacing.md,
      minHeight: 80,
      textAlignVertical: 'top',
    },
  });

  // EARLY RETURNS AFTER ALL DEFINITIONS
  if (!localNotes || localNotes.length === 0) {
    // Show just the add button if no notes and event isn't past
    if (!isEventPast) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Notes (0)</Text>
            {renderAddNoteSection()}
          </View>
        </View>
      );
    }
    return null;
  }

  // MAIN RETURN
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Notes ({localNotes.length})</Text>

        {localNotes.map((note, index) => (
          <View
            key={index}
            style={[
              styles.noteItem,
              {
                borderBottomWidth:
                  index === localNotes.length - 1 && !isEventPast ? 0 : 1,
              },
            ]}
          >
            {editingNoteId === index ? (
              // Edit mode
              <View style={styles.editContainer}>
                <TextInput
                  value={editText}
                  onChangeText={setEditText}
                  placeholder="Edit note..."
                  placeholderTextColor={theme.text.tertiary}
                  maxLength={500}
                  multiline
                  style={[styles.textInput, { marginBottom: getSpacing.sm }]}
                  autoFocus
                  editable={!isUpdating}
                />
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.cancelButton,
                      isUpdating && styles.disabledButton,
                    ]}
                    onPress={cancelEditing}
                    disabled={isUpdating}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!editText.trim() || isUpdating) && styles.disabledButton,
                    ]}
                    onPress={() => handleEditNote(index)}
                    disabled={!editText.trim() || isUpdating}
                  >
                    <Text style={styles.saveButtonText}>
                      {isUpdating ? "Saving..." : "Save"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // Display mode
              <>
                <Text style={styles.noteText}>{note.note}</Text>
                <View style={styles.noteFooter}>
                  <Text style={styles.noteAuthor}>
                    {note.author} - {formatDate(note.createdAt || note.timestamp)}
                  </Text>

                  {amITheAuthor(note) && !isEventPast && (
                    <View style={styles.noteActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isUpdating && styles.disabledButton,
                        ]}
                        onPress={() => startEditing(note, index)}
                        disabled={isUpdating}
                      >
                        <Ionicons
                          name="pencil"
                          size={16}
                          color={theme.text.secondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          isUpdating && styles.disabledButton,
                        ]}
                        onPress={() => handleDeleteNote(index)}
                        disabled={isUpdating}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color={theme.error}
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        ))}

        {/* Add note section at bottom */}
        {renderAddNoteSection()}
      </View>
    </View>
  );
};

export default NotesComponent;