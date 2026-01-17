import { useState, useCallback } from 'react';
import * as Crypto from 'expo-crypto';

export const useChecklistItems = (initialItems = [], isTemplate = false) => {
  const uuidv4 = () => Crypto.randomUUID();
  
  const [items, setItems] = useState(initialItems);
  const [focusedItemId, setFocusedItemId] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);

  /* ---------------- Helper: Flatten items for rendering ---------------- */
  const flattenItemsForRendering = useCallback(() => {
    const flattened = [];
    items.forEach((item) => {
      flattened.push({ ...item, isSubItem: false });
      
      if (item.subItems && item.subItems.length > 0) {
        item.subItems.forEach((subItem) => {
          flattened.push({ ...subItem, isSubItem: true, parentId: item.id });
        });
      }
    });
    return flattened;
  }, [items]);

  /* ---------------- Helper: Get focused item info ---------------- */
  const getFocusedItemInfo = useCallback(() => {
    if (!focusedItemId) return null;
    
    const parentItem = items.find(item => item.id === focusedItemId);
    if (parentItem) {
      return { item: parentItem, isSubItem: false };
    }
    
    for (const parent of items) {
      if (parent.subItems) {
        const subItem = parent.subItems.find(sub => sub.id === focusedItemId);
        if (subItem) {
          return { item: subItem, isSubItem: true, parentId: parent.id };
        }
      }
    }
    
    return null;
  }, [focusedItemId, items]);

  /* ---------------- Update Item ---------------- */
  const updateItem = useCallback((id, name, isSubItem = false, parentId = null) => {
    if (isSubItem && parentId) {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === parentId) {
            return {
              ...item,
              subItems: item.subItems.map((sub) =>
                sub.id === id ? { ...sub, name } : sub
              ),
            };
          }
          return item;
        })
      );
    } else {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, name } : item))
      );
    }
  }, []);

  /* ---------------- Add Item at Position ---------------- */
  const addItemAtPosition = useCallback((afterItemId = null, focusCallback = null) => {
    const id = uuidv4();
    const newItem = { 
      id, 
      name: "", 
      completed: false, 
      itemType: "checkbox", 
      subItems: [] 
    };

    setItems((prev) => {
      if (afterItemId === null) {
        return [...prev, newItem];
      }
      
      const index = prev.findIndex((item) => item.id === afterItemId);
      if (index === -1) {
        return [...prev, newItem];
      }
      
      const newItems = [...prev];
      newItems.splice(index + 1, 0, newItem);
      return newItems;
    });

    if (focusCallback) {
      setTimeout(() => focusCallback(id), 100);
    }

    return id;
  }, [uuidv4]);

  /* ---------------- Add Item ---------------- */
  const addItem = useCallback((focusCallback = null) => {
    return addItemAtPosition(null, focusCallback);
  }, [addItemAtPosition]);

  /* ---------------- Remove Item ---------------- */
  const removeItem = useCallback(
    (id, isSubItem = false, parentId = null) => {
      if (isSubItem && parentId) {
        setItems((prev) =>
          prev.map((item) => {
            if (item.id === parentId) {
              const updatedSubItems = item.subItems.filter((sub) => sub.id !== id);
              return { ...item, subItems: updatedSubItems };
            }
            return item;
          })
        );
      } else {
        if (items.length <= 1) {
          updateItem(id, "");
          return;
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    },
    [items.length, updateItem]
  );

  /* ---------------- Add Sub-Item ---------------- */
  const addSubItem = useCallback((parentId, focusCallback = null) => {
    const subItemId = uuidv4();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === parentId) {
          return {
            ...item,
            subItems: [
              ...(item.subItems || []),
              {
                id: subItemId,
                name: "",
                itemType: "checkbox",
                parentId: parentId,
              },
            ],
          };
        }
        return item;
      })
    );

    if (focusCallback) {
      setTimeout(() => focusCallback(subItemId), 100);
    }
    
    return subItemId;
  }, [uuidv4]);

  /* ---------------- Handle Blur ---------------- */
  const handleBlur = useCallback(
    (id, isSubItem = false, parentId = null) => {
      setFocusedItemId(null);
      
      const flattened = flattenItemsForRendering();
      const item = flattened.find((i) => i.id === id);
      
      if (item && !item.name.trim()) {
        if (isSubItem) {
          return;
        } else if (items.length > 1) {
          removeItem(id);
        }
      }
    },
    [items, flattenItemsForRendering, removeItem]
  );

  /* ---------------- Handle Submit Editing ---------------- */
  const handleSubmitEditing = useCallback(
    (currentId, isSubItem = false, parentId = null, focusCallback = null) => {
      const flattened = flattenItemsForRendering();
      const index = flattened.findIndex((i) => i.id === currentId);
      const item = flattened[index];
  
      if (isSubItem) {
        if (!item.name.trim()) {
          removeItem(currentId, true, parentId);
          const newId = addItemAtPosition(parentId, focusCallback);
          setPendingScrollId(newId);
          return;
        } else {
          addSubItem(parentId, focusCallback);
        }
      } else {
        const next = flattened[index + 1];
        
        if (!item.name.trim()) {
          if (next && focusCallback) {
            focusCallback(next.id);
          } else {
            addItemAtPosition(currentId, focusCallback);
          }
          return;
        }
  
        if (next && focusCallback) {
          focusCallback(next.id);
        } else {
          addItemAtPosition(currentId, focusCallback);
        }
      }
    },
    [items, flattenItemsForRendering, addItemAtPosition, addSubItem, removeItem]
  );

  /* ---------------- Handle Focus ---------------- */
  const handleFocus = useCallback((id, scrollCallback = null) => {
    setFocusedItemId(id);
    if (scrollCallback) {
      scrollCallback(id);
    }
  }, []);

  /* ---------------- Update Item Config ---------------- */
  const updateItemConfig = useCallback((updatedItem) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  }, []);

  return {
    items,
    setItems,
    focusedItemId,
    setFocusedItemId,
    pendingScrollId,
    setPendingScrollId,
    flattenItemsForRendering,
    getFocusedItemInfo,
    updateItem,
    addItem,
    addItemAtPosition,
    removeItem,
    addSubItem,
    handleBlur,
    handleSubmitEditing,
    handleFocus,
    updateItemConfig,
  };
};