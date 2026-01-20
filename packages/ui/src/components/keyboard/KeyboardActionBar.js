import React from 'react';
import { View, Text, TouchableOpacity, Keyboard, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * KeyboardActionBar - A customizable action bar that appears above the keyboard
 * 
 * @param {Object} leftButton - Optional left button config { text: string, icon: string, onPress: function }
 * @param {Object} centerButton - Optional center button config { text: string, icon: string, onPress: function }
 * @param {React.ReactNode} centerContent - Optional custom React content for center (overrides centerButton)
 * @param {Object} rightButton - Optional right button config (defaults to "Done" dismiss keyboard)
 * @param {boolean} visible - Whether to show the bar (typically keyboardVisible state)
 * @param {Function} onWillDismiss - Optional callback fired before keyboard dismisses (use to hide bar immediately)
 */
const KeyboardActionBar = ({ 
  leftButton, 
  centerButton,
  centerContent,
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
      onWillDismiss?.();
      Keyboard.dismiss();
    }
  };

  const finalRightButton = rightButton || defaultRightButton;

  const renderButton = (button, position) => {
    if (!button) return <View style={styles.buttonContainer} />;

    return (
      <TouchableOpacity
        style={[
          styles.button,
          {
            paddingHorizontal: getSpacing.sm,
            paddingVertical: 6,
            borderRadius: 6,
          }
        ]}
        onPress={button.onPress}
      >
        {button.icon && (
          <Ionicons 
            name={button.icon} 
            size={18}
            color={theme.primary}
            style={{ marginRight: button.text ? 4 : 0 }}
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
        paddingVertical: 6,
        paddingHorizontal: getSpacing.md,
      }
    ]}>
      {/* Left Button */}
      <View style={styles.buttonContainer}>
        {renderButton(leftButton, 'left')}
      </View>

      {/* Center - Custom Content or Button */}
      <View style={[styles.buttonContainer, styles.centerContainer]}>
        {centerContent || renderButton(centerButton, 'center')}
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
    margin: 0,
  },
  buttonContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    marginHorizontal: 8,
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