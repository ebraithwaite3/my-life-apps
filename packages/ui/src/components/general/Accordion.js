import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';

/**
 * Accordion - Reusable collapsible sections component
 * 
 * @param {Array} sections - Array of section objects
 * @param {Function} renderHeader - Custom header renderer (section, isExpanded, selectedCount)
 * @param {Function} renderSectionHeader - Optional header for section content (section)
 * @param {Function} renderItem - Custom item renderer (item, itemIndex, section) OR (item, isSelected, onToggle) for selection mode
 * @param {Function} renderFooter - Optional footer for each section (section)
 * @param {Function} onItemToggle - Called when item is toggled (selection mode)
 * @param {Array} selectedItems - Array of selected item IDs (selection mode)
 * @param {String} keyExtractor - Function to extract unique key from item
 * @param {Boolean} multiSelect - Allow multiple selections (default: true)
 * @param {Boolean} defaultExpandFirst - Expand first section by default (default: false)
 */
const Accordion = ({
  sections = [],
  renderHeader,
  renderSectionHeader,
  renderItem,
  renderFooter,
  onItemToggle,
  selectedItems = [],
  keyExtractor = (item) => item.id,
  multiSelect = true,
  defaultExpandFirst = false,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  
  // Determine if we're in selection mode
  const isSelectionMode = !!onItemToggle;
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState(
    defaultExpandFirst ? [sections[0]?.id] : []
  );

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isSectionExpanded = (sectionId) => {
    return expandedSections.includes(sectionId);
  };

  const getSelectedCountInSection = (section) => {
    if (!isSelectionMode) return 0;
    return section.data.filter(item => 
      selectedItems.includes(keyExtractor(item))
    ).length;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    sectionContainer: {
      marginBottom: getSpacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: getSpacing.md,
      backgroundColor: theme.surface,
      borderRadius: getBorderRadius.md,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionHeaderWithSelected: {
      backgroundColor: `${theme.primary}08`,
      borderColor: theme.primary,
    },
    sectionHeaderContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.sm,
    },
    sectionTitle: {
      fontSize: getTypography.body.fontSize,
      fontWeight: '600',
      color: theme.text.primary,
      textTransform: 'capitalize',
    },
    sectionCount: {
      fontSize: getTypography.bodySmall.fontSize,
      color: theme.text.secondary,
    },
    sectionCountSelected: {
      color: theme.primary,
      fontWeight: '600',
    },
    sectionIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    chevronIcon: {
      marginLeft: getSpacing.sm,
    },
    sectionContent: {
      marginTop: getSpacing.sm,
      backgroundColor: theme.background,
      borderRadius: getBorderRadius.md,
      overflow: 'hidden',
    },
    itemContainer: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    lastItem: {
      borderBottomWidth: 0,
    },
  });

  // Default header renderer (for selection mode)
  const defaultRenderHeader = (section, isExpanded, selectedCount) => {
    const hasSelected = selectedCount > 0;
    
    return (
      <View style={styles.sectionHeaderContent}>
        {hasSelected && <View style={styles.sectionIndicator} />}
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={[
          styles.sectionCount,
          hasSelected && styles.sectionCountSelected
        ]}>
          ({selectedCount}/{section.data.length})
        </Text>
      </View>
    );
  };

  const headerRenderer = renderHeader || (isSelectionMode ? defaultRenderHeader : null);

  return (
    <View style={styles.container}>
      {sections.map((section, sectionIndex) => {
        const isExpanded = isSectionExpanded(section.id);
        const selectedCount = getSelectedCountInSection(section);
        const hasSelected = selectedCount > 0;

        return (
          <View key={section.id} style={styles.sectionContainer}>
            {/* Section Header */}
            <TouchableOpacity
              style={[
                styles.sectionHeader,
                isSelectionMode && hasSelected && styles.sectionHeaderWithSelected,
              ]}
              onPress={() => toggleSection(section.id)}
              activeOpacity={0.7}
            >
              {headerRenderer ? (
                headerRenderer(section, isExpanded, selectedCount)
              ) : (
                <Text style={styles.sectionTitle}>{section.title}</Text>
              )}
              
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.text.secondary}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>

            {/* Section Content */}
            {isExpanded && (
              <View style={styles.sectionContent}>
                {/* Optional Section Header (like column headers) */}
                {renderSectionHeader && renderSectionHeader(section)}
                
                {/* Items */}
                {section.data.map((item, itemIndex) => {
                  const itemKey = keyExtractor(item);
                  const isSelected = selectedItems.includes(itemKey);
                  const isLast = itemIndex === section.data.length - 1;

                  return (
                    <View
                      key={itemKey}
                      style={[
                        styles.itemContainer,
                        isLast && !renderFooter && styles.lastItem,
                      ]}
                    >
                      {isSelectionMode
                        ? renderItem(item, isSelected, () => onItemToggle(itemKey))
                        : renderItem(item, itemIndex, section)
                      }
                    </View>
                  );
                })}
                
                {/* Optional Footer (like Add Set button) */}
                {renderFooter && renderFooter(section)}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

export default Accordion;