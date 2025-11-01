import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGroupActions } from '../../../hooks';

const RoleSelector = ({ selectedRole, onRoleChange, theme, getSpacing, getTypography }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const roles = [
    { value: 'member', label: 'Member', description: 'Can view and edit group content' },
    { value: 'admin', label: 'Admin', description: 'Full access including member management' },
    { value: 'child', label: 'Child', description: 'Limited access with parental controls' },
  ];

  const selectedRoleData = roles.find(role => role.value === selectedRole);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          padding: getSpacing.md,
          backgroundColor: theme.background,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={{
          fontSize: getTypography.body.fontSize,
          color: selectedRole ? theme.text.primary : theme.text.tertiary,
        }}>
          {selectedRoleData ? selectedRoleData.label : 'Select Role'}
        </Text>
        <Ionicons 
          name={isOpen ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={theme.text.secondary} 
        />
      </TouchableOpacity>
      
      {isOpen && (
        <View style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          marginTop: 4,
          zIndex: 1000,
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
        }}>
          {roles.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={{
                padding: getSpacing.md,
                borderBottomWidth: role.value !== roles[roles.length - 1].value ? 1 : 0,
                borderBottomColor: theme.border,
              }}
              onPress={() => {
                onRoleChange(role.value);
                setIsOpen(false);
              }}
            >
              <Text style={{
                fontSize: getTypography.body.fontSize,
                fontWeight: '600',
                color: theme.text.primary,
                marginBottom: 2,
              }}>
                {role.label}
              </Text>
              <Text style={{
                fontSize: getTypography.bodySmall.fontSize,
                color: theme.text.secondary,
              }}>
                {role.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const GroupInviteModal = ({ isVisible, onClose, user, group }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [invites, setInvites] = useState([{ email: '', role: '' }]);
  const [errors, setErrors] = useState([]);
  const scrollViewRef = useRef(null);

  const { inviteUsersToGroup } = useGroupActions();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addInvite = () => {
    setInvites(prev => [...prev, { email: '', role: '' }]);
    // Scroll to bottom after adding
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeInvite = (index) => {
    if (invites.length <= 1) {
      // Reset the single invite instead of removing it
      setInvites([{ email: '', role: '' }]);
    } else {
      setInvites(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateInvite = (index, field, value) => {
    setInvites(prev => prev.map((invite, i) => 
      i === index ? { ...invite, [field]: value } : invite
    ));
  };

  const validateForm = () => {
    const newErrors = [];
    
    // Filter out empty invites
    const validInvites = invites.filter(invite => invite.email.trim() || invite.role);
    
    if (validInvites.length === 0) {
      newErrors.push('At least one email address is required.');
      setErrors(newErrors);
      return false;
    }

    // Check each valid invite
    validInvites.forEach((invite, index) => {
      if (!invite.email.trim()) {
        newErrors.push(`Email is required for invite ${index + 1}.`);
      } else if (!validateEmail(invite.email.trim())) {
        newErrors.push(`Invalid email format for invite ${index + 1}.`);
      }
      
      if (!invite.role) {
        newErrors.push(`Role is required for invite ${index + 1}.`);
      }
    });

    // Check for duplicate emails
    const emails = validInvites.map(invite => invite.email.trim().toLowerCase());
    const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicates.length > 0) {
      newErrors.push('Duplicate email addresses are not allowed.');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleInvite = async () => {
    if (!validateForm()) {
      return;
    }

    // Filter out empty invites and prepare final data
    const validInvites = invites
      .filter(invite => invite.email.trim() && invite.role)
      .map(invite => ({
        email: invite.email.trim().toLowerCase(),
        role: invite.role
      }));

    console.log('Sending invites:', validInvites);
    console.log('Group:', group.name || group.groupName);
    
    // For each valid invite, add the invite code and group info
    validInvites.forEach(invite => {
      // Get the invite code for this role from the group's inviteCodes object
      const inviteCode = group.inviteCodes?.[invite.role];
      
      if (inviteCode) {
        invite.inviteCode = inviteCode;
        invite.groupId = group.groupId;
        invite.groupName = group.name;
        invite.inviterName = user?.username || 'Unknown';
        invite.inviterUserId = user?.userId || user?.uid || 'unknown';
      }
      
      console.log('Prepared invite:', invite);
    });
    
    try {
      const result = await inviteUsersToGroup(group.groupId, validInvites, { 
        userId: user.userId, 
        username: user.username
      });
      
      // Create a detailed success message based on results
      let successMessage = `${result.invitedUsers} user${result.invitedUsers !== 1 ? 's' : ''} invited successfully!`;
      
      if (result.storedEmails > 0) {
        successMessage += `\n\n${result.storedEmails} email${result.storedEmails !== 1 ? 's' : ''} didn't have account(s) yet. They'll receive their invite when they sign up.`;
      }
      
      Alert.alert('Invites Sent', successMessage, [{ text: 'OK', onPress: handleClose }]);
    } catch (error) { 
      console.error('Error sending invites:', error);
      Alert.alert('Error', error.message || 'Failed to send invites. Please try again later.');
    }
  };

  const handleClose = () => {
    setInvites([{ email: '', role: '' }]);
    setErrors([]);
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 20,
    },
    modalContainer: {
      backgroundColor: theme.surface || theme.background,
      borderRadius: 16,
      padding: getSpacing.lg,
      margin: getSpacing.md,
      minHeight: '85%',
      maxHeight: '85%',
      width: '95%',
      maxWidth: 500,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.lg,
    },
    title: {
      fontSize: getTypography.h3.fontSize,
      fontWeight: 'bold',
      color: theme.text.primary,
      flex: 1,
    },
    closeButton: {
      padding: getSpacing.xs,
    },
    instructions: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      marginBottom: getSpacing.lg,
      lineHeight: 20,
    },
    inviteItem: {
      marginBottom: getSpacing.lg,
      padding: getSpacing.md,
      backgroundColor: theme.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inviteHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.md,
    },
    inviteNumber: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    removeButton: {
      padding: getSpacing.xs,
    },
    inputLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.xs,
    },
    emailInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
      marginBottom: getSpacing.md,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.md,
      backgroundColor: theme.primary + '15',
      borderRadius: 8,
      marginBottom: getSpacing.lg,
    },
    addButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.primary,
      fontWeight: '600',
      marginLeft: getSpacing.xs,
    },
    errorContainer: {
      marginBottom: getSpacing.md,
    },
    errorText: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.error || '#ef4444',
      marginBottom: getSpacing.xs,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: getSpacing.md,
    },
    button: {
      flex: 1,
      paddingVertical: getSpacing.md,
      paddingHorizontal: getSpacing.lg,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    inviteButtonStyle: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      fontWeight: '600',
    },
    inviteButtonText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.inverse,
      fontWeight: '600',
    },
  });

  if (!isVisible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite to Group</Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={theme.text.secondary} />
            </TouchableOpacity>
          </View>
  
          {/* Instructions */}
          <Text style={styles.instructions}>
            For each person you want to invite, enter their email address and select their role in the group.
          </Text>
  
          {/* KeyboardAware Content */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 75 : 0} // small offset
            style={{ flex: 1 }}
          >
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: getSpacing.lg }}
            >
              {invites.map((invite, index) => (
                <View key={index} style={styles.inviteItem}>
                  <View style={styles.inviteHeader}>
                    <Text style={styles.inviteNumber}>Invite {index + 1}</Text>
                    {invites.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeInvite(index)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.error || '#ef4444'}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
  
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Enter email address..."
                    placeholderTextColor={theme.text.tertiary}
                    value={invite.email}
                    onChangeText={(text) => updateInvite(index, 'email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
  
                  <Text style={styles.inputLabel}>Role</Text>
                  <RoleSelector
                    selectedRole={invite.role}
                    onRoleChange={(role) => updateInvite(index, 'role', role)}
                    theme={theme}
                    getSpacing={getSpacing}
                    getTypography={getTypography}
                  />
                </View>
              ))}
  
              {/* Add Another Button */}
              <TouchableOpacity style={styles.addButton} onPress={addInvite}>
                <Ionicons name="add" size={20} color={theme.primary} />
                <Text style={styles.addButtonText}>Add Another Invite</Text>
              </TouchableOpacity>
  
              {/* Errors */}
              {errors.length > 0 && (
                <View style={styles.errorContainer}>
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
  
            {/* Buttons (still inside KeyboardAvoidingView, so they move up) */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                style={[styles.button, styles.inviteButtonStyle]}
                onPress={handleInvite}
              >
                <Text style={styles.inviteButtonText}>Send Invites</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
  
};

export default GroupInviteModal;