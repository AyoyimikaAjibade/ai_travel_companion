// src/screens/BookingCheckoutClone.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING } from "../theme";
import { formatCurrency } from "../utils/format";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";
import TravelerDetailsForm from "../components/TravelerDetailsForm";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";

const BOOKING_BLUE = "#003580";
const BOOKING_YELLOW = "#FFB700";
const logoUri =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Booking.com_Logo_Grey.svg/1200px-Booking.com_Logo_Grey.svg.png";

const BookingCheckoutClone = ({ route, navigation }) => {
  const { data = {}, currency = "USD" } = route.params || {};
  const { convertCurrency, targetCurrency } = useCurrencyConverter();
  const displayCurrency = targetCurrency || currency;
  const basePrice = Number(data?.price ?? 360);
  const subtotal = convertCurrency(basePrice, currency, displayCurrency);
  const taxes = subtotal * 0.18;
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

  const handlePay = () => {
    if (!travelerValid) {
      Alert.alert(
        "Traveler details",
        "Please complete traveler information before continuing."
      );
      return;
    }
    navigation.navigate("FakePayment", {
      provider: "Booking.com",
      type: "hotel",
      data: {
        ...data,
        traveler,
        price: subtotal,
        currency: displayCurrency,
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
    // root must fill the screen
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BOOKING_BLUE} />

      <SafeAreaView style={styles.safeTop} edges={["top"]}>
        <View style={styles.headerWrap}>
          <View style={styles.headerInner}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: logoUri }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={{ width: 36 }} />
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
                    "https://www.hoteldel.com/wp-content/uploads/2021/01/hotel-del-coronado-views-suite-K1TOS1-K1TOJ1-1600x900-1.jpg",
                }}
                style={styles.hotelImg}
                resizeMode="cover"
              />
              <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                <Text style={styles.hotelName}>{data.name ?? "Souq View"}</Text>
                <Text style={styles.hotelMeta}>
                  ⭐ {data.rating ?? 4.4} • Breakfast included
                </Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <ShieldCheck size={16} color={BOOKING_YELLOW} />
              <Text style={styles.badgeText}>
                Free cancellation until {data.freeCancelUntil ?? "24 hours before arrival"}
              </Text>
            </View>
          </View>

          {/* Stay details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Stay details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-in</Text>
              <Text style={styles.detailValue}>{data.checkIn ?? "Nov 10"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Check-out</Text>
              <Text style={styles.detailValue}>{data.checkOut ?? "Nov 15"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Guests</Text>
              <Text style={styles.detailValue}>{data.guests ?? "2 adults"}</Text>
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
                {formatCurrency(subtotal, displayCurrency)}
              </Text>
            </View>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Taxes & fees</Text>
              <Text style={styles.feeValue}>
                {formatCurrency(taxes, displayCurrency)}
              </Text>
            </View>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>TWOS service fee (5%)</Text>
              <Text style={styles.feeValue}>
                {formatCurrency(twosFee, displayCurrency)}
              </Text>
            </View>

            <View style={styles.lightDivider} />

            <View style={[styles.feeRow, { marginTop: SPACING.sm }]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(total, displayCurrency)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Traveler information</Text>
            <TravelerDetailsForm value={traveler} onChange={setTraveler} title={null} />
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
                {formatCurrency(total, displayCurrency)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cta}
              onPress={handlePay}
              activeOpacity={0.9}
              accessibilityLabel="Confirm and pay"
            >
              <Text style={styles.ctaText}>
                Confirm • {formatCurrency(total, displayCurrency)}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.sm,
  },
  badgeText: { color: BOOKING_YELLOW, fontSize: 12 },

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
