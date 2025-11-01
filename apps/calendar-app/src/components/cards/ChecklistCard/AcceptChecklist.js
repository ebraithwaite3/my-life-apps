import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { updateDocument } from "../../../services/firestoreService";
import { addMessageToUser } from "../../../services/messageService";

const AcceptChecklist = ({ checklist, user, onChecklistUpdate }) => {
    const { theme, getSpacing, getTypography } = useTheme();

    // Only show this component if checklist has accepted: false
    if (!checklist || checklist.accepted !== false) {
        return null;
    }

    const handleAccept = async () => {
        try {
            // Find and update the checklist to mark as accepted
            const updatedChecklists = (user.savedChecklists || []).map(cl => 
                cl.id === checklist.id 
                    ? { ...cl, accepted: true }
                    : cl
            );

            await updateDocument('users', user.userId, {
                savedChecklists: updatedChecklists,
            });

            if (onChecklistUpdate) onChecklistUpdate();
            Alert.alert("Success", "Checklist accepted successfully!");

        } catch (error) {
            console.error("Error accepting checklist:", error);
            Alert.alert("Error", "Failed to accept checklist. Please try again.");
        }
    };

    const handleDecline = () => {
        Alert.alert(
            "Decline Checklist",
            `Are you sure you want to decline the checklist "${checklist.name}" from ${checklist.sharedBy?.username}? This will remove it from your saved checklists.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove the checklist from user's saved checklists
                            const updatedChecklists = (user.savedChecklists || []).filter(
                                cl => cl.id !== checklist.id
                            );

                            await updateDocument('users', user.userId, {
                                savedChecklists: updatedChecklists,
                            });

                            // Notify the original sender about the rejection
                            if (checklist.sharedBy?.userId) {
                                try {
                                    const notificationMessage = `${user.username} has declined your shared checklist "${checklist.name}".`;
                                    
                                    await addMessageToUser(
                                        checklist.sharedBy.userId,
                                        {
                                            userId: user.userId,
                                            username: user.username,
                                            groupName: null,
                                            screenForNavigation: {
                                                screen: "Preferences",
                                                params: {
                                                    openChecklists: true
                                                },
                                            },
                                        },
                                        notificationMessage
                                    );
                                    console.log("Decline notification sent to original sender");
                                } catch (notificationError) {
                                    console.error("Error sending decline notification:", notificationError);
                                    // Don't fail the decline process if notification fails
                                }
                            }

                            if (onChecklistUpdate) onChecklistUpdate();
                            Alert.alert("Declined", "Checklist declined and removed from your saved checklists.");

                        } catch (error) {
                            console.error("Error declining checklist:", error);
                            Alert.alert("Error", "Failed to decline checklist. Please try again.");
                        }
                    },
                },
            ]
        );
    };

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.surface || theme.background,
            borderRadius: 16,
            padding: getSpacing.lg,
            marginBottom: getSpacing.md,
            borderWidth: 2,
            borderColor: theme.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        header: {
            flexDirection: "row",
            alignItems: "center",
            marginBottom: getSpacing.sm,
        },
        icon: {
            marginRight: getSpacing.sm,
        },
        title: {
            ...getTypography.h4,
            color: theme.text.primary,
            fontWeight: "bold",
            flex: 1,
        },
        sharedByText: {
            ...getTypography.body,
            color: theme.text.secondary,
            marginBottom: getSpacing.md,
            lineHeight: 20,
        },
        itemCount: {
            ...getTypography.caption,
            color: theme.text.secondary,
            marginBottom: getSpacing.md,
        },
        buttonContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            gap: getSpacing.md,
            marginTop: getSpacing.sm,
        },
        button: {
            flex: 1,
            paddingVertical: getSpacing.md,
            paddingHorizontal: getSpacing.lg,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
        },
        declineButton: {
            backgroundColor: theme.background,
            borderWidth: 1,
            borderColor: theme.error || "#ef4444",
        },
        acceptButton: {
            backgroundColor: theme.primary,
        },
        declineButtonText: {
            ...getTypography.body,
            color: theme.error || "#ef4444",
            fontWeight: "600",
            marginLeft: getSpacing.xs,
        },
        acceptButtonText: {
            ...getTypography.body,
            color: theme.text.inverse,
            fontWeight: "600",
            marginLeft: getSpacing.xs,
        },
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons
                    name="share-outline"
                    size={24}
                    color={theme.primary}
                    style={styles.icon}
                />
                <Text style={styles.title}>{checklist.name}</Text>
            </View>
            
            <Text style={styles.sharedByText}>
                {checklist.sharedBy?.username || "Someone"} has shared this checklist with you.
            </Text>
            
            <Text style={styles.itemCount}>
                {checklist.items?.length || 0} items
            </Text>

            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[styles.button, styles.declineButton]} 
                    onPress={handleDecline}
                >
                    <Ionicons 
                        name="close-outline" 
                        size={18} 
                        color={theme.error || "#ef4444"} 
                    />
                    <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.button, styles.acceptButton]} 
                    onPress={handleAccept}
                >
                    <Ionicons 
                        name="checkmark-outline" 
                        size={18} 
                        color={theme.text.inverse} 
                    />
                    <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AcceptChecklist;