import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, Alert } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme, useData } from "@my-apps/contexts";
import { PageHeader } from "@my-apps/ui";
import { Ionicons } from "@expo/vector-icons";
import WorkoutTemplateCard from "../components/cards/WorkoutTemplateCard";
import WorkoutModal from "../components/modals/WorkoutModal";
import { useWorkoutTemplates } from "../hooks/useWorkoutTemplates";

const WorkoutTemplatesScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();
  const tabBarHeight = useBottomTabBarHeight();

  const {
    allTemplates,
    saveTemplate,
    deleteTemplate,
    moveTemplate,
    getAvailableMoveTargets,
    promptForContext,
  } = useWorkoutTemplates();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContext, setTemplateContext] = useState(null);

  const handleCreateTemplate = () => {
    promptForContext((context) => {
      setTemplateContext(context);
      setSelectedTemplate(null);
      setShowModal(true);
    });
  };

  const handleEditTemplate = (template) => {
    if (template.isGroupTemplate) {
      setTemplateContext({
        type: "group",
        groupId: template.groupId,
        groupName: template.groupName,
      });
    } else {
      setTemplateContext({ type: "personal" });
    }

    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleSaveTemplate = async (template, context) => {
    const success = await saveTemplate(template, context);
    
    if (success) {
      Alert.alert(
        "Success",
        `Template "${template.name}" ${
          selectedTemplate ? "updated" : "created"
        } successfully`
      );
    }
  };

  const handleDeleteTemplate = async (template) => {
    const success = await deleteTemplate(template);
    if (success) {
      Alert.alert("Success", "Template deleted successfully");
    }
  };

  const handleMoveTemplate = async (template, target) => {
    const success = await moveTemplate(template, target);
    if (success) {
      Alert.alert("Success", "Template moved successfully");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
    setTemplateContext(null);
  };

  const renderTemplate = ({ item }) => (
    <WorkoutTemplateCard
      template={item}
      onPress={handleEditTemplate}
      onDelete={handleDeleteTemplate}
      onMove={handleMoveTemplate}
      availableMoveTargets={getAvailableMoveTargets(item)}
    />
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: getSpacing.sm,
      paddingTop: getSpacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: getSpacing.xl,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: getSpacing.md,
    },
  });

  return (
    <View style={styles.container}>
      <PageHeader
        title="Workout Templates"
        subtext="Reusable workout plans"
        icons={[{ icon: "add", action: handleCreateTemplate }]}
      />

      <View style={styles.content}>
        {allTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="barbell-outline"
              size={64}
              color={theme.text.tertiary}
            />
            <Text style={styles.emptyText}>
              No workout templates yet.{"\n"}Create a template to reuse workout plans.
            </Text>
          </View>
        ) : (
          <FlatList
            data={allTemplates}
            renderItem={renderTemplate}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: tabBarHeight,
            }}
          />
        )}
      </View>

      {/* Workout Modal */}
      <WorkoutModal
        visible={showModal}
        onClose={closeModal}
        mode="template"
        template={selectedTemplate}
        onSaveTemplate={handleSaveTemplate}
        templateContext={templateContext}
        isUserAdmin={user?.admin === true}
      />
    </View>
  );
};

export default WorkoutTemplatesScreen;