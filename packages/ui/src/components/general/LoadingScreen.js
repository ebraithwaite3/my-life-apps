import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@my-apps/contexts';

const LoadingScreen = ({ 
  message = 'Loading...', 
  icon = '📅',  // Can be emoji string or image source
  iconSize = 48  // Size for both emoji and image
}) => {
  const { theme } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const spinInterpolate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Check if icon is an image source or emoji string
  const isImage = typeof icon === 'number' || (typeof icon === 'object' && icon?.uri);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View 
        style={[
          styles.iconContainer,
          { transform: [{ rotate: spinInterpolate }] }
        ]}
      >
        {isImage ? (
          <Image 
            source={icon} 
            style={{ width: iconSize, height: iconSize }}
            resizeMode="contain"
          />
        ) : (
          <Text style={[styles.icon, { fontSize: iconSize }]}>{icon}</Text>
        )}
      </Animated.View>
      <Text style={[styles.loadingText, { color: theme.text.primary }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  loadingText: {
    fontSize: 20,
    fontWeight: '600',
  },
});

export default LoadingScreen;