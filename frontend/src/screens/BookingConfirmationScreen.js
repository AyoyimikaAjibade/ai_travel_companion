// src/screens/BookingConfirmationScreen.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { formatCurrency } from "../utils/format";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import { ChevronLeft, MessageCircle, Luggage } from "lucide-react-native";

const QR_PLACEHOLDER_ROWS = [
  "1101011010",
  "0110100101",
  "1011011011",
  "0100110010",
  "1101101101",
  "0010010110",
  "1011101001",
  "0110010111",
];

const renderQrRow = (row) => (
  <View key={row} style={styles.qrRow}>
    {row.split("").map((bit, idx) => (
      <View
        key={`${row}-${idx}`}
        style={[styles.qrCell, bit === "1" ? styles.qrCellFilled : null]}
      />
    ))}
  </View>
);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function BookingConfirmationScreen({ route, navigation }) {
  const { chatId, booking: navigationBooking } = route.params || {};
  const booking = useMemo(() => {
    if (navigationBooking) return navigationBooking;
    const store = useSavedChatsStore.getState();
    if (chatId) {
      const chat = store.getChatById?.(chatId);
      return chat?.booking ?? null;
    }
    return null;
  }, [chatId, navigationBooking]);

  const amountLabel = booking?.amount != null
    ? formatCurrency(booking.amount, booking.currency ?? "USD")
    : null;
  const twosFeeLabel = booking?.twosFee != null
    ? formatCurrency(booking.twosFee, booking.currency ?? "USD")
    : null;
  const traveler = booking?.traveler;

  const goToChat = () =>
    navigation.navigate("Main", { screen: "Chat", params: { chatId } });

  const goToTrips = () => navigation.navigate("Main", { screen: "MyTrips" });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking confirmation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cardPrimary}>
          <Text style={styles.cardTitle}>You're booked!</Text>
          <Text style={styles.cardSubtitle}>
            {booking?.provider ?? "Travel partner"} confirmed your {booking?.type ?? "booking"}.
          </Text>
          <View style={styles.qrContainer}>{QR_PLACEHOLDER_ROWS.map(renderQrRow)}</View>
          <Text style={styles.qrHint}>Show this code at check-in or keep it for your records.</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Booking details</Text>
          <SummaryRow label="Provider" value={booking?.provider ?? "Travel partner"} />
          <SummaryRow label="Type" value={booking?.type ?? "Trip"} />
          <SummaryRow label="Confirmed" value={formatDate(booking?.confirmedAt)} />
          {twosFeeLabel ? <SummaryRow label="TWOS service fee" value={twosFeeLabel} /> : null}
          {amountLabel ? <SummaryRow label="Total paid" value={amountLabel} bold /> : null}
        </View>

        {booking?.data ? (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Itinerary</Text>
            {Object.entries(booking.data)
              .filter(([_, value]) =>
                typeof value === "string" || typeof value === "number"
              )
              .slice(0, 6)
              .map(([key, value]) => (
                <SummaryRow
                  key={key}
                  label={formatLabel(key)}
                  value={String(value)}
                />
              ))}
          </View>
        ) : null}

        {traveler ? (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Traveler</Text>
            <SummaryRow label="Name" value={traveler.name} />
            <SummaryRow label="Email" value={traveler.email} />
            <SummaryRow
              label="Contact"
              value={traveler.phone ? `${traveler.countryCode} ${traveler.phone}` : null}
            />
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={goToChat}
            activeOpacity={0.9}
          >
            <MessageCircle size={18} color="#fff" />
            <Text style={styles.actionTextPrimary}>Continue chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={goToTrips}
            activeOpacity={0.85}
          >
            <Luggage size={18} color={COLORS.text} />
            <Text style={styles.actionTextSecondary}>View trips</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryRow = ({ label, value, bold = false }) => {
  if (!value) return null;
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>
        {value}
      </Text>
    </View>
  );
};

const formatLabel = (key) =>
  key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

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
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  cardPrimary: {
    backgroundColor: "rgba(124,58,237,0.12)",
    borderColor: "rgba(124,58,237,0.35)",
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 24,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: SPACING.xs,
  },
  qrContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: BORDER_RADIUS.lg,
    alignSelf: "center",
  },
  qrRow: {
    flexDirection: "row",
  },
  qrCell: {
    width: 14,
    height: 14,
    margin: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
  },
  qrCellFilled: {
    backgroundColor: "#fff",
  },
  qrHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.md,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
  },
  summaryValueBold: {
    fontFamily: "Urbanist_600SemiBold",
  },
  actionRow: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    gap: SPACING.xs,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionTextPrimary: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  actionTextSecondary: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
});
