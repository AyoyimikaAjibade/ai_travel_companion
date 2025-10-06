// src/screens/FakePayment.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING, COLORS } from "../theme";
import { formatCurrency } from "../utils/format";

export default function FakePayment({ route, navigation }) {
  const { provider, type, data } = route.params || {};
  const amount = data?.price ?? route.params?.summary?.total_price ?? 0;
  const currency = data?.currency ?? route.params?.summary?.currency ?? "USD";

  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const openSheet = () => setSheetVisible(true);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSheetVisible(false);
      // ✅ Go back to Chat tab after “payment”
      navigation.replace("Main", { screen: "Chat" });
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Simulated Payment • {provider}</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryText}>Item: {type}</Text>
          <Text style={styles.summaryText}>
            Amount: {formatCurrency(amount, currency)}
          </Text>
        </View>

        {/* Tap to open Apple Pay style sheet */}
        <TouchableOpacity
          style={styles.applePayBtn}
          onPress={openSheet}
          activeOpacity={0.9}
        >
          <Text style={styles.applePayText}>
             Pay • {formatCurrency(amount, currency)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Simulated Apple Pay bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Confirm with Apple Pay</Text>
            <Text style={styles.sheetDesc}>
              Double-click the side button to pay securely with Apple Pay.
            </Text>

            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>TOTAL</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(amount, currency)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sheetBtn}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sheetBtnText}>Pay with  Pay</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setSheetVisible(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", padding: SPACING.lg },
  title: {
    fontSize: 18,
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    marginBottom: SPACING.lg,
  },
  summary: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.xl,
  },
  summaryText: { color: "#fff", fontSize: 16 },

  applePayBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  applePayText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Urbanist_600SemiBold",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1c1c1e",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.sm,
  },
  sheetDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  amountLabel: { color: "#aaa", fontSize: 14 },
  amountValue: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Urbanist_600SemiBold",
  },
  sheetBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sheetBtnText: { color: "#fff", fontSize: 18 },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: { color: "#f87171", fontSize: 16 },
});
