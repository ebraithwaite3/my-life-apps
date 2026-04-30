import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@my-apps/contexts";
import { PageHeader, SelectModal } from "@my-apps/ui";
import { useScheduleTodayData } from "./useEndpointData";

// ---------------------------------------------------------------------------
// Endpoint registry — add more here as needed.
// dataFunction: name of a hook result to call on "Get Data" press.
// ---------------------------------------------------------------------------
const ENDPOINTS = [
  {
    id: "voiceTest",
    name: "Voice Test",
    url: "https://us-central1-calendarconnectionv2.cloudfunctions.net/voiceTest",
  },
  {
    id: "scheduleToday",
    name: "Update To Dos",
    url: "https://us-central1-calendarconnectionv2.cloudfunctions.net/updateTodos",
    dataFunction: "useScheduleTodayData",
  },
];

// ---------------------------------------------------------------------------
// EndpointHitter
// ---------------------------------------------------------------------------
const EndpointHitter = ({ onClose }) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const [selectedEndpoint, setSelectedEndpoint] = useState(ENDPOINTS[0]);
  const [jsonInput, setJsonInput] = useState("{\n  \n}");
  const [loading, setLoading] = useState(false);
  const [getDataDisabled, setGetDataDisabled] = useState(false);
  const [result, setResult] = useState(null);

  // Resolve all data hooks up front (hooks must not be called conditionally)
  const getScheduleTodayData = useScheduleTodayData();

  const DATA_FUNCTIONS = {
    useScheduleTodayData: getScheduleTodayData,
  };

  const endpointOptions = ENDPOINTS.map((e) => ({ label: e.name, value: e.id }));

  const handleSelectEndpoint = (value) => {
    const ep = ENDPOINTS.find((e) => e.id === value);
    if (ep) {
      setSelectedEndpoint(ep);
      setResult(null);
    }
  };

  // "Get Data" — gather, copy to clipboard, alert
  const handleGetData = useCallback(async () => {
    const fn = DATA_FUNCTIONS[selectedEndpoint.dataFunction];
    if (!fn) return;

    setGetDataDisabled(true);
    setTimeout(() => setGetDataDisabled(false), 10000);

    try {
      const clipboardString = fn();
      setJsonInput(clipboardString);
      await Clipboard.setStringAsync(clipboardString);
      Alert.alert(
        "Copied to Clipboard",
        "Data loaded into text box and copied to clipboard.",
      );
    } catch (err) {
      Alert.alert("Error", `Failed to gather data: ${err.message}`);
    }
  }, [selectedEndpoint, DATA_FUNCTIONS]);

  // "Submit" — POST current JSON input to endpoint
  const handleSubmit = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setResult({ ok: false, status: null, body: "Invalid JSON — fix it and try again." });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(selectedEndpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const text = await response.text();
      let body;
      try {
        body = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        body = text;
      }

      setResult({ ok: response.ok, status: response.status, body });
    } catch (err) {
      setResult({ ok: false, status: null, body: `Network error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  const hasDataFunction = !!selectedEndpoint.dataFunction;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: getSpacing.md, paddingBottom: 40 },
    label: {
      ...getTypography.body,
      fontWeight: "600",
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
      marginTop: getSpacing.md,
    },
    urlText: {
      fontSize: 12,
      color: theme.text.tertiary,
      marginBottom: getSpacing.sm,
      fontFamily: "monospace",
    },
    jsonInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
      color: theme.text.primary,
      fontFamily: "monospace",
      fontSize: 13,
      minHeight: 160,
      textAlignVertical: "top",
    },
    buttonRow: {
      flexDirection: "row",
      gap: getSpacing.sm,
      marginTop: getSpacing.lg,
    },
    button: {
      flex: 1,
      borderRadius: 8,
      padding: getSpacing.md,
      alignItems: "center",
      justifyContent: "center",
    },
    getDataButton: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    getDataButtonDisabled: {
      borderColor: theme.border,
    },
    getDataButtonText: {
      color: theme.primary,
      fontSize: 15,
      fontWeight: "600",
    },
    getDataButtonTextDisabled: {
      color: theme.text.tertiary,
    },
    submitButton: {
      backgroundColor: theme.primary,
    },
    submitButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
    resultBox: {
      marginTop: getSpacing.lg,
      borderRadius: 8,
      padding: getSpacing.md,
      borderWidth: 1,
    },
    resultLabel: {
      fontSize: 12,
      fontWeight: "700",
      marginBottom: getSpacing.xs,
    },
    resultBody: {
      fontSize: 12,
      fontFamily: "monospace",
    },
  });

  return (
    <View style={styles.container}>
      <PageHeader
        title="Endpoint Hitter"
        subtext="POST JSON to configured endpoints"
        showBackButton
        showNavArrows={false}
        onBackPress={onClose}
        icons={[]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Endpoint picker */}
        <Text style={styles.label}>Endpoint</Text>
        <SelectModal
          title="Select Endpoint"
          value={selectedEndpoint.id}
          options={endpointOptions}
          getLabel={(o) => o.label}
          getValue={(o) => o.value}
          onSelect={handleSelectEndpoint}
        />
        <Text style={styles.urlText}>{selectedEndpoint.url}</Text>

        {/* JSON input */}
        <Text style={styles.label}>JSON Payload</Text>
        <TextInput
          style={styles.jsonInput}
          value={jsonInput}
          onChangeText={setJsonInput}
          multiline
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          placeholder='{ "key": "value" }'
          placeholderTextColor={theme.text.tertiary}
        />

        {/* Buttons */}
        <View style={styles.buttonRow}>
          {hasDataFunction && (
            <TouchableOpacity
              style={[
                styles.button,
                styles.getDataButton,
                getDataDisabled && styles.getDataButtonDisabled,
              ]}
              onPress={handleGetData}
              disabled={getDataDisabled}
            >
              <Text style={[
                styles.getDataButtonText,
                getDataDisabled && styles.getDataButtonTextDisabled,
              ]}>
                {getDataDisabled ? "Copied!" : "Get Data"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && (
          <View style={[
            styles.resultBox,
            {
              backgroundColor: result.ok
                ? (theme.success || "#4CAF50") + "15"
                : (theme.error  || "#F44336") + "15",
              borderColor: result.ok
                ? (theme.success || "#4CAF50")
                : (theme.error  || "#F44336"),
            },
          ]}>
            <Text style={[
              styles.resultLabel,
              { color: result.ok ? (theme.success || "#4CAF50") : (theme.error || "#F44336") },
            ]}>
              {result.ok
                ? `✓ Success (${result.status})`
                : `✗ Error${result.status ? ` (${result.status})` : ""}`}
            </Text>
            <Text style={[styles.resultBody, { color: theme.text.primary }]}>
              {result.body}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EndpointHitter;
