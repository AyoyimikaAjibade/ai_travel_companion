// src/components/LoadingSkeleton.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, BORDER_RADIUS, SPACING } from '../theme';

const LoadingSkeleton = ({ width = '100%', height = 20, style }) => {
  return (
    <View 
      style={[
        styles.skeleton, 
        { width, height }, 
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
});

export default LoadingSkeleton;