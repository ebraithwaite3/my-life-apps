import React from 'react';
import { Modal } from 'react-native';
import Toast from 'react-native-toast-message';

/**
 * ModalWrapper - A simple modal container that can display different screens
 * 
 * Usage:
 * <ModalWrapper visible={isVisible} onClose={handleClose}>
 *   {children}
 * </ModalWrapper>
 */

const ModalWrapper = ({
  visible,
  onClose,
  children,
  animationType = 'slide',
  transparent = true,
}) => {
  return (
    <Modal
      animationType={animationType}
      transparent={transparent}
      visible={visible}
      onRequestClose={onClose}
    >
      {children}
      {/* Toast MUST be inside Modal to appear above modal content */}
      <Toast />
    </Modal>
  );
};

export default ModalWrapper;