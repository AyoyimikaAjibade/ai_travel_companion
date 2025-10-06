// src/screens/GenericCheckout.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING, COLORS, BORDER_RADIUS } from "../theme";
import { formatCurrency } from "../utils/format";

export default function GenericCheckout({ route, navigation }) {
  const {
    provider = "Provider",
    data = {},
    currency = "USD",
  } = route.params || {};
  const price = data.price ?? route.params?.summary?.total_price ?? 0;

  const handlePay = () =>
    navigation.navigate("FakePayment", {
      provider,
      type: route.params?.type || "item",
      data,
    });

  return (
    <SafeAreaView style={{ backgroundColor: COLORS.background }}>
      <View style={styles.card}>
        <Text style={styles.title}>{provider} • Checkout (Simulated)</Text>
        <Text style={styles.small}>
          {data.name || data.airline || "Package details"}
        </Text>

        <View style={{ marginTop: SPACING.md }}>
          <Text style={styles.section}>
            Total: {formatCurrency(price, currency)}
          </Text>
        </View>

        <TouchableOpacity style={styles.cta} onPress={handlePay}>
          <Text style={styles.ctaText}>
            Pay {formatCurrency(price, currency)}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS?.xl ?? 12,
  },
  title: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    marginBottom: SPACING.sm,
  },
  small: { color: "rgba(255,255,255,0.75)" },
  section: { color: "#D1FAE5", fontFamily: "Urbanist_600SemiBold" },
  cta: {
    marginTop: SPACING.md,
    backgroundColor: "#0ea5a9",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: { color: "#021215", fontFamily: "Urbanist_600SemiBold" },
});
