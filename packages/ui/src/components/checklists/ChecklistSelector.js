import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@my-apps/contexts";
import { format24HourTimeString } from "@my-apps/utils";

const ChecklistSelector = ({
  label = "Checklist",
  selectedChecklist,
  savedChecklists = [],
  onPress,
  onClear,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const reminderTime = selectedChecklist?.defaultReminderTime ?
    format24HourTimeString(selectedChecklist.defaultReminderTime) :
    null;
  
  const isNotifyAdmin = selectedChecklist?.notifyAdmin === true;

  // --- NEW LOGIC: Only show the detail line if EITHER time or admin is set ---
  const showTimeOrAdminLine = reminderTime || isNotifyAdmin;
  // --------------------------------------------------------------------------


  const styles = StyleSheet.create({
    sectionHeader: {
      fontSize: getTypography.body.fontSize,
      fontWeight: "600",
      color: theme.text.primary,
      marginTop: getSpacing.lg,
      marginBottom: getSpacing.sm,
      marginHorizontal: getSpacing.lg,
    },
    formSection: {
      backgroundColor: theme.background,
      marginHorizontal: getSpacing.lg,
      borderRadius: getBorderRadius.md,
      overflow: "hidden",
    },
    formRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.lg,
      width: '100%', 
    },
    leftContent: { 
      flex: 1, 
      flexDirection: "row",
      alignItems: "center",
      marginRight: getSpacing.md,
    },
    formLabel: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      marginRight: getSpacing.sm,
    },
    checklistInfo: {
      flexGrow: 1, 
      flexShrink: 1,
      flexDirection: "column",
      maxWidth: "75%", 
      overflow: "hidden",
    },
    checklistName: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: "600",
      marginBottom: 2, 
    },
    itemCountText: {
        fontSize: getTypography.bodySmall.fontSize,
        color: theme.text.secondary,
        fontWeight: '500',
    },
    timeAdminLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2, 
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    // The admin block needs to be able to apply the border separator 
    // ONLY if the time block is also present.
    adminBlockContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adminBorder: {
        marginLeft: getSpacing.sm,
        paddingLeft: getSpacing.sm,
        borderLeftWidth: 1, // Vertical divider (the '|' look)
        borderLeftColor: theme.border, 
    },
    detailText: {
        fontSize: getTypography.bodySmall.fontSize,
        color: theme.text.secondary,
        marginLeft: 4, 
        fontWeight: '500',
    },
    detailIcon: {
        fontSize: getTypography.bodySmall.fontSize + 2, 
        color: theme.primary,
    },
    // --- Other styles remain the same ---
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: getSpacing.xs,
      paddingHorizontal: getSpacing.sm,
      backgroundColor: theme.primary + "15",
      borderRadius: getBorderRadius.sm,
      flexShrink: 0, 
    },
    addButtonText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.primary,
      fontWeight: "600",
      marginLeft: getSpacing.xs,
    },
    clearButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.sm, 
      flexShrink: 0, 
    },
  });

  return (
    <>
      <Text style={styles.sectionHeader}>{label}</Text>
      <View style={styles.formSection}>
        <View style={styles.formRow}>
          
          {/* 1. LEFT CONTENT: Info + Clear Button */}
          <View style={styles.leftContent}>
            {!selectedChecklist && (
              <Text style={styles.formLabel}>Add Checklist</Text>
            )}
            
            {selectedChecklist ? (
              <View style={styles.checklistInfo}> 
                {/* LINE 1: CHECKLIST NAME */}
                <Text
                  style={styles.checklistName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {selectedChecklist.name}
                </Text>
                
                {/* LINE 2: ITEM COUNT */}
                <Text style={styles.itemCountText}>
                    {selectedChecklist.items.length} items
                </Text>

                {/* LINE 3: TIME & ADMIN (Only if EITHER time OR admin is true) */}
                {showTimeOrAdminLine && (
                    <View style={styles.timeAdminLine}>
                        
                        {/* 3A. TIME BLOCK (Conditional) */}
                        {reminderTime && (
                            <View style={styles.timeBlock}>
                                <Ionicons
                                    name="time-outline"
                                    size={styles.detailIcon.fontSize}
                                    color={styles.detailIcon.color}
                                />
                                <Text style={styles.detailText}>
                                    {reminderTime}
                                </Text>
                            </View>
                        )}
                        
                        {/* 3B. ADMIN NOTIFICATION (Conditional) */}
                        {isNotifyAdmin && (
                            <View style={[
                                styles.adminBlockContainer, 
                                // Apply the border ONLY if the reminderTime block rendered before it
                                reminderTime ? styles.adminBorder : null
                            ]}>
                                <Ionicons
                                    name="notifications-outline" // Bell icon
                                    size={styles.detailIcon.fontSize}
                                    color={theme.accent || theme.primary}
                                />
                                <Text style={styles.detailText}>
                                    Admin
                                </Text>
                            </View>
                        )}
                    </View>
                )}
                {/* ----------------------------------------------- */}

              </View>
            ) : null}
            
            {/* Clear Button (Pushed to the far right of the details column) */}
            {selectedChecklist ? (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={onClear}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle" 
                  size={20}
                  color={theme.text.secondary}
                />
              </TouchableOpacity>
            ) : null}
            
          </View>
          
          {/* 2. RIGHT CONTENT: Action Button */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={onPress}
          >
            <Ionicons
              name={selectedChecklist ? "create-outline" : "add"}
              size={16}
              color={theme.primary}
            />
            <Text style={styles.addButtonText}>
              {selectedChecklist ? "Change" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

export default ChecklistSelector;