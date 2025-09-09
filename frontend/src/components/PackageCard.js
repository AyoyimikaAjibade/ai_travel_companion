// src/components/PackageCard.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import GradientBackground from "./GradientBackground";
import ScoreBadge from "./ScoreBadge";
import TagChip from "./TagChip";
import { COLORS, GRADIENTS, BORDER_RADIUS, SPACING } from "../theme";

const PackageCard = ({ title, total, score, bullets, onPress, ...props }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <GradientBackground colors={GRADIENTS.sky} style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <ScoreBadge score={score} />
        </View>

        <Text style={styles.total}>${total.toLocaleString()}</Text>

        <View style={styles.bullets}>
          {bullets.slice(0, 3).map((bullet, index) => (
            <Text key={index} style={styles.bullet}>
              • {bullet}
            </Text>
          ))}
        </View>

        <View style={styles.tags}>
          {total < 1500 && <TagChip text="Under budget 🎉" />}
          {bullets.some((b) => b.includes("non-stop")) && (
            <TagChip text="Non-stop ✈️" />
          )}
        </View>
      </GradientBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    marginVertical: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 18,
    flex: 1,
    marginRight: SPACING.sm,
  },
  total: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 28,
    marginBottom: SPACING.sm,
  },
  bullets: {
    marginBottom: SPACING.sm,
  },
  bullet: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});

export default PackageCard;
 