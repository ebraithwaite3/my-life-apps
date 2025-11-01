import React, { useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { Switch, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const AttendanceForm = ({ taskData, setTaskData, setErrors }) => {
  const { theme, getSpacing, getTypography } = useTheme();
  const { user } = useData();

  // Use a memoized object to hold the current attendance data from taskData
  const attendanceData = useMemo(() => taskData.attendanceData || {}, [taskData]);

  // Handler for each switch, updates the parent state
  const handleSwitchChange = useCallback((settingKey, value) => {
    setTaskData(prev => ({
      ...prev,
      attendanceData: {
        ...prev.attendanceData,
        settings: {
          ...prev.attendanceData?.settings,
          [settingKey]: value,
        },
      },
    }));
  }, [setTaskData]);

  // Handler for 'Mark me as going' to handle the 'responses' array
  const handleMarkMeAsGoing = useCallback((value) => {
    setTaskData(prev => {
      const currentResponses = prev.attendanceData?.responses || [];
      const myResponse = {
        userId: user?.userId,
        username: user?.username,
        response: "yes",
        timestamp: new Date().toISOString()
      };
      
      const newResponses = value
        ? [myResponse] // Add my response
        : currentResponses.filter(r => r.userId !== user?.userId); // Remove my response

      return {
        ...prev,
        attendanceData: {
          ...prev.attendanceData,
          responses: newResponses,
        },
      };
    });
  }, [setTaskData, user]);

  // Initialize form data when component mounts or a new task is selected
  useEffect(() => {
    setTaskData(prev => {
      const initialAttendanceData = prev.attendanceData || {
        responses: [],
        settings: {
          allowMaybeResponse: true,
          requireResponse: true,
          responseDeadline: null,
          allowLateResponses: true,
          notifyOnResponse: true,
          showResponseSummary: true,
          allowPlusOnes: false,
        },
      };

      // Set 'mark me as going' to true by default
      if (initialAttendanceData.responses.length === 0) {
        initialAttendanceData.responses.push({
          userId: user?.userId,
          username: user?.username,
          response: "yes",
          timestamp: new Date().toISOString()
        });
      }

      return {
        ...prev,
        attendanceData: initialAttendanceData,
      };
    });
  }, [setTaskData, user]);
  
  // Validation for attendance form
//   useEffect(() => {
//       setErrors([]); // No specific errors for attendance at this point
//   }, [taskData, setErrors]);

  return (
    <View style={{ marginBottom: getSpacing.lg }}>
      <Text style={{ 
        fontSize: getTypography.h4.fontSize,
        fontWeight: getTypography.h4.fontWeight,
        color: theme.text.primary,
        marginBottom: getSpacing.md,
      }}>
        Response Options
      </Text>
      
      <View style={{ 
        backgroundColor: theme.surface,
        borderRadius: 8,
        padding: getSpacing.md,
      }}>
        <View style={{ 
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: getSpacing.sm
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: getTypography.body.fontSize,
              fontWeight: '500',
              color: theme.text.primary 
            }}>
              Mark me as going
            </Text>
            <Text style={{ 
              fontSize: getTypography.bodySmall.fontSize,
              color: theme.text.secondary,
              marginTop: 2
            }}>
              Automatically add my "yes" response
            </Text>
          </View>
          <Switch
            value={attendanceData.responses?.some(r => r.userId === user?.userId)}
            onValueChange={handleMarkMeAsGoing}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={attendanceData.responses?.some(r => r.userId === user?.userId) ? 'white' : theme.text.secondary}
          />
        </View>

        <View style={{ 
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: getSpacing.sm
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: getTypography.body.fontSize,
              fontWeight: '500',
              color: theme.text.primary 
            }}>
              Allow "Maybe" responses
            </Text>
            <Text style={{ 
              fontSize: getTypography.bodySmall.fontSize,
              color: theme.text.secondary,
              marginTop: 2
            }}>
              Users can respond Yes, No, or Maybe
            </Text>
          </View>
          <Switch
            value={attendanceData.settings?.allowMaybeResponse}
            onValueChange={(value) => handleSwitchChange('allowMaybeResponse', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={attendanceData.settings?.allowMaybeResponse ? 'white' : theme.text.secondary}
          />
        </View>
        
        <View style={{ 
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ 
              fontSize: getTypography.body.fontSize,
              fontWeight: '500',
              color: theme.text.primary 
            }}>
              Allow plus-ones
            </Text>
            <Text style={{ 
              fontSize: getTypography.bodySmall.fontSize,
              color: theme.text.secondary,
              marginTop: 2
            }}>
              Users can bring additional guests
            </Text>
          </View>
          <Switch
            value={attendanceData.settings?.allowPlusOnes}
            onValueChange={(value) => handleSwitchChange('allowPlusOnes', value)}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={attendanceData.settings?.allowPlusOnes ? 'white' : theme.text.secondary}
          />
        </View>
      </View>
    </View>
  );
};

export default AttendanceForm;