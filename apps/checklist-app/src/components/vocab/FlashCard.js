import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme } from "@my-apps/contexts";

/**
 * Animated flip card.
 *
 * Props:
 *   wordId     {string}  - Current word's id — resets flip when it changes
 *   front      {string}  - Text shown on front
 *   back       {string}  - Text shown on back
 *   flipped    {boolean} - Controlled flip state from parent
 *   onFlip     {function} - Called when card is tapped
 */
const FlashCard = ({ wordId, front, back, flipped, onFlip }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const flipAnim = useRef(new Animated.Value(0)).current;

  // Reset to front whenever we move to a new card
  useEffect(() => {
    flipAnim.setValue(0);
  }, [wordId]);

  // Animate to flipped state whenever flipped prop changes
  useEffect(() => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 1 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  }, [flipped]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const styles = StyleSheet.create({
    cardContainer: {
      height: 220,
      marginBottom: getSpacing.lg,
    },
    card: {
      position: "absolute",
      width: "100%",
      height: "100%",
      borderRadius: getBorderRadius.lg,
      padding: getSpacing.lg,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      backfaceVisibility: "hidden",
    },
    backCard: {
      backgroundColor: theme.primary + "15",
      borderColor: theme.primary,
    },
    sideLabel: {
      position: "absolute",
      top: getSpacing.sm,
      left: getSpacing.md,
      fontSize: getTypography.caption.fontSize,
      fontWeight: "600",
      color: theme.text.tertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    backLabel: {
      color: theme.primary,
    },
    frontText: {
      fontSize: 32,
      fontWeight: "700",
      color: theme.text.primary,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    backScrollContainer: {
      maxHeight: 140,
      width: "100%",
    },
    backText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      textAlign: "center",
      lineHeight: 22,
    },
    tapHint: {
      position: "absolute",
      bottom: getSpacing.sm,
      fontSize: getTypography.caption.fontSize,
      color: theme.text.tertiary,
    },
  });

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onFlip}
      activeOpacity={0.95}
    >
      {/* Front face */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ rotateY: frontRotate }], opacity: frontOpacity },
        ]}
      >
        <Text style={styles.sideLabel}>Word</Text>
        <Text style={styles.frontText}>{front}</Text>
        <Text style={styles.tapHint}>Tap to flip</Text>
      </Animated.View>

      {/* Back face */}
      <Animated.View
        style={[
          styles.card,
          styles.backCard,
          { transform: [{ rotateY: backRotate }], opacity: backOpacity },
        ]}
      >
        <Text style={[styles.sideLabel, styles.backLabel]}>Definition</Text>
        <ScrollView
          style={styles.backScrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: "center" }}
        >
          <Text style={styles.backText}>{back}</Text>
        </ScrollView>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default FlashCard;
