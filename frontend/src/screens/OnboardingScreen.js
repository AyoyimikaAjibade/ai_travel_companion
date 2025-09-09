// src/screens/OnboardingScreen.js
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import GradientBackground from "../components/GradientBackground";
import GradientButton from "../components/GradientButton";
import { COLORS, GRADIENTS, SPACING } from "../theme";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = ({ navigation, setHasCompletedOnboarding }) => {
  const handleGetStarted = () => {
    setHasCompletedOnboarding(true);
  };

  return (
    <GradientBackground colors={GRADIENTS.sky} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headline}>Plan trips at chat speed.</Text>
        <Text style={styles.subhead}>
          TWOS finds the best travel options through natural conversation. No
          stress, just adventures.
        </Text>
      </View>

      <View style={styles.footer}>
        <GradientButton title="Start Chatting →" onPress={handleGetStarted} />
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.xl,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headline: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 36,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 44,
  },
  subhead: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    opacity: 0.9,
  },
  footer: {
    paddingBottom: SPACING.xxl,
  },
});

export default OnboardingScreen;
