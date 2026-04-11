import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@my-apps/contexts';
import { ModalHeader } from '../../../headers';
import PopUpModalWrapper from '../../base/PopUpModalWrapper';

const GuidedWorkflowSetupModal = ({
  visible,
  quantityLabel,
  onConfirm,
  onCancel,
}) => {
  const { theme, getSpacing, getTypography, getBorderRadius } = useTheme();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (visible) {
      setQuantity(1);
    }
  }, [visible]);

  const handleConfirm = () => {
    onConfirm(quantity);
  };

  const styles = StyleSheet.create({
    content: {
      padding: getSpacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    label: {
      fontSize: getTypography.title?.fontSize || 18,
      fontWeight: '600',
      color: theme.text.primary,
      marginBottom: getSpacing.xl,
      textAlign: 'center',
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: getSpacing.xl,
    },
    counterButton: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterButtonDisabled: {
      backgroundColor: theme.primary + '40',
    },
    counterValue: {
      fontSize: 48,
      fontWeight: '700',
      color: theme.text.primary,
      minWidth: 70,
      textAlign: 'center',
    },
  });

  return (
    <PopUpModalWrapper
      visible={visible}
      onClose={onCancel}
      maxHeight="40%"
    >
      <View style={{ height: '100%' }}>
        <ModalHeader
          title={quantityLabel || 'How many?'}
          onCancel={onCancel}
          onDone={handleConfirm}
          doneText="Start"
        />

        <View style={styles.content}>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={[
                styles.counterButton,
                quantity <= 1 && styles.counterButtonDisabled,
              ]}
              onPress={() => setQuantity(q => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={28} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.counterValue}>{quantity}</Text>

            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => setQuantity(q => q + 1)}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </PopUpModalWrapper>
  );
};

export default GuidedWorkflowSetupModal;
