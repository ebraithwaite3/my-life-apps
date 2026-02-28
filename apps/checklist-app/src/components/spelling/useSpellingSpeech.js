import { useState } from "react";
import { Platform } from "react-native";
import * as Speech from "expo-speech";
import { setAudioModeAsync } from "expo-audio";

/**
 * Thin wrapper around expo-speech.
 * Sets playsInSilentModeIOS so audio works even when the iPhone ring/silent
 * switch is flipped to silent (iOS default suppresses AVSpeechSynthesizer).
 * Uses expo-audio (replaces deprecated expo-av in SDK 54).
 */
export const useSpellingSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = async (text) => {
    if (!text) return;

    if (Platform.OS === "ios") {
      try {
        await setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
        });
      } catch (_) {
        // If audio session setup fails, proceed anyway
      }
    }

    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(text, {
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stop = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  return { speak, stop, isSpeaking };
};
