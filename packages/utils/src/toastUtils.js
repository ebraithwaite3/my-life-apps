import Toast from 'react-native-toast-message';

/**
 * Show success toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2000
 */
export const showSuccessToast = (title, message = '', duration = 2000) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: duration,
  });
};

/**
 * Show error toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 3000
 */
export const showErrorToast = (title, message = '', duration = 3000) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: duration,
  });
};

/**
 * Show warning toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2500
 */
export const showWarningToast = (title, message = '', duration = 2500) => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: duration,
  });
};

/**
 * Show info toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2000
 */
export const showInfoToast = (title, message = '', duration = 2000) => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: duration,
  });
};