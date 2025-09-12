// src/components/EmptyState.js
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Compass } from "lucide-react-native";
import { COLORS, SPACING } from "../theme";

const EmptyState = ({ icon: Icon = Compass, title, description }) => {
  return (
    <View style={styles.container}>
      {/* <Icon size={48} color={COLORS.textMuted} /> */}
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
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
    marginTop: -SPACING.xxl * 1.5,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  logo: {
    width: 200,
    height: 200,
    opacity: 0.5,
    marginTop: SPACING.md,
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
