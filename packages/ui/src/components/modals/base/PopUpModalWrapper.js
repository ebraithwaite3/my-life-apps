import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * PopUpModalWrapper - Unified overlay + white box container
 * NO tap-outside-to-close - must use Cancel/Done buttons
 * Responsive: scales for phones, caps width/height for larger devices
 */
const PopUpModalWrapper = ({ 
  visible, 
  onClose, 
  children, 
  width = '95%',       // Default: 95% of screen width
  maxWidth = 600,      // Cap at 600px for larger devices
  maxHeight = '70%',   // Default: 70% of screen height
}) => {
  const { theme, getBorderRadius } = useTheme();

  const contentStyles = {
    backgroundColor: theme.surface,
    borderRadius: getBorderRadius.lg,
    width: width,
    maxWidth: maxWidth,
    maxHeight: maxHeight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
    borderColor: theme.modal?.border || theme.primary,
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={contentStyles}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default PopUpModalWrapper;