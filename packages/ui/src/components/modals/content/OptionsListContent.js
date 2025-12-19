import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';

/**
 * OptionsListContent - Renders a FlatList of selectable options
 * Used inside SelectionModal, or any modal that needs a list of choices
 */
const OptionsListContent = ({ 
  options = [], 
  onSelect,
  emptyMessage = "No options available"
}) => {
  const { theme, getSpacing, getTypography } = useTheme();

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.option(theme, getSpacing),
        index === options.length - 1 && { borderBottomWidth: 0 }
      ]}
      onPress={() => onSelect(item)}
    >
      <Text style={[styles.optionText(getTypography), { color: theme.text.primary }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  const styles = {
    option: (theme, getSpacing) => ({
      paddingHorizontal: getSpacing.lg,
      paddingVertical: getSpacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    }),
    optionText: (getTypography) => ({
      fontSize: getTypography.body.fontSize,
    }),
    emptyContainer: (getSpacing) => ({
      padding: getSpacing.xl,
      alignItems: 'center',
    }),
    emptyText: (getTypography, theme) => ({
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    }),
  };

  return (
    <FlatList
      data={options}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.id || item.value?.toString() || `option-${index}`}
      showsVerticalScrollIndicator={true}
      ListEmptyComponent={
        <View style={styles.emptyContainer(getSpacing)}>
          <Text style={styles.emptyText(getTypography, theme)}>
            {emptyMessage}
          </Text>
        </View>
      }
    />
  );
};

export default OptionsListContent;