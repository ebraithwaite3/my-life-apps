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

// ─── Helpers (new schema) ────────────────────────────────────────────────────

function roundUpToTenMinutes(date) {
  const TEN_MIN_MS = 10 * 60 * 1000;
  return new Date(
    Math.ceil((date.getTime() - 5 * 60 * 1000) / TEN_MIN_MS) * TEN_MIN_MS,
  );
}

function computeNextScheduledTime(reminder) {
  const { recurrence } = reminder;
  if (!recurrence) return null;

  const now = new Date();

  if (recurrence.scheduleByDay) {
    const candidates = recurrence.scheduleByDay.map(({ day, time, timezone }) => {
      const tz = timezone || "America/New_York";
      const nowInZone = DateTime.fromJSDate(now).setZone(tz);
      const [hour, minute] = time.split(":").map(Number);
      let candidate = nowInZone.set({ hour, minute, second: 0, millisecond: 0 });
      if (candidate <= nowInZone) candidate = candidate.plus({ days: 1 });
      let iterations = 0;
      while (
        candidate.toFormat("EEE").toUpperCase().slice(0, 2) !== day &&
        ++iterations <= 14
      ) {
        candidate = candidate.plus({ days: 1 });
      }
      return candidate;
    });
    const soonest = candidates.reduce((min, c) => (c < min ? c : min));
    return soonest.toISO();
  }

  if (recurrence.everyNDays) {
    const { n, time, timezone } = recurrence.everyNDays;
    const tz = timezone || "America/New_York";
    const [hour, minute] = time.split(":").map(Number);
    return DateTime.fromJSDate(now)
      .setZone(tz)
      .plus({ days: n })
      .set({ hour, minute, second: 0, millisecond: 0 })
      .toISO();
  }

  if (recurrence.everyNMinutes) {
    return roundUpToTenMinutes(
      new Date(now.getTime() + recurrence.everyNMinutes.n * 60000),
    ).toISOString();
  }

  return null;
}

function computeDoneDescription(reminder) {
  const { recurrence } = reminder;
  if (!recurrence) return "Done";

  if (recurrence.oneTime) return "Done · Deletes this reminder";

  const next = computeNextScheduledTime(reminder);
  if (!next) return "Done";

  const tz =
    recurrence.scheduleByDay?.[0]?.timezone ??
    recurrence.everyNDays?.timezone ??
    "America/New_York";
  const nextDt = DateTime.fromISO(next).setZone(tz);

  if (recurrence.scheduleByDay) {
    return `Done · Reschedules to ${nextDt.toFormat("EEE MMM d 'at' h:mm a")}`;
  }
  if (recurrence.everyNDays) {
    const n = recurrence.everyNDays.n;
    return `Done · Reschedules in ${n} day${n > 1 ? "s" : ""} at ${nextDt.toFormat("h:mm a")}`;
  }
  if (recurrence.everyNMinutes) {
    return `Done · Reschedules in ${recurrence.everyNMinutes.n} minutes`;
  }
  return "Done";
}

function resolveInteractionDefaults(reminder, reminderDefaults) {
  const resolve = (field) => {
    if (reminder[field] !== null && reminder[field] !== undefined) {
      return reminder[field];
    }
    if (
      reminderDefaults?.[field] !== null &&
      reminderDefaults?.[field] !== undefined
    ) {
      return reminderDefaults[field];
    }
    return false;
  };
  return {
    snoozable: resolve("snoozable"),
    reschedulable: resolve("reschedulable"),
    snoozeOptions:
      reminder.actions?.snooze?.options ??
      reminderDefaults?.snoozeOptions ??
      ["10m", "20m", "30m", "1h", "2h"],
    defaultSnooze:
      reminder.actions?.snooze?.defaultDuration ??
      reminderDefaults?.defaultSnooze ??
      "20m",
  };
}

// ─── Legacy helpers (old schema) ────────────────────────────────────────────

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
  const candidates = recurringSchedule.map(({ day, time, timezone }) => {
    const tz = timezone || "America/New_York";
    const now = DateTime.now().setZone(tz);
    const [hour, minute] = time.split(":").map(Number);

    let candidate = now.set({ hour, minute, second: 0, millisecond: 0 });
    if (candidate <= now) candidate = candidate.plus({ days: 1 });

    let iterations = 0;
    while (
      candidate.toFormat("EEE").toUpperCase().slice(0, 2) !== day &&
      ++iterations <= 14
    ) {
      candidate = candidate.plus({ days: 1 });
    }
    return candidate;
  });

  return candidates.reduce((min, c) => (c < min ? c : min));
}

function formatNextOccurrence(dt) {
  const now = DateTime.now().setZone(dt.zoneName);
  const timeStr = dt.toFormat("h:mm a");
  if (dt.hasSame(now, "day")) return `This will skip your ${timeStr} reminder today`;
  if (dt.hasSame(now.plus({ days: 1 }), "day")) {
    return `This will skip your ${timeStr} reminder tomorrow`;
  }
  return `This will skip your ${timeStr} reminder on ${dt.toFormat("EEEE")}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const AlertModal = ({ alert, reminderDefaults, onYes, onNo, onButtonTap, onEditSubmit }) => {
  const { theme } = useTheme();

  // New schema state
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState(null);

  // Shared state (also drives legacy edit mode)
  const [editMode, setEditMode] = useState(false);
  const [selectedDateTime, setSelectedDateTime] = useState(null);

  const resolvedDefaults = useMemo(
    () => resolveInteractionDefaults(alert || {}, reminderDefaults),
    [alert, reminderDefaults],
  );

  useEffect(() => {
    if (!alert) return;
    setEditMode(false);
    setSelectedOption(null);
    if (alert.actions) {
      const { defaultSnooze } = resolveInteractionDefaults(alert, reminderDefaults);
      setSelectedDuration(defaultSnooze);
      const next = computeNextScheduledTime(alert);
      setSelectedDateTime(next ? new Date(next) : new Date(Date.now() + 3600000));
    } else {
      setSelectedDuration(null);
      setSelectedDateTime(null);
    }
  }, [alert?.id, reminderDefaults]);

  // ── New schema handlers ──

  const handleConfirm = () => {
    if (!selectedOption) return;
    if (selectedOption === "done") {
      onButtonTap({ action: "done" });
    } else if (selectedOption === "snooze") {
      onButtonTap({ action: "snooze", duration: selectedDuration });
    } else if (selectedOption === "reschedule") {
      if (!selectedDateTime) return;
      onButtonTap({ action: "reschedule", scheduledTime: selectedDateTime.toISOString() });
    }
  };

  // ── Legacy handlers ──

  const visibleButtons = useMemo(() => {
    if (!Array.isArray(alert?.buttons)) return [];
    if (alert.mode === "morning") {
      return alert.buttons.filter((btn) => btn.onComplete !== "set_mode_morning");
    }
    return alert.buttons;
  }, [alert?.buttons, alert?.mode]);

  const hasButtons = visibleButtons.length > 0;

  const isPastTime = selectedDateTime
    ? DateTime.fromJSDate(selectedDateTime) <= DateTime.now()
    : false;

  const conflictWarning = useMemo(() => {
    if (
      !editMode ||
      !selectedDateTime ||
      !Array.isArray(alert?.recurringSchedule) ||
      !alert.recurringSchedule.length
    ) return null;
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

  // ── Render ──

  const renderNewSchemaUI = () => (
    <>
      <View style={styles.optionList}>
        {/* Done — always shown */}
        <TouchableOpacity
          style={styles.optionRow}
          onPress={() => setSelectedOption("done")}
          activeOpacity={0.7}
        >
          <View style={[
            styles.radio,
            { borderColor: theme.border?.primary || theme.border || "#ccc" },
            selectedOption === "done" && {
              backgroundColor: theme.primary || "#2196F3",
              borderColor: theme.primary || "#2196F3",
            },
          ]} />
          <Text style={[styles.optionLabel, { color: theme.text?.primary || "#111" }]}>
            {computeDoneDescription(alert)}
          </Text>
        </TouchableOpacity>

        {/* Snooze — conditional */}
        {resolvedDefaults.snoozable && (
          <View>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSelectedOption("snooze")}
              activeOpacity={0.7}
            >
              <View style={[
                styles.radio,
                { borderColor: theme.border?.primary || theme.border || "#ccc" },
                selectedOption === "snooze" && {
                  backgroundColor: theme.primary || "#2196F3",
                  borderColor: theme.primary || "#2196F3",
                },
              ]} />
              <Text style={[styles.optionLabel, { color: theme.text?.primary || "#111" }]}>
                {"Snooze" + (selectedDuration ? ` · ${selectedDuration}` : "")}
              </Text>
            </TouchableOpacity>
            {selectedOption === "snooze" && (
              <View style={styles.expansion}>
                <View style={styles.pillRow}>
                  {resolvedDefaults.snoozeOptions.map((dur) => (
                    <TouchableOpacity
                      key={dur}
                      style={[
                        styles.pill,
                        { borderColor: theme.primary || "#2196F3" },
                        selectedDuration === dur && {
                          backgroundColor: theme.primary || "#2196F3",
                        },
                      ]}
                      onPress={() => setSelectedDuration(dur)}
                    >
                      <Text style={[
                        styles.pillText,
                        {
                          color: selectedDuration === dur
                            ? "#fff"
                            : theme.text?.primary || "#111",
                        },
                      ]}>
                        {dur}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Reschedule — conditional */}
        {resolvedDefaults.reschedulable && (
          <View>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSelectedOption("reschedule")}
              activeOpacity={0.7}
            >
              <View style={[
                styles.radio,
                { borderColor: theme.border?.primary || theme.border || "#ccc" },
                selectedOption === "reschedule" && {
                  backgroundColor: theme.primary || "#2196F3",
                  borderColor: theme.primary || "#2196F3",
                },
              ]} />
              <Text style={[styles.optionLabel, { color: theme.text?.primary || "#111" }]}>
                {"Reschedule" + (selectedDateTime
                  ? " · " + DateTime.fromJSDate(selectedDateTime)
                      .setZone("America/New_York")
                      .toFormat("EEE MMM d 'at' h:mm a")
                  : "")}
              </Text>
            </TouchableOpacity>
            {selectedOption === "reschedule" && selectedDateTime && (
              <View style={styles.expansion}>
                <SimpleDateTimeSelector
                  label=""
                  selectedDate={selectedDateTime}
                  onDateChange={setSelectedDateTime}
                  compact
                />
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.stackedButton,
          { marginTop: 16 },
          selectedOption
            ? { backgroundColor: theme.primary || "#2196F3" }
            : { backgroundColor: theme.border || "#ccc" },
        ]}
        onPress={handleConfirm}
        disabled={!selectedOption}
      >
        <Text style={styles.buttonText}>Confirm</Text>
      </TouchableOpacity>
    </>
  );

  const renderLegacyUI = () => {
    if (editMode) {
      return (
        <>
          <SimpleDateTimeSelector
            label="Remind me at"
            selectedDate={selectedDateTime}
            onDateChange={setSelectedDateTime}
            compact
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
      );
    }

    if (hasButtons) {
      return (
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
      );
    }

    return (
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
    );
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

            {alert?.actions ? renderNewSchemaUI() : renderLegacyUI()}
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
  // New schema styles
  optionList: {
    gap: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 15,
    flex: 1,
  },
  expansion: {
    paddingLeft: 32,
    paddingBottom: 8,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
  },
  // Legacy styles
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
