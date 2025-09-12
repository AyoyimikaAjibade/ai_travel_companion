// src/screens/SplashScreen.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import LottieView from "lottie-react-native";
import GradientBackground from "../components/GradientBackground";
import { GRADIENTS, COLORS, SPACING } from "../theme";

// Ensure your JSON is at assets/lottie/loader-plane.json
import LoaderPlane from "../../assets/lottie/loader-plane.json";

const { width, height } = Dimensions.get("window");

export default function SplashScreen({ navigation }) {
  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // entrance
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // breathing halo
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // navigate after 3s (guard if prop is missing)
    const t = setTimeout(() => {
      navigation?.replace?.("Onboarding");
    }, 3000);

    return () => clearTimeout(t);
  }, [fade, scale, glow, navigation]);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.05],
  });
  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.36],
  });

  return (
    <GradientBackground colors={GRADIENTS.sky} style={styles.fill}>
      <View style={styles.centerWrap}>
        {/* subtle halo */}
        {/* <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        /> */}

        {/* logo + tagline (no extra title) */}
        <Animated.View
          style={[styles.brandBlock, { opacity: fade, transform: [{ scale }] }]}
        >
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Travel WithOut Stress</Text>
        </Animated.View>

        {/* lottie loader */}
        <LottieView
          source={LoaderPlane}
          autoPlay
          loop
          resizeMode="contain"
          style={styles.lottie}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  glow: {
    position: "absolute",
    width: Math.min(420, width * 0.85),
    height: Math.min(420, width * 0.85),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.22)",
    top: height * 0.28,
    shadowColor: "#9bd4ff",
    shadowOpacity: 0.5,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  brandBlock: { alignItems: "center", gap: 8 },
  logo: {
    width: width * 0.75,
    height: width * 0.75,
    marginBottom: -SPACING.xxl,
  },
  tagline: {
    marginTop: 2,
    fontSize: 20,
    lineHeight: 22,
    fontFamily: "Urbanist_500Medium",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.6,
  },
  lottie: {
    marginTop: -SPACING.lg,
    width: 250,
    height: 150,
  },
});
