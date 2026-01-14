import Toast from 'react-native-toast-message';

/**
 * Show success toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2000
 * @param {string} position - 'top' or 'bottom', default 'bottom'
 */
export const showSuccessToast = (title, message = '', duration = 2000, position = 'bottom') => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    position: position,
    visibilityTime: duration,
  });
};

/**
 * Show error toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 3000
 * @param {string} position - 'top' or 'bottom', default 'bottom'
 */
export const showErrorToast = (title, message = '', duration = 3000, position = 'bottom') => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    position: position,
    visibilityTime: duration,
  });
};

/**
 * Show warning toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2500
 * @param {string} position - 'top' or 'bottom', default 'bottom'
 */
export const showWarningToast = (title, message = '', duration = 2500, position = 'bottom') => {
  Toast.show({
    type: 'warning',
    text1: title,
    text2: message,
    position: position,
    visibilityTime: duration,
  });
};

/**
 * Show info toast
 * @param {string} title - Main message
 * @param {string} message - Secondary message (optional)
 * @param {number} duration - How long to show (ms), default 2000
 * @param {string} position - 'top' or 'bottom', default 'bottom'
 */
export const showInfoToast = (title, message = '', duration = 2000, position = 'bottom') => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    position: position,
    visibilityTime: duration,
  });
};