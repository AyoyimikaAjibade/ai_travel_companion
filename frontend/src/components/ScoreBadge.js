// src/components/ScoreBadge.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, BORDER_RADIUS, SPACING } from "../theme";

const ScoreBadge = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 9) return COLORS.success;
    if (score >= 7) return COLORS.warning;
    return COLORS.error;
  };

  return (
    <View style={[styles.badge, { backgroundColor: getScoreColor(score) }]}>
      <Text style={styles.score}>{score}/10</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
  score: {
    color: "#FFFFFF",
    fontFamily: "Urbanist_700Bold",
    fontSize: 12,
  },
});

export default ScoreBadge;
