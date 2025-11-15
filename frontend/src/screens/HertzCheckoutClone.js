// src/screens/HertzCheckoutClone.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ShieldCheck, Gauge, Users } from "lucide-react-native";
import TravelerDetailsForm from "../components/TravelerDetailsForm";
import { formatCurrency } from "../utils/format";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";
import { SPACING, BORDER_RADIUS } from "../theme";
import { usePremiumAlert } from "../components/PremiumAlert";

const HERTZ_BLACK = "#111111";
const HERTZ_YELLOW = "#f9d342";
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1549923746-1235e86aa2f6?auto=format&fit=crop&w=1200&q=80";

const HertzCheckoutClone = ({ route, navigation }) => {
  const { data = {}, currency = "USD" } = route.params || {};
  const serviceKey = route.params?.serviceKey;
  const serviceType = route.params?.serviceType ?? "car";
  const basePlanId = route.params?.basePlanId;
  const chatId = route.params?.chatId;

  const carName = data.name ?? data.car_type ?? "SUV Premium";
  const providerName = data.company ?? "Hertz";
  const pickup = data.pickup_time ?? "Oct 11 • 10:00 AM";
  const dropoff = data.dropoff_time ?? "Oct 15 • 08:00 AM";
  const location = data.location ?? data.pickup_location ?? "San Francisco Intl";
  const passengers = data.seats ?? data.passengers ?? "5 seats";
  const transmission = data.transmission ?? "Automatic";
  const imageSource = data.image ? { uri: data.image } : { uri: PLACEHOLDER_IMAGE };

  const { convertCurrency, targetCurrency } = useCurrencyConverter();
  const displayCurrency = targetCurrency || currency;
  const rawDailyRate = Number(data.price_per_day ?? data.price ?? 85);
  const dailyRate = convertCurrency(rawDailyRate, currency, displayCurrency);
  const rentalDays = Number(data.days ?? data.duration_days ?? 1);
  const subtotal = dailyRate * rentalDays;
  const taxes = subtotal * 0.15;
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
  const [showPremiumAlert, premiumAlert] = usePremiumAlert();

  const handlePay = () => {
    if (!travelerValid) {
      showPremiumAlert({
        title: "Driver details",
        message:
          "Please complete name, email, and contact number before continuing.",
        variant: "warning",
      });
      return;
    }

    navigation.navigate("FakePayment", {
      provider: providerName,
      type: "car",
      serviceType,
      serviceKey,
      basePlanId,
      chatId,
      data: {
        ...data,
        traveler,
        price: subtotal,
        currency: displayCurrency,
        rentalDays,
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
          <ChevronLeft size={20} color={HERTZ_YELLOW} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hertz checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Image source={imageSource} style={styles.carImage} resizeMode="cover" />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{carName}</Text>
            <Text style={styles.heroSubtitle}>{location}</Text>
            <View style={styles.heroBadges}>
              <View style={styles.badge}>
                <Gauge size={14} color={HERTZ_BLACK} />
                <Text style={styles.badgeText}>{transmission}</Text>
              </View>
              <View style={styles.badge}>
                <Users size={14} color={HERTZ_BLACK} />
                <Text style={styles.badgeText}>{passengers}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Pickup & return</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup</Text>
            <Text style={styles.detailValue}>{pickup}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return</Text>
            <Text style={styles.detailValue}>{dropoff}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{location}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Price summary</Text>
          <SummaryRow
            label={`Daily rate × ${rentalDays} days`}
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
            label="Total due"
            value={formatCurrency(total, displayCurrency)}
            bold
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Driver information</Text>
          <TravelerDetailsForm value={traveler} onChange={setTraveler} title={null} />
        </View>

        <View style={styles.notice}>
          <ShieldCheck size={16} color={HERTZ_BLACK} />
          <Text style={styles.noticeText}>
            Free cancellation up to 48 hours before pickup • Hertz Gold Member perks included.
          </Text>
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.9}>
          <Text style={styles.payBtnText}>
            Confirm • {formatCurrency(total, displayCurrency)}
          </Text>
        </TouchableOpacity>
        {premiumAlert}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HertzCheckoutClone;

const SummaryRow = ({ label, value, bold = false }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: HERTZ_BLACK },
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
    borderWidth: 1,
    borderColor: HERTZ_YELLOW,
  },
  headerTitle: {
    color: HERTZ_YELLOW,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  heroCard: {
    backgroundColor: "#1f1f1f",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(249,211,66,0.25)",
    overflow: "hidden",
  },
  carImage: {
    width: "100%",
    height: 180,
  },
  heroBody: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.68)",
  },
  heroBadges: {
    flexDirection: "row",
    gap: 10,
    marginTop: SPACING.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: HERTZ_YELLOW,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: HERTZ_BLACK,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 12,
  },
  sectionCard: {
    backgroundColor: "#181818",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(249,211,66,0.18)",
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  detailValue: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.65)",
  },
  summaryValue: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
  },
  summaryValueBold: {
    color: HERTZ_YELLOW,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(249,211,66,0.15)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  noticeText: {
    color: HERTZ_YELLOW,
    flex: 1,
    fontSize: 13,
  },
  payBtn: {
    marginTop: SPACING.md,
    backgroundColor: HERTZ_YELLOW,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  payBtnText: {
    color: HERTZ_BLACK,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
  },
});
