// AddingToEventBar.jsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useData } from "@my-apps/contexts";
import { useNavigation } from "@react-navigation/native";

const AddingToEventBar = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { addingToEvent, setAddingToEvent } = useData();
  const navigation = useNavigation();

  if (!addingToEvent.isActive) return null;

  const handleCancel = () => {
    console.log("❌ Cancelling add to event");
    const returnPath = addingToEvent.returnPath;
    
    setAddingToEvent({
      isActive: false,
      itemsToMove: [],
      returnPath: null,
      sourceInfo: null,
    });
    
    navigation.navigate(returnPath);
  };

  const itemCount = addingToEvent.itemsToMove?.length || 0;

  return (
    <View style={{
      height: 80,
      backgroundColor: theme.primary,
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderTopWidth: 1,
      borderTopColor: "rgba(255, 255, 255, 0.2)",
    }}>
      <Text style={{
        color: "#fff",
        fontSize: getTypography.body.fontSize,
        fontWeight: "600",
      }}>
        Select date to add {itemCount} {itemCount === 1 ? "item" : "items"}
      </Text>
      
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: getSpacing.md,
          paddingVertical: getSpacing.sm,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          borderRadius: 8,
        }}
        onPress={handleCancel}
      >
        <Ionicons name="close" size={20} color="#fff" />
        <Text style={{
          color: "#fff",
          marginLeft: getSpacing.xs,
          fontWeight: "600",
        }}>
          Cancel
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default AddingToEventBar;