import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NotificationBanner = ({ notification, onPress, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      dismissBanner();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    dismissBanner();
    if (onPress) {
      onPress(notification);
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="notifications" size={24} color="#fff" />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.request.content.title || 'Notification'}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.request.content.body || ''}
          </Text>
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 50, // Account for status bar
    paddingHorizontal: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2', // Blue background
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  body: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default NotificationBanner;