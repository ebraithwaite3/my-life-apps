import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme } from "@my-apps/contexts";
import { SimpleDateTimeSelector } from "@my-apps/ui";
import { DateTime } from "luxon";

function getDefaultEditDate() {
  const plusHour = DateTime.now().plus({ hours: 1 });
  const roundedMinute = Math.round(plusHour.minute / 15) * 15;
  if (roundedMinute >= 60) {
    return plusHour
      .plus({ hours: 1 })
      .set({ minute: 0, second: 0, millisecond: 0 })
      .toJSDate();
  }
  return plusHour
    .set({ minute: roundedMinute, second: 0, millisecond: 0 })
    .toJSDate();
}

function getNextOccurrence(recurringSchedule) {
  const { daysOfWeek, time, timezone } = recurringSchedule;
  const tz = timezone || "America/New_York";
  const now = DateTime.now().setZone(tz);
  const [hour, minute] = time.split(":").map(Number);

  let candidate = now.set({ hour, minute, second: 0, millisecond: 0 });
  if (candidate <= now) candidate = candidate.plus({ days: 1 });

  let iterations = 0;
  while (
    !daysOfWeek.includes(
      candidate.toFormat("EEE").toUpperCase().slice(0, 2)
    ) &&
    ++iterations <= 14
  ) {
    candidate = candidate.plus({ days: 1 });
  }

  return candidate;
}

function formatNextOccurrence(dt) {
  const now = DateTime.now().setZone(dt.zoneName);
  const timeStr = dt.toFormat("h:mm a");
  if (dt.hasSame(now, "day")) return `This will skip your ${timeStr} reminder today`;
  if (dt.hasSame(now.plus({ days: 1 }), "day")) return `This will skip your ${timeStr} reminder tomorrow`;
  return `This will skip your ${timeStr} reminder on ${dt.toFormat("EEEE")}`;
}

const AlertModal = ({ alert, onYes, onNo, onButtonTap, onEditSubmit }) => {
  const { theme } = useTheme();

  const visibleButtons = useMemo(() => {
    if (!Array.isArray(alert?.buttons)) return [];
    if (alert.mode === "morning") {
      return alert.buttons.filter((btn) => btn.onComplete !== "set_mode_morning");
    }
    return alert.buttons;
  }, [alert?.buttons, alert?.mode]);

  const hasButtons = visibleButtons.length > 0;

  const [editMode, setEditMode] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(null);

  // Reset edit mode when alert changes
  useEffect(() => {
    setEditMode(false);
    setSelectedDateTime(null);
  }, [alert?.id]);

  const isPastTime = selectedDateTime
    ? DateTime.fromJSDate(selectedDateTime) <= DateTime.now()
    : false;

  const conflictWarning = useMemo(() => {
    if (!editMode || !selectedDateTime || !alert?.recurringSchedule) return null;
    const nextOcc = getNextOccurrence(alert.recurringSchedule);
    const selected = DateTime.fromJSDate(selectedDateTime);
    return selected > nextOcc ? formatNextOccurrence(nextOcc) : null;
  }, [editMode, selectedDateTime, alert?.recurringSchedule]);

  const handleButtonPress = (btn) => {
    if (btn.action === "edit" || btn.action === "remind_me_again") {
      setSelectedDateTime(getDefaultEditDate());
      setEditMode(true);
      return;
    }
    onButtonTap(btn);
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedDateTime(null);
  };

  const handleSubmit = () => {
    if (isPastTime || !selectedDateTime) return;
    onEditSubmit(selectedDateTime.toISOString());
    setEditMode(false);
    setSelectedDateTime(null);
  };

  return (
    <Modal
      visible={!!alert}
      transparent
      animationType="fade"
      onRequestClose={editMode ? handleCancel : onNo}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.surface || "#fff" }]}>
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.title, { color: theme.text?.primary || "#111" }]}>
              {alert?.title}
            </Text>
            <Text style={[styles.body, { color: theme.text?.secondary || "#444" }]}>
              {alert?.message}
            </Text>

            {editMode ? (
              <>
                <SimpleDateTimeSelector
                  label="Remind me at"
                  selectedDate={selectedDateTime}
                  onDateChange={setSelectedDateTime}
                />

                {conflictWarning && (
                  <Text style={[styles.warningText, { color: theme.error || "#F44336" }]}>
                    {conflictWarning}
                  </Text>
                )}

                {isPastTime && (
                  <Text style={[styles.hintText, { color: theme.text?.tertiary || "#999" }]}>
                    Please select a future time
                  </Text>
                )}

                <View style={[styles.simpleRow, { marginTop: 16 }]}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.outlineButton,
                      { borderColor: theme.border || "#ccc" },
                    ]}
                    onPress={handleCancel}
                  >
                    <Text style={[styles.buttonText, { color: theme.text?.primary || "#111" }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      {
                        backgroundColor: isPastTime
                          ? theme.border || "#ccc"
                          : theme.primary || "#2196F3",
                      },
                    ]}
                    onPress={handleSubmit}
                    disabled={isPastTime}
                  >
                    <Text style={styles.buttonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : hasButtons ? (
              <View style={styles.buttonList}>
                {visibleButtons.map((btn, index) => (
                  <TouchableOpacity
                    key={btn.id}
                    style={[
                      styles.stackedButton,
                      index === 0
                        ? { backgroundColor: theme.primary || "#2196F3" }
                        : [styles.outlineButton, { borderColor: theme.border || "#ccc" }],
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        index !== 0 && { color: theme.text?.primary || "#111" },
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.simpleRow}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.error || "#F44336" }]}
                  onPress={onNo}
                >
                  <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: theme.primary || "#2196F3" }]}
                  onPress={onYes}
                >
                  <Text style={styles.buttonText}>Yes</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonList: {
    gap: 10,
  },
  simpleRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  stackedButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  warningText: {
    fontSize: 13,
    marginTop: 8,
    marginHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    marginTop: 8,
    marginHorizontal: 4,
  },
});

export default AlertModal;
