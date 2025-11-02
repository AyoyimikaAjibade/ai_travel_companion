// src/screens/GenericCheckout.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING, COLORS, BORDER_RADIUS } from "../theme";
import { formatCurrency } from "../utils/format";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";
import TravelerDetailsForm from "../components/TravelerDetailsForm";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";
import { Alert } from "react-native";

export default function GenericCheckout({ route, navigation }) {
  const { provider = "Provider", data = {}, currency = "USD" } =
    route.params || {};
  const items = Array.isArray(data.items) ? data.items : [];
  const { convertCurrency, targetCurrency } = useCurrencyConverter();
  const displayCurrency = targetCurrency || currency;

  const subtotal = useMemo(() => {
    if (items.length) {
      return items.reduce(
        (sum, item) =>
          sum + convertCurrency(item.price ?? 0, item.currency, displayCurrency),
        0
      );
    }
    const basePrice = data.price ?? route.params?.summary?.total_price ?? 0;
    return convertCurrency(basePrice, currency, displayCurrency);
  }, [items, convertCurrency, displayCurrency, data.price, route.params, currency]);

  const taxes = subtotal * 0.1;
  const twosFee = subtotal * 0.05;
  const total = subtotal + taxes + twosFee;
  const [traveler, setTraveler] = useState({
    name: data.traveler ?? "",
    email: data.email ?? "",
    countryCode: data.countryCode ?? "+1",
    phone: data.phone ?? "",
  });

  const travelerValid =
    traveler.name.trim().length > 0 &&
    traveler.email.trim().length > 0 &&
    traveler.phone.trim().length >= 6;

  const handlePay = () =>
    {
      if (!travelerValid) {
        Alert.alert(
          "Traveler details",
          "Please complete name, email, and contact number before continuing."
        );
        return;
      }

    navigation.navigate("FakePayment", {
      provider,
      type: route.params?.type || "item",
      data: {
        ...data,
        items,
        price: subtotal,
        currency: displayCurrency,
        traveler,
      },
      summary: {
        total_price: total,
        currency: displayCurrency,
        taxes,
        twos_fee: twosFee,
        subtotal,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{provider} checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: SPACING.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{data.name ?? "Trip summary"}</Text>
          <Text style={styles.heroSubtitle}>
            {data.description ||
              data.airline ||
              "Premium checkout experience in demo mode."}
          </Text>
          <View style={styles.heroRow}>
            <ShieldCheck size={18} color="#0ea5a9" />
            <Text style={styles.heroBadge}>Secure payment • sandbox</Text>
          </View>
          {items.length ? (
            <View style={styles.itemList}>
              {items.map((item, idx) => (
                <View key={`${item.label}-${idx}`} style={styles.itemRow}>
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Text style={styles.itemPrice}>
                    {formatCurrency(
                      convertCurrency(
                        item.price ?? 0,
                        item.currency,
                        displayCurrency
                      ),
                      displayCurrency
                    )}
                  </Text>
                  {item.description ? (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          <SummaryRow
            label="Subtotal"
            value={formatCurrency(subtotal, displayCurrency)}
          />
          <SummaryRow
            label="Taxes & fees"
            value={formatCurrency(taxes, displayCurrency)}
          />
          <SummaryRow
            label="TWOS service fee (5%)"
            value={formatCurrency(twosFee, displayCurrency)}
          />
          <SummaryRow
            label="Total due today"
            value={formatCurrency(total, displayCurrency)}
            bold
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Traveler information</Text>
          <TravelerDetailsForm value={traveler} onChange={setTraveler} title={null} />
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.9}>
          <Text style={styles.payBtnText}>
            Pay {formatCurrency(total, displayCurrency)} securely
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryRow = ({ label, value, bold = false }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
  },
  scroll: { flex: 1 },
  heroCard: {
    backgroundColor: "rgba(14,165,233,0.16)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.3)",
  },
  heroTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 22,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  heroBadge: {
    color: "#0ea5a9",
    fontFamily: "Urbanist_600SemiBold",
  },
  itemList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  itemRow: {
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  itemLabel: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  itemPrice: {
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  itemDescription: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
  },
  summaryValue: { color: COLORS.text },
  summaryValueBold: { fontFamily: "Urbanist_600SemiBold" },
  payBtn: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  payBtnText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
});
