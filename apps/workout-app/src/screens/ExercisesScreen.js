import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ExercisesScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🏋️</Text>
      <Text style={styles.title}>All Exercises</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default ExercisesScreen;