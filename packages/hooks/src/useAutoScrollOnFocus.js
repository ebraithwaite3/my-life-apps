// useAutoScrollOnFocus.ts
import { useCallback, useRef, useState, useEffect } from "react";
import { Keyboard } from "react-native";

export function useAutoScrollOnFocus({ offset = 80 } = {}) {
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height
  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const registerInput = useCallback((id, ref) => {
    if (ref) inputRefs.current[id] = ref;
  }, []);

  const scrollToInput = useCallback(
    (id) => {
      const input = inputRefs.current[id];
      const scrollView = scrollViewRef.current;
      if (!input || !scrollView) return;

      requestAnimationFrame(() => {
        input.measureLayout(
          scrollView,
          (_x, y) => {
            // Add keyboard height to offset for better positioning
            const totalOffset = offset + keyboardHeight * 0.3;
            scrollView.scrollTo({
              y: Math.max(0, y - totalOffset),
              animated: true,
            });
          },
          () => {}
        );
      });
    },
    [offset, keyboardHeight]
  );

  const focusInput = useCallback((id) => {
    requestAnimationFrame(() => {
      inputRefs.current[id]?.focus?.();
    });
  }, []);

  // New: Scroll to end helper
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  return {
    scrollViewRef,
    registerInput,
    scrollToInput,
    focusInput,
    scrollToEnd, // Export this for adding items
  };
}