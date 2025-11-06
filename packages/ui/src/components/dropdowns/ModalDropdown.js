import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';  // ✨ Added Dimensions
import { useTheme } from '@my-apps/contexts';

const { width: screenWidth } = Dimensions.get('window');

const ModalDropdown = ({ visible, options, onSelect, onClose, anchorPosition = { x: 0, y: 0, width: 0, height: 0 } }) => {
  const { theme } = useTheme();

  if (!options || options.length === 0) return null;

  const handleOptionPress = (option) => {
    onSelect(option);
  };

  // ✨ Compute position: Below button on screen, right-aligned, fixed width
  const computedStyle = {
    position: 'absolute',
    top: anchorPosition.y + anchorPosition.height + 8,  // ✨ Screen y + button height + gap
    right: screenWidth - (anchorPosition.x + anchorPosition.width),  // ✨ Hug button's right edge
    width: 300,  // ✨ Fixed width—feels "full" for menu, not screen-spanning
    maxWidth: screenWidth * 0.9,  // Prevent off-screen
  };

  // ✨ Arrow: Positioned at top-left of dropdown, pointing up
  const Arrow = () => (
    <View
      style={[
        styles.arrow,
        { 
          left: 16,  // Offset to align with option text
          borderBottomColor: theme.surface || '#fff',
        }
      ]}
    />
  );

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dropdown,
                computedStyle,  // ✨ Apply screen positioning
                { 
                  backgroundColor: theme.surface || '#fff',
                  borderColor: theme.border || '#e0e0e0',
                }
              ]}
            >
              {/* Arrow above dropdown */}
              <Arrow />
              
              {options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleOptionPress(option)}
                  style={[
                    styles.dropdownItem,
                    index === options.length - 1 && { borderBottomWidth: 0 },
                    { borderBottomColor: theme.border || '#e0e0e0' }
                  ]}
                >
                  <Text style={[styles.dropdownText, { color: theme.text.primary }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdown: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  arrow: {
    position: 'absolute',
    top: -4,  // Just above dropdown
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 4,
    borderStyle: 'solid',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownText: {
    fontSize: 16,
  },
});

export default ModalDropdown;