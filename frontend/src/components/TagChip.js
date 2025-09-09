// src/components/TagChip.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, BORDER_RADIUS, SPACING } from "../theme";

const TagChip = ({ text }) => {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipText: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 12,
  },
});

export default TagChip;