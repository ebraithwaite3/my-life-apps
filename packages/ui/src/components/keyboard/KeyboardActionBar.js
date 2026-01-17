import React from 'react';
import { View, Text, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * KeyboardActionBar - A customizable action bar that appears above the keyboard
 * 
 * @param {Object} leftButton - Optional left button config { text: string, icon: string, onPress: function }
 * @param {Object} centerButton - Optional center button config { text: string, icon: string, onPress: function }
 * @param {Object} rightButton - Optional right button config (defaults to "Done" dismiss keyboard)
 * @param {boolean} visible - Whether to show the bar (typically keyboardVisible state)
 * @param {Function} onWillDismiss - Optional callback fired before keyboard dismisses (use to hide bar immediately)
 */
const KeyboardActionBar = ({ 
  leftButton, 
  centerButton, 
  rightButton,
  visible = false,
  onWillDismiss 
}) => {
  const { theme, getSpacing } = useTheme();

  if (!visible) return null;

  // Default right button to "Done" with keyboard dismiss
  const defaultRightButton = {
    text: 'Done',
    icon: 'checkmark-circle',
    onPress: () => {
      onWillDismiss?.(); // Hide bar immediately
      Keyboard.dismiss(); // Then dismiss keyboard
    }
  };

  const finalRightButton = rightButton || defaultRightButton;

  const renderButton = (button, position) => {
    if (!button) return <View style={{ flex: 1 }} />;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            //backgroundColor: theme.primary + '20',
            paddingHorizontal: getSpacing.sm, // Tighter
            paddingVertical: getSpacing.xs,   // Tighter
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }
        ]}
        onPress={button.onPress}
      >
        {button.icon && (
          <Ionicons 
            name={button.icon} 
            size={20} // Smaller icon
            color={theme.primary}
            style={{ marginRight: button.text ? getSpacing.xs : 0 }}
          />
        )}
        {button.text && (
          <Text style={[styles.buttonText, { color: theme.primary }]}>
            {button.text}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.background,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        paddingVertical: getSpacing.xs, // Changed from md to xs - tighter spacing
        paddingHorizontal: getSpacing.md,
      }
    ]}>
      {/* Left Button */}
      <View style={styles.buttonContainer}>
        {renderButton(leftButton, 'left')}
      </View>

      {/* Center Button */}
      <View style={styles.buttonContainer}>
        {renderButton(centerButton, 'center')}
      </View>

      {/* Right Button (defaults to Done) */}
      <View style={styles.buttonContainer}>
        {renderButton(finalRightButton, 'right')}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 0, // Explicitly no margin
  },
  buttonContainer: {
    flex: 1,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default KeyboardActionBar;