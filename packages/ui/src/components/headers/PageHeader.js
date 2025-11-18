import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { ModalDropdown } from '../dropdowns/index';

const PageHeader = ({ 
  navigation, 
  showBackButton,
  backButtonText,      // ← New prop
  onBackPress,         // ← New prop
  showNavArrows, 
  onPreviousPress, 
  onNextPress, 
  title, 
  subtext,
  icons = []
}) => {
  const { theme } = useTheme();
  const [openDropdown, setOpenDropdown] = useState(null);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const ellipsisRef = useRef(null);
  console.log("Back Button Text:", backButtonText);

  // const icons = [
  //   { icon: 'add', action: () => console.log('Add pressed') },
  //   {
  //     icon: 'ellipsis-vertical',
  //     options: [
  //       { label: 'Add Event With Really Long Name', action: () => console.log('Add Event') },
  //       { label: 'Add Task', action: () => console.log('Add Task') },
  //       { label: 'Add Note', action: () => console.log('Add Note') },
  //     ],
  //   },
  // ];

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation?.goBack?.();
    }
  };

  const handleIconPress = (index, iconItem) => {
    if (iconItem.options) {
      if (index === 1 && ellipsisRef.current) {
        ellipsisRef.current.measureInWindow((x, y, width, height) => {
          setAnchorPosition({ x, y, width, height });
          setOpenDropdown(openDropdown === index ? null : index);
        });
      } else {
        setOpenDropdown(openDropdown === index ? null : index);
      }
    } else {
      iconItem.action?.();
    }
  };

  const handleDropdownSelect = (option) => {
    setOpenDropdown(null);
    option.action?.();
  };

  const isCentered = showBackButton || showNavArrows;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {/* TOP ROW */}
      <View style={styles.topRow}>
        {/* LEFT */}
        {showBackButton ? (
          <TouchableOpacity 
            onPress={handleBackPress} 
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text.primary} />
            {backButtonText && (
              <Text style={[styles.backButtonText, { color: theme.text.primary }]}>
                {backButtonText}
              </Text>
            )}
          </TouchableOpacity>
        ) : isCentered ? (
          <View style={styles.iconButton} /> 
        ) : null}

        {/* TITLE */}
        <View style={[styles.titleWrapper, isCentered && styles.centeredTitleWrapper]}>
          {showNavArrows && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onPreviousPress}
            >
              <Ionicons name="chevron-back" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.text.primary }]} numberOfLines={1}>
            {title}
          </Text>
          {showNavArrows && (
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onNextPress}
            >
              <Ionicons name="chevron-forward" size={22} color={theme.text.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* RIGHT */}
        <View style={styles.iconRow}>
          {icons.map((iconItem, index) => (
            <TouchableOpacity
              key={index}
              ref={index === 1 ? ellipsisRef : null}
              onPress={() => handleIconPress(index, iconItem)}
              style={styles.iconButton}
            >
              <Ionicons name={iconItem.icon} size={22} color={theme.text.primary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* SUBTITLE */}
      {subtext && (
        <View 
          style={[
            styles.subRow, 
            isCentered && { 
              justifyContent: 'center',
              alignItems: 'center'
            }
          ]}
        >
          <Text
            style={[styles.subtext, { color: theme.text.secondary }]}
            numberOfLines={1}
          >
            {subtext}
          </Text>
        </View>
      )}

      {/* DROPDOWN */}
      <ModalDropdown
        visible={openDropdown !== null}
        options={openDropdown !== null ? icons[openDropdown]?.options : []}
        onClose={() => setOpenDropdown(null)}
        onSelect={handleDropdownSelect}
        anchorPosition={anchorPosition}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: '#222',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  centeredTitleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  subRow: {
    marginTop: 4,
    flexDirection: 'row',
  },
  subtext: {
    fontSize: 14,
  },
});

export default PageHeader;