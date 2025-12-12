import React from 'react';
import { MessagesScreen as BaseMessagesScreen } from '@my-apps/screens';
import { useData } from '@my-apps/contexts';
import { useMessageActions } from '@my-apps/hooks';

const MessagesScreen = ({ navigation }) => {
  const dataContext = useData();
  const messageActions = useMessageActions();
  
  // Handle navigation for messages in Organizer app
  const handleMessageNavigation = (navigationInfo) => {
    if (!navigationInfo || !navigationInfo.screen) {
      console.warn('No navigation info provided');
      return;
    }

    const { screen, params } = navigationInfo;

    switch (screen) {
      case 'Groups':
        navigation.navigate('Groups', {
          screen: 'GroupsHome',
          params: params,
        });
        break;

      case 'Calendar':
        const targetDate = params?.params?.date || params?.date;
        const targetView = params?.screen === 'DayScreen' ? 'day' : 'month';

        if (targetDate) {
          navigation.navigate('Calendar', {
            screen: 'CalendarHome',
            params: {
              date: targetDate,
              view: targetView,
            },
          });
        } else {
          navigation.navigate('Calendar', { screen: 'CalendarHome' });
        }
        break;

      case 'Grocery':
        navigation.navigate('Grocery', {
          screen: params?.screen || 'GroceryHome',
          params: params?.params,
        });
        break;

      case 'Preferences':
        navigation.navigate('Preferences', {
          screen: 'PreferencesHome',
          params: params,
        });
        break;

      case 'Today':
        navigation.navigate('Today', {
          screen: 'TodayHome',
          params: params,
        });
        break;

      default:
        console.warn('Unknown navigation screen:', screen);
    }
  };
  
  return (
    <BaseMessagesScreen
      navigation={navigation}
      dataContext={dataContext}
      messageActions={messageActions}
      currentApp="checklist-app"
      onMessageNavigation={handleMessageNavigation}
    />
  );
};

export default MessagesScreen;