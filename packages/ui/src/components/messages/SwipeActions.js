import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

const SwipeActions = ({ type, isRead, onPress }) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();

  const getActionConfig = () => {
    switch (type) {
      case 'read':
        return {
          icon: isRead ? 'mail-unread-outline' : 'mail-open-outline',
          label: isRead ? 'Unread' : 'Read',
          color: theme.primary,
          position: 'left',
        };
      case 'delete':
        return {
          icon: 'trash-outline',
          label: 'Delete',
          color: theme.error,
          position: 'right',
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: config.position === 'left' ? 'flex-end' : 'flex-start',
      paddingHorizontal: getSpacing.md,
      marginVertical: getSpacing.xs,
      [config.position === 'left' ? 'marginRight' : 'marginLeft']: getSpacing.md,
      borderRadius: getBorderRadius.md,
    },
    action: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      height: '100%',
      backgroundColor: config.color,
      borderRadius: getBorderRadius.md,
    },
    actionText: {
      color: 'white',
      fontSize: getTypography.caption.fontSize,
      fontWeight: 'bold',
      marginTop: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.action}
        onPress={onPress}
      >
        <Ionicons name={config.icon} size={24} color="white" />
        <Text style={styles.actionText}>{config.label}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default SwipeActions;