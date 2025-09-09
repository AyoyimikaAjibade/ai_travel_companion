// src/components/GradientButton.js
import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import GradientBackground from "./GradientBackground";
import { COLORS, GRADIENTS, BORDER_RADIUS, SPACING } from "../theme";

const GradientButton = ({ title, onPress, loading, ...props }) => {
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8}>
      <GradientBackground colors={GRADIENTS.primary} style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </GradientBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
  },
});

export default GradientButton;
