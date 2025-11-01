import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import QuantityTracker from '../QuantityTracker';

const AutoAdd = ({ 
  autoAddAt, 
  onAutoAddAtUpdate,
  restockAmount,
  onRestockAmountUpdate,
  minAutoAddAt = 0,
  maxAutoAddAt = 99,
  minRestockAmount = 1,
  maxRestockAmount = 99,
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      gap: getSpacing.md,
    },
    section: {
      flex: 1,
    },
    label: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      marginBottom: getSpacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.label}>Auto Add When At</Text>
        <QuantityTracker
          value={autoAddAt}
          onUpdate={onAutoAddAtUpdate}
          min={minAutoAddAt}
          max={maxAutoAddAt}
          size="medium"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Restock Amount</Text>
        <QuantityTracker
          value={restockAmount}
          onUpdate={onRestockAmountUpdate}
          min={minRestockAmount}
          max={maxRestockAmount}
          size="medium"
        />
      </View>
    </View>
  );
};

export default AutoAdd;