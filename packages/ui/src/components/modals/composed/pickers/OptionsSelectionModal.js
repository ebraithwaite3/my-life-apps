import React from 'react';
import PopUpModalWrapper from '../../base/PopUpModalWrapper';
import ModalHeader from '../../../headers/ModalHeader';
import OptionsListContent from '../../content/OptionsListContent';

/**
 * OptionsSelectionModal - Modal for selecting from a list of options
 * Selection auto-closes the modal, Cancel closes without selecting
 */
const OptionsSelectionModal = ({ 
  visible, 
  title = "Select Option",
  options = [], 
  onSelect, 
  onClose,
  emptyMessage = "No options available",
}) => {
  const handleSelect = (item) => {
    onSelect(item);
    onClose();
  };

  return (
    <PopUpModalWrapper 
      visible={visible} 
      onClose={onClose}
      width="99%"
      maxHeight="70%"
    >
      <ModalHeader
        title={title}
        onCancel={onClose}
        showDone={false}  // ← Hide Done button - selection closes modal
      />
      
      <OptionsListContent 
        options={options}
        onSelect={handleSelect}
        emptyMessage={emptyMessage}
      />
    </PopUpModalWrapper>
  );
};

export default OptionsSelectionModal;