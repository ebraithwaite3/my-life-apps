import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@my-apps/contexts';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { app } from '@my-apps/config';
import { useAuth } from '@my-apps/contexts';

const DashboardScreen = () => {
  const { theme, getSpacing, getTypography } = useTheme();
  const [setupStatus, setSetupStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [functions, setFunctions] = useState(null);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const initFunctions = () => {
      try {
        const functionsInstance = getFunctions(app);

        // --- ⚙️ DEV/PROD Logic Integration ---
        if (__DEV__) {
          let emulatorHost;
          if (Platform.OS === 'android') {
            emulatorHost = '10.0.2.2';
          } else {
            emulatorHost = '10.0.0.178'; // ← your dev machine IP
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

  const testSetup = async () => {
    if (!functions) {
      setError('Functions not initialized');
      return;
    }

    try {
      setLoading(true);
      const testScheduleSetup = httpsCallable(functions, 'testScheduleSetup');
      const result = await testScheduleSetup();
      console.log('Setup result:', result.data);
      setSetupStatus(result.data);
    } catch (error) {
      console.error('Test failed:', error);
      setSetupStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateSchedules = async () => {
    if (!functions) {
      setError('Functions not initialized');
      return;
    }
  
    try {
      setLoading(true);
      console.log('🚀 Starting manual schedule update...');
      
      const manualUpdateSchedules = httpsCallable(functions, 'manualUpdateSchedules');
      const result = await manualUpdateSchedules();
      
      console.log('✅ Update result:', JSON.stringify(result.data, null, 2));
      
      // Check if any sports actually updated
      const results = result.data.results;
      const successCount = Object.values(results).filter(r => r.status === 'success').length;
      const errorCount = Object.values(results).filter(r => r.status === 'error').length;
      
      alert(
        `Update Complete!\n\n` +
        `✅ Success: ${successCount}\n` +
        `❌ Errors: ${errorCount}\n` +
        `⏭️ Skipped: ${Object.keys(results).length - successCount - errorCount}`
      );
      
      setSetupStatus(result.data);
    } catch (error) {
      console.error('❌ Update failed:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      alert(`Error: ${error.message}\n\nCode: ${error.code}\n\nCheck console for details`);
      setError(error.message);
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
      marginBottom: getSpacing.lg,
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
      color: '#fff',
    },
    resultBox: {
      backgroundColor: theme.surface,
      padding: getSpacing.md,
      borderRadius: 8,
      marginTop: getSpacing.md,
    },
    resultText: {
      ...getTypography.body,
      color: theme.text.primary,
    },
    environmentBadge: {
      ...getTypography.caption,
      color: __DEV__ ? '#FFA500' : '#00FF00',
      backgroundColor: __DEV__ ? 'rgba(255, 165, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
      padding: getSpacing.sm,
      borderRadius: 4,
      marginBottom: getSpacing.lg,
      textAlign: 'center',
    },
    errorText: {
      ...getTypography.body,
      color: theme.error || '#FF0000',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🏠 Dashboard</Text>
        <Text style={styles.subtitle}>Schedule Management</Text>

        {/* Environment Badge Display */}
        <Text style={styles.environmentBadge}>
          {__DEV__ ? '🔧 DEV MODE - Using Emulator' : '🚀 PRODUCTION - Using Live Functions'}
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={testSetup}
          disabled={loading || !functions}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {functions ? 'Test Setup' : 'Not Ready...'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button}
          onPress={updateSchedules}
          disabled={loading || !functions}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {functions ? 'Update Schedules' : 'Not Ready...'}
            </Text>
          )}
        </TouchableOpacity>

        {setupStatus && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>
              {setupStatus.success ? '✅ Setup OK' : '❌ Setup Failed'}
            </Text>
            <Text style={styles.resultText}>
              {setupStatus.message}
            </Text>
            {setupStatus.enabledSports && (
              <Text style={styles.resultText}>
                Enabled: {setupStatus.enabledSports.join(', ')}
              </Text>
            )}
          </View>
        )}

        {error && (
          <View style={styles.resultBox}>
            <Text style={styles.errorText}>❌ Error: {error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
