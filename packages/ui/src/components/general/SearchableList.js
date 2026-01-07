import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * SearchableList - Reusable search + list component
 * 
 * @param {Array} data - Array of items to search/display
 * @param {Array} searchKeys - Keys to search in (e.g., ['name', 'category'])
 * @param {String} placeholder - Search input placeholder
 * @param {Function} renderItem - Custom item renderer (item, isSelected, onToggle)
 * @param {Function} onItemToggle - Called when item is toggled
 * @param {Array} selectedItems - Array of selected item IDs
 * @param {String} keyExtractor - Function to extract unique key from item
 * @param {String} emptyText - Text to show when no results
 * @param {Function} getItemCategory - Optional function to get category for grouping
 * @param {Boolean} showCategories - Show category labels in results (default: false)
 */
const SearchableList = ({
  data = [],
  searchKeys = ['name'],
  placeholder = 'Search...',
  renderItem,
  onItemToggle,
  selectedItems = [],
  keyExtractor = (item) => item.id,
  emptyText = 'No results found',
  getItemCategory,
  showCategories = false,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    
    return data.filter(item => {
      return searchKeys.some(key => {
        const value = item[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [data, searchQuery, searchKeys]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.sm,
      marginBottom: getSpacing.md,
    },
    searchIcon: {
      marginRight: getSpacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: getTypography.body.fontSize,
      color: theme.text.primary,
      padding: 0,
    },
    clearButton: {
      padding: getSpacing.xs,
      marginLeft: getSpacing.sm,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSpacing.sm,
      paddingHorizontal: getSpacing.sm,
    },
    resultsTitle: {
      fontSize: getTypography.bodySmall.fontSize,
      fontWeight: '600',
      color: theme.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    resultsCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
    },
    listContainer: {
      flex: 1,
    },
    itemContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
    categoryLabel: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.tertiary,
      textTransform: 'capitalize',
      paddingHorizontal: getSpacing.md,
      paddingVertical: getSpacing.xs,
      backgroundColor: theme.background,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.xl,
    },
    emptyIcon: {
      marginBottom: getSpacing.md,
    },
    emptyText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.secondary,
      textAlign: 'center',
    },
    promptContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: getSpacing.xl,
    },
    promptIcon: {
      marginBottom: getSpacing.md,
    },
    promptText: {
      fontSize: getTypography.body.fontSize,
      color: theme.text.tertiary,
      textAlign: 'center',
    },
  });

  const handleClear = () => {
    setSearchQuery('');
  };

  const renderListItem = ({ item, index }) => {
    const itemKey = keyExtractor(item);
    const isSelected = selectedItems.includes(itemKey);
    const isLast = index === filteredData.length - 1;

    return (
      <View style={[styles.itemContainer, isLast && styles.lastItem]}>
        {renderItem(item, isSelected, () => onItemToggle(itemKey))}
      </View>
    );
  };

  // Show prompt when no search query
  if (!searchQuery.trim()) {
    return (
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
            placeholderTextColor={theme.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.promptContainer}>
          <Ionicons
            name="search-outline"
            size={48}
            color={theme.text.tertiary}
            style={styles.promptIcon}
          />
          <Text style={styles.promptText}>
            Type to search {placeholder.toLowerCase().replace('search ', '')}
          </Text>
        </View>
      </View>
    );
  }

  // Show results or empty state
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={theme.text.tertiary}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Ionicons
            name="close-circle"
            size={20}
            color={theme.text.tertiary}
            style={styles.clearButton}
            onPress={handleClear}
          />
        )}
      </View>

      {filteredData.length > 0 ? (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Search Results</Text>
            <Text style={styles.resultsCount}>
              {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
            </Text>
          </View>

          <FlatList
            data={filteredData}
            renderItem={renderListItem}
            keyExtractor={keyExtractor}
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={48}
            color={theme.text.tertiary}
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
};

export default SearchableList;