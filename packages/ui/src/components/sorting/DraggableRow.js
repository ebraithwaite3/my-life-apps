import React, { useRef, useEffect } from "react";
import { Animated, PanResponder } from "react-native";

const DraggableRow = ({
  children,
  index,
  rowHeight,
  onMove,
  onDragStateChange,
  numItems,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const currentIndex = useRef(index);
  const previousDy = useRef(0);
  const effectiveTranslateRef = useRef(0);

  useEffect(() => {
    currentIndex.current = index;
  }, [index]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        onDragStateChange(true);
        translateY.setValue(0);
        previousDy.current = 0;
        effectiveTranslateRef.current = 0;
      },

      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dy - previousDy.current;
        effectiveTranslateRef.current += delta;
        translateY.setValue(effectiveTranslateRef.current);
        previousDy.current = gesture.dy;

        const distance = effectiveTranslateRef.current;
        const direction = distance > 0 ? 1 : -1;

        if (Math.abs(distance) > rowHeight * 0.75) {
          const newIndex = currentIndex.current + direction;

          if (newIndex >= 0 && newIndex < numItems) {
            onMove(currentIndex.current, newIndex);
            currentIndex.current = newIndex;

            effectiveTranslateRef.current -= direction * rowHeight;
            translateY.setValue(effectiveTranslateRef.current);
          }
        }
      },

      onPanResponderRelease: () => {
        onDragStateChange(false);
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 12,
        }).start();
      },

      onPanResponderTerminate: () => {
        onDragStateChange(false);
        translateY.setValue(0);
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        zIndex: 100,
      }}
    >
      {typeof children === "function"
        ? children({ panHandlers: panResponder.panHandlers })
        : children}
    </Animated.View>
  );
};

export default DraggableRow;
