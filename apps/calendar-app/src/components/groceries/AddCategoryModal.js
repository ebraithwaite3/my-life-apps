import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const AddCategoryModal = ({ visible, onClose, onAdd, existingCategories }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [categoryName, setCategoryName] = useState('');

  const toCamelCase = (str) => {
    // Remove extra spaces and split into words
    const words = str.trim().split(/\s+/);
    
    // First word is lowercase, rest are capitalized
    return words
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  };

  const handleAdd = () => {
    const trimmed = categoryName.trim();
    
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Convert to camelCase for storage
    const camelCased = toCamelCase(trimmed);

    if (existingCategories.includes(camelCased)) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    onAdd(camelCased);
    setCategoryName('');
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      width: '85%',
      maxWidth: 400,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getSpacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: getTypography.h4.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
    },
    closeButton: {
      padding: getSpacing.sm,
    },
    content: {
      padding: getSpacing.lg,
    },
    label: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: getBorderRadius.sm,
      padding: getSpacing.md,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      backgroundColor: theme.background,
    },
    helperText: {
      fontSize: getTypography.caption.fontSize,
      color: theme.text.secondary,
      marginTop: getSpacing.sm,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: getSpacing.md,
      padding: getSpacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    button: {
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.md,
      borderRadius: getBorderRadius.sm,
      minWidth: 80,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    addButton: {
      backgroundColor: theme.primary,
    },
    buttonText: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '500',
    },
    cancelButtonText: {
      color: theme.text.primary,
    },
    addButtonText: {
      color: '#fff',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.container}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Add Category</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.label}>Category Name</Text>
              <TextInput
                style={styles.input}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="e.g., snacks, beverages"
                placeholderTextColor={theme.text.secondary}
                autoFocus
                autoCapitalize="none"
                onSubmitEditing={handleAdd}
              />
              <Text style={styles.helperText}>
                Enter a category name (lowercase recommended)
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.addButton]}
                onPress={handleAdd}
              >
                <Text style={[styles.buttonText, styles.addButtonText]}>Add</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddCategoryModal;