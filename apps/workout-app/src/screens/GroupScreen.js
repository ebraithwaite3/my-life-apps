import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import GroupCard from "../components/cards/GroupCard";
import GroupInviteCard from "../components/cards/GroupCard/GroupInviteCard";

const GroupScreen = ({ navigation, route }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const { groups, user } = useData();

  const pendingGroupInvites = useMemo(() => {
    return user?.groupInvites || [];
  }, [user?.groupInvites]);
  console.log("Pending group invites:", pendingGroupInvites);

  // Log params whenever they change
  useEffect(() => {
    if (route.params) {
      console.log("GroupScreen received params:", route.params);
    }
  }, [route.params]);

  const handleCreateGroup = () => {
    navigation.navigate("CreateGroup");
  };

  const handleJoinGroup = () => {
    navigation.navigate("JoinGroup");
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      flexWrap: "wrap", // Handle small screens
    },
    headerTitle: {
      fontSize: getTypography.h2.fontSize,
      fontWeight: getTypography.h2.fontWeight,
      color: theme.text.primary,
      marginRight: getSpacing.sm, // Space before FABs
    },
    headerSubtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.xs,
    },
    content: {
      flex: 1,
      paddingHorizontal: getSpacing.lg,
      paddingTop: getSpacing.xl,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: getSpacing.xxl,
    },
    emptyIcon: {
      marginBottom: getSpacing.lg,
    },
    emptyTitle: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: getTypography.h3.fontWeight,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: "center",
      marginBottom: getSpacing.xl,
      lineHeight: 22,
      paddingHorizontal: getSpacing.md,
    },
    buttonContainer: {
      alignItems: "center",
      gap: getSpacing.md,
    },
    createButton: {
      backgroundColor: theme.primary,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.xl,
      borderRadius: getBorderRadius.md,
      flexDirection: "row",
      alignItems: "center",
      elevation: 2,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    createButtonText: {
      color: theme.text.inverse,
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      marginLeft: getSpacing.sm,
    },
    joinButton: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.xl,
      borderRadius: getBorderRadius.md,
      flexDirection: "row",
      alignItems: "center",
    },
    joinButtonText: {
      color: theme.text.primary,
      fontSize: getTypography.button.fontSize,
      fontWeight: getTypography.button.fontWeight,
      marginLeft: getSpacing.sm,
    },
    groupsList: {
      paddingTop: getSpacing.md,
    },
    fab: {
      backgroundColor: theme.primary,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      marginLeft: getSpacing.sm,
      marginRight: getSpacing.lg, // Space from hamburger button
    },
    joinFab: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.primary,
      marginRight: getSpacing.sm, // Space between FABs
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Groups</Text>
            {groups.length > 0 && (
              <>
                {/* <TouchableOpacity
                  style={[styles.fab, styles.joinFab]}
                  onPress={handleJoinGroup}
                >
                  <Ionicons name="people" size={24} color={theme.primary} />
                </TouchableOpacity> */}
                <TouchableOpacity
                  style={styles.fab}
                  onPress={handleCreateGroup}
                >
                  <Ionicons name="add" size={24} color={theme.text.inverse} />
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={styles.headerSubtitle}>
            Share calendars with family, teams, or friends
          </Text>
        </View>

        {pendingGroupInvites.length > 0 &&
          pendingGroupInvites.map((invite, index) => (
            <GroupInviteCard key={invite.groupId || index} invite={invite} />
          ))}

        {/* Content */}
        <View style={styles.content}>
          {groups.length === 0 ? (
            // Empty state
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="people-outline"
                  size={64}
                  color={theme.text.tertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a group to share calendars with family, teams, or
                friends. Or join an existing group with an invite code.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateGroup}
                >
                  <Ionicons name="add" size={20} color={theme.text.inverse} />
                  <Text style={styles.createButtonText}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Groups list
            <ScrollView
              style={styles.groupsList}
              showsVerticalScrollIndicator={false}
            >
              {groups?.map((group) => (
                <GroupCard
                  key={group.id || group.groupId}
                  group={group}
                  currentUserId={user?.userId || user?.uid}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default GroupScreen;
