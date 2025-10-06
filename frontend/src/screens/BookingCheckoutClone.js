// src/screens/BookingCheckoutClone.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING } from "../theme";
import { formatCurrency } from "../utils/format";

const BOOKING_BLUE = "#003580";
const BOOKING_YELLOW = "#FFB700";
const logoUri =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Booking.com_Logo_Grey.svg/1200px-Booking.com_Logo_Grey.svg.png";

const BookingCheckoutClone = ({ route, navigation }) => {
  const { data = {}, currency = "USD" } = route.params || {};
  const price = Number(data?.price ?? 360);
  const taxes = Number(data?.taxes ?? 40);
  const finalTax = Number(price * 0.2);
  const total = price + finalTax;

  const handlePay = () => {
    navigation.navigate("FakePayment", {
      provider: "Booking.com",
      type: "hotel",
      data,
    });
  };

  return (
    // root must fill the screen
    <View style={styles.root}>
      {/* ensure status bar contrasts with header color */}
      <StatusBar barStyle="light-content" backgroundColor={BOOKING_BLUE} />

      {/* Top safe area (blue) — keep height only for notch/status */
      /* this area will NOT flex; headerInner below will size itself */}
      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.headerWrap}>
          <View style={styles.headerInner}>
            <Image
              source={{ uri: logoUri }}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>
      </SafeAreaView>

      {/* Body fills remaining area */}
      <SafeAreaView style={styles.safeBody} edges={["left", "right", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Property card */}
          <View style={styles.card}>
            <View style={styles.rowCenter}>
              <Image
                source={{
                  uri:
                    data.image ||
                    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/123456789.jpg?k=dummy",
                }}
                style={styles.hotelImg}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.hotelName}>{data.name ?? "Souq View"}</Text>
                <Text style={styles.hotelMeta}>
                  ⭐ {data.rating ?? 4.4} • Breakfast + Pool
                </Text>
              </View>
            </View>
          </View>

          {/* Stay details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stay details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>Nov 10</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>Nov 15</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>2 adults</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Room type</Text>
              <Text style={styles.detailValue}>
                {data.roomType ?? "Deluxe Double Room"}
              </Text>
            </View>
          </View>

          {/* Price summary card */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Price summary</Text>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Room total</Text>
              <Text style={styles.feeValue}>
                {formatCurrency(price, currency)}
              </Text>
            </View>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Taxes & fees</Text>
              <Text style={styles.feeValue}>
                {formatCurrency(finalTax, currency)}
              </Text>
            </View>

            <View style={styles.lightDivider} />

            <View style={[styles.feeRow, { marginTop: SPACING.sm }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(total, currency)}
              </Text>
            </View>
          </View>

          {/* Cancellation / notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Free cancellation until Nov 1 • This is a simulated Booking.com
              checkout.
            </Text>
          </View>

          {/* spacing so CTA isn't covered */}
          <View style={{ height: 180 }} />
        </ScrollView>

        {/* Sticky bottom CTA: anchored to bottom of safeBody */}
        <View style={styles.stickyWrap} pointerEvents="box-none">
          <View style={styles.stickyInner}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>
                {formatCurrency(total, currency)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cta}
              onPress={handlePay}
              activeOpacity={0.9}
              accessibilityLabel="Confirm and pay"
            >
              <Text style={styles.ctaText}>
                Confirm • {formatCurrency(total, currency)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

export default BookingCheckoutClone;

/* styles */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BOOKING_BLUE }, // root fills screen so blue safeTop looks correct

  // top safe area background: small wrap only for notch area
  safeTop: {
    backgroundColor: BOOKING_BLUE,
  },

  headerWrap: {
    backgroundColor: BOOKING_BLUE,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    alignItems: "center",
    zIndex: 20,
  },
  headerInner: {
    width: "100%",
    maxWidth: 980,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
  },
  logo: {
    width: 200,
    height: 30,
  },

  // body section must be white and fill remaining space
  safeBody: { flex: 1, backgroundColor: "#fff" },

  scroll: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  rowCenter: { flexDirection: "row", alignItems: "center" },

  hotelImg: {
    width: 120,
    height: 84,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  hotelName: { fontSize: 16, fontWeight: "700", color: "#111" },
  hotelMeta: { color: "#666", marginTop: 4 },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailLabel: { color: "#444" },
  detailValue: { color: "#222", fontWeight: "600" },

  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  feeLabel: { color: "#555" },
  feeValue: { color: "#111" },

  lightDivider: {
    borderBottomColor: "#f3f3f3",
    borderBottomWidth: 1,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  totalLabel: { fontSize: 15, fontWeight: "700", color: "#111" },
  totalValue: { fontSize: 16, fontWeight: "900", color: BOOKING_BLUE },

  notice: {
    backgroundColor: "#f0f6ff",
    borderRadius: 10,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: 0,
  },
  noticeText: { color: BOOKING_BLUE },

  /* Sticky CTA */
  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? 18 : 12,
    // ensure it sits above content
    zIndex: 40,
  },
  stickyInner: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: SPACING.sm,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  priceLabel: { color: "#666" },
  priceValue: { color: "#111", fontWeight: "800", fontSize: 16 },

  cta: {
    marginTop: SPACING.sm,
    backgroundColor: BOOKING_YELLOW,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: BOOKING_BLUE, fontSize: 16, fontWeight: "900" },
});
