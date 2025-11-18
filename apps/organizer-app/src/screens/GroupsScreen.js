import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';
import { useAuth } from '@my-apps/contexts';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '@my-apps/config';

const GroupsScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useAuth(); // <--- Keep real user
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [functions, setFunctions] = useState(null);
  const [note, setNote] = useState('');

  // NOTE: This will be used as the userId for the function call
  const currentUserId = user?.uid || 'anonymous-user'; 

  useEffect(() => {
    const initFunctions = () => {
      try {
        const functionsInstance = getFunctions(app);
        
        // --- ⚙️ DEV/PROD Logic Integration ---
        if (__DEV__) {
          // Determine emulator host based on platform for React Native
          let emulatorHost;
          if (Platform.OS === 'android') {
            // Android emulator loopback address
            emulatorHost = '10.0.2.2'; 
          } else {
            // iOS simulator/device or physical Android/development computer IP
            emulatorHost = '10.0.0.178'; 
          }
          
          console.log(`🔧 [DEV] Connecting to Functions emulator at ${emulatorHost}:5001`);
          connectFunctionsEmulator(functionsInstance, emulatorHost, 5001);
        } else {
          console.log('🚀 [PRODUCTION] Using live Firebase Functions');
        }
        // --- End DEV/PROD Logic ---
        
        setFunctions(functionsInstance);
        console.log('✅ Functions initialized');
      } catch (err) {
        console.error('❌ Functions setup error:', err);
        setError('Functions setup failed: ' + err.message);
      }
    };

    initFunctions();
  }, []);

  const saveNote = async () => {
    if (!functions) {
      console.error('Functions not initialized');
      setError('Functions not initialized');
      return;
    }
    
    // Check for user presence only if not in DEV mode,
    // or if you want to enforce a real user for a production-like test
    if (!user && !__DEV__) { 
        console.error('User not logged in in PRODUCTION');
        setError('User not logged in');
        return;
    }

    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`📝 Saving note for user ID: ${currentUserId}`);
      const saveUserNote = httpsCallable(functions, 'saveUserNote');
      const result = await saveUserNote({ 
        // Use the authenticated user's ID or the fallback ID
        userId: currentUserId, 
        note: note.trim()
      });
      
      console.log('✅ Note saved:', result.data);
      setResponse(result.data);
      setNote(''); // Clear input after success
    } catch (err) {
      console.error('❌ Error saving note:', err);
      setError(`${err.code}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: getSpacing.lg,
    },
    title: {
      ...getTypography.h1,
      color: theme.text.primary,
      marginBottom: getSpacing.md,
    },
    subtitle: {
      ...getTypography.body,
      color: theme.text.secondary,
      marginBottom: getSpacing.md,
    },
    // Added Environment Badge Style
    environmentBadge: {
      ...getTypography.caption,
      color: __DEV__ ? '#FFA500' : '#00FF00',
      backgroundColor: __DEV__ ? 'rgba(255, 165, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
      padding: getSpacing.sm,
      borderRadius: 4,
      marginBottom: getSpacing.lg,
      textAlign: 'center',
    },
    input: {
      ...getTypography.body,
      backgroundColor: theme.surface,
      color: theme.text.primary,
      padding: getSpacing.md,
      borderRadius: 8,
      marginBottom: getSpacing.md,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    button: {
      backgroundColor: theme.primary,
      padding: getSpacing.md,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: getSpacing.md,
    },
    buttonText: {
      ...getTypography.button,
      color: '#FFFFFF',
    },
    responseBox: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: 8,
      marginTop: getSpacing.md,
    },
    responseText: {
      ...getTypography.body,
      color: theme.text.primary,
      marginBottom: getSpacing.sm,
    },
    errorText: {
      ...getTypography.body,
      color: theme.error || '#FF0000',
    },
    userInfo: {
      ...getTypography.caption,
      color: theme.text.secondary,
      marginBottom: getSpacing.lg,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>👥 Groups</Text>
        <Text style={styles.subtitle}>
          Testing Full Stack: Functions → Firestore
        </Text>
        
        {/* Environment Badge Display */}
        <Text style={styles.environmentBadge}>
          {__DEV__ ? '🔧 DEV MODE - Using Emulator' : '🚀 PRODUCTION - Using Live Functions'}
        </Text>

        {/* User Info Display */}
        <Text style={styles.userInfo}>
          User ID: **{currentUserId}** ({user ? 'Authenticated' : 'Fallback'})
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter a test note..."
          placeholderTextColor={theme.text.secondary}
          value={note}
          onChangeText={setNote}
          multiline
          editable={!loading}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={saveNote}
          disabled={loading || !functions || (!user && !__DEV__)} // Disable if not ready/authenticated
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {functions ? 'Save Note to Firestore' : 'Not Ready...'}
            </Text>
          )}
        </TouchableOpacity>

        {response && (
          <View style={styles.responseBox}>
            <Text style={styles.responseText}>
              ✅ {response.message}
            </Text>
            <Text style={styles.responseText}>
              Saved at: {new Date(response.timestamp).toLocaleString()}
            </Text>
          </View>
        )}

        {error && (
          <View style={styles.responseBox}>
            <Text style={styles.errorText}>
              ❌ Error: {error}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default GroupsScreen;