// src/components/EmptyState.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Compass } from "lucide-react-native";
import { COLORS, SPACING } from "../theme";

const EmptyState = ({ icon: Icon = Compass, title, description }) => {
  return (
    <View style={styles.container}>
      <Icon size={48} color={COLORS.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 20,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  description: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});

export default EmptyState;
