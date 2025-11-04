// src/components/PremiumAlert.js
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { SPACING, BORDER_RADIUS, COLORS } from "../theme";

const loaderSource = require("../../assets/lottie/loader-plane.json");

const VARIANT_COLORS = {
  info: {
    accent: COLORS.primary,
    background: "rgba(124,58,237,0.14)",
  },
  warning: {
    accent: "#f97316",
    background: "rgba(249,115,22,0.14)",
  },
  danger: {
    accent: "#f87171",
    background: "rgba(248,113,113,0.16)",
  },
};

export const PremiumAlert = ({
  visible,
  title,
  message,
  onClose,
  variant = "info",
  buttonLabel = "Got it",
}) => {
  const colors = VARIANT_COLORS[variant] || VARIANT_COLORS.info;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.background }]}
        >
          <View style={styles.lottieWrap}>
            <LottieView
              source={loaderSource}
              autoPlay
              loop={false}
              style={styles.lottie}
            />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const usePremiumAlert = () => {
  const [state, setState] = React.useState({
    visible: false,
    title: "",
    message: "",
    variant: "info",
    buttonLabel: "Got it",
  });

  const showAlert = React.useCallback(
    ({ title, message, variant = "info", buttonLabel = "Got it" }) => {
      setState({ visible: true, title, message, variant, buttonLabel });
    },
    []
  );

  const hideAlert = React.useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const alertElement = (
    <PremiumAlert
      visible={state.visible}
      title={state.title}
      message={state.message}
      variant={state.variant}
      buttonLabel={state.buttonLabel}
      onClose={hideAlert}
    />
  );

  return [showAlert, alertElement];
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(7,9,17,0.75)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  lottieWrap: {
    alignItems: "center",
  },
  lottie: {
    width: 120,
    height: 120,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  message: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
});
