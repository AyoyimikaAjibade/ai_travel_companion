// src/components/GradientBackground.js
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

/**
 * GradientBackground
 * - Defensive: if `colors` is not provided it falls back to a pleasant TWOS gradient.
 * - Accepts style and children.
 */
const DEFAULT_COLORS = ["#0EA5E9", "#7C3AED"]; // blue -> indigo

const GradientBackground = ({
  colors,
  style,
  children,
  expand = true,
  ...props
}) => {
  const safeColors =
    Array.isArray(colors) && colors.length > 0 ? colors : DEFAULT_COLORS;

  return (
    <LinearGradient
      // LinearGradient expects an array of colors — ensure it's always an array
      colors={safeColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[expand ? styles.gradient : null, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default GradientBackground;
