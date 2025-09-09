import React from "react";
import { LinearGradient } from "expo-linear-gradient";

const GradientBackground = ({ colors, style, children, ...props }) => {
  return (
    <LinearGradient
      colors={colors}
      // IMPORTANT: no default flex:1 here – let the parent size the bubble
      style={style}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

export default GradientBackground;
