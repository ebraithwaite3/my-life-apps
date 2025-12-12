import React from 'react';
import { Modal, View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

/**
 * ModalWrapper - A simple modal container that can display different screens
 * 
 * Usage:
 * <ModalWrapper visible={isVisible} onClose={handleClose} currentScreen={screenName}>
 *   {currentScreen === 'main' && <MainContent />}
 *   {currentScreen === 'nested' && <NestedContent />}
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
    </Modal>
  );
};

export default ModalWrapper;