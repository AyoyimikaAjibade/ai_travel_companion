// src/screens/ExpediaCheckoutClone.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "../utils/format";
import { ChevronLeft, ShieldCheck } from "lucide-react-native";
import TravelerDetailsForm from "../components/TravelerDetailsForm";
import PassengersForm, {
  createPassenger,
} from "../components/PassengersForm";
import { usePremiumAlert } from "../components/PremiumAlert";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";

const CABIN_MULTIPLIERS = {
  economy: 1,
  business: 2.5,
  first: 6.5,
};

const CABIN_OPTIONS = [
  {
    id: "economy",
    label: "Economy",
    subtitle: "Standard comfort",
  },
  {
    id: "business",
    label: "Business",
    subtitle: "More space (price × 2.5)",
  },
  {
    id: "first",
    label: "First",
    subtitle: "Suite experience (price × 6.5)",
  },
];

const ExpediaCheckoutClone = ({ route, navigation }) => {
  const { data = {}, currency = "USD" } = route.params || {};
  const serviceKey = route.params?.serviceKey;
  const serviceType = route.params?.serviceType ?? "flight";
  const basePlanId = route.params?.basePlanId;
  const chatId = route.params?.chatId;
  const { convertCurrency, targetCurrency } = useCurrencyConverter();
  const displayCurrency = targetCurrency || currency;
  const rawPrice = data?.price ?? 980;
  const cabinDefault = (data?.cabinClass ?? data?.cabin ?? "economy")
    .toString()
    .toLowerCase();
  const initialPassengers = useMemo(() => {
    if (Array.isArray(data?.passengers) && data.passengers.length) {
      return data.passengers.map((passenger) => {
        const base = createPassenger();
        return {
          ...base,
          ...passenger,
          id: passenger.id ?? base.id,
        };
      });
    }
    return [createPassenger()];
  }, [data?.passengers]);
  const [passengers, setPassengers] = useState(initialPassengers);
  const maxPassengers = Math.max(
    Number(data?.maxPassengers ?? data?.maxGuests ?? 8) || 1,
    1
  );
  const [cabinClass, setCabinClass] = useState(
    CABIN_MULTIPLIERS[cabinDefault] ? cabinDefault : "economy"
  );
  const passengerCount = Math.max(passengers.length, 1);
  const basePricePerPassenger = convertCurrency(
    rawPrice,
    currency,
    displayCurrency
  );
  const pricePerPassenger =
    basePricePerPassenger * (CABIN_MULTIPLIERS[cabinClass] ?? 1);
  const price = pricePerPassenger * passengerCount;
  const taxes = price * 0.1;
  const twosFee = price * 0.05;
  const total = price + taxes + twosFee;
  const baseFareTotal = basePricePerPassenger * passengerCount;
  const upgradeTotal = Math.max(price - baseFareTotal, 0);
  const pricePerPassengerLabel = formatCurrency(
    pricePerPassenger,
    displayCurrency
  );
  const baseFareLabel = formatCurrency(baseFareTotal, displayCurrency);
  const upgradeLabel =
    upgradeTotal > 0 ? formatCurrency(upgradeTotal, displayCurrency) : null;
  const depart = data?.departure_time
    ? new Date(data.departure_time).toLocaleString()
    : "Jan 11, 4:55 PM";
  const arrive = data?.arrival_time
    ? new Date(data.arrival_time).toLocaleString()
    : "Jan 13, 7:45 PM";
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
  const passengersValid = passengers.every(
    (p) =>
      typeof p?.firstName === "string" &&
      p.firstName.trim().length > 0 &&
      typeof p?.lastName === "string" &&
      p.lastName.trim().length > 0
  );
  const [showPremiumAlert, premiumAlert] = usePremiumAlert();

  const handlePay = () => {
    if (!travelerValid) {
      showPremiumAlert({
        title: "Traveler details",
        message:
          "Please fill in traveler name, email, and contact number before continuing.",
        variant: "warning",
      });
      return;
    }
    if (!passengersValid) {
      showPremiumAlert({
        title: "Passengers",
        message: "Please add names for every passenger before continuing.",
        variant: "warning",
      });
      return;
    }
    navigation.navigate("FakePayment", {
      provider: "Expedia",
      type: "flight",
      serviceType,
      serviceKey,
      basePlanId,
      chatId,
      data: {
        ...data,
        traveler,
        passengers,
        cabinClass,
        price,
        currency: displayCurrency,
      },
      summary: {
        total_price: total,
        currency: displayCurrency,
        taxes,
        twos_fee: twosFee,
        subtotal: price,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Expedia checkout</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tripCard}>
          <Text style={styles.sectionLabel}>Review your trip</Text>
          <Text style={styles.flightTitle}>
            {data.origin_airport_code ?? "SFO"} → {data.destination_airport_code ?? "DXB"}
          </Text>
          <Text style={styles.flightMeta}>
            {data.airline ?? "Expedia partner"} • {data.type ?? "Non-stop"}
          </Text>
          <View style={styles.timeline}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
            <View style={styles.timelineDot} />
          </View>
          <View style={styles.timelineRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineLabel}>Depart</Text>
              <Text style={styles.timelineValue}>{depart}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineLabel}>Arrive</Text>
              <Text style={styles.timelineValue}>{arrive}</Text>
            </View>
          </View>
          <View style={styles.badgeRow}>
            <ShieldCheck size={16} color="#1c4ed8" />
            <Text style={styles.badgeText}>Free 24h cancellation (demo)</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Passengers</Text>
          {passengers.map((passenger, index) => (
            <SummaryRow
              key={passenger.id ?? `passenger-${index}`}
              label={`Passenger ${index + 1}`}
              value={`${passenger.firstName ?? ""} ${
                passenger.lastName ?? ""
              }`.trim() || "—"}
            />
          ))}
          <Text style={styles.cabinHint}>{`Max passengers: ${maxPassengers}`}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Cabin class</Text>
          <View style={styles.cabinOptions}>
            {CABIN_OPTIONS.map((option) => {
              const active = option.id === cabinClass;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.cabinOption,
                    active && styles.cabinOptionActive,
                  ]}
                  onPress={() => setCabinClass(option.id)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.cabinOptionLabel,
                      active && styles.cabinOptionLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.cabinOptionSubtitle}>
                    {option.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.cabinHint}>
            {`Per passenger: ${pricePerPassengerLabel}`}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Price summary</Text>
          <SummaryRow
            label={`Fare (${passengerCount} × ${pricePerPassengerLabel})`}
            value={baseFareLabel}
          />
          {upgradeLabel ? (
            <SummaryRow label="Cabin upgrade" value={upgradeLabel} />
          ) : null}
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

        <View style={{ marginBottom: 16, marginHorizontal: 20 }}>
          <PassengersForm
            value={passengers}
            onChange={setPassengers}
            maxCount={maxPassengers}
          />
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Traveler contact</Text>
          <TravelerDetailsForm value={traveler} onChange={setTraveler} title={null} />
        </View>

        <TouchableOpacity style={styles.payBtn} onPress={handlePay} activeOpacity={0.9}>
          <Text style={styles.payBtnText}>
            Continue • {formatCurrency(total, displayCurrency)}
          </Text>
        </TouchableOpacity>
        {premiumAlert}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExpediaCheckoutClone;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#06102a" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  topTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: "#0b1c42",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(66,153,225,0.35)",
    marginBottom: 16,
  },
  sectionLabel: {
    color: "#9eb6ff",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  flightTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  flightMeta: {
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  timeline: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4f8bff",
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(79,139,255,0.6)",
  },
  timelineRow: {
    flexDirection: "row",
    gap: 20,
  },
  timelineLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  timelineValue: {
    color: "#fff",
    marginTop: 4,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  badgeText: {
    color: "#9eb6ff",
    fontSize: 12,
  },
  summaryCard: {
    backgroundColor: "rgba(11,28,66,0.8)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(79,139,255,0.15)",
    marginBottom: 16,
    gap: 8,
  },
  cabinOptions: {
    flexDirection: "column",
    gap: 10,
  },
  cabinOption: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(79,139,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(79,139,255,0.08)",
    gap: 4,
  },
  cabinOptionActive: {
    borderColor: "rgba(79,139,255,0.6)",
    backgroundColor: "rgba(79,139,255,0.2)",
  },
  cabinOptionLabel: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  cabinOptionLabelActive: {
    color: "#bfdbfe",
  },
  cabinOptionSubtitle: {
    color: "rgba(190,214,255,0.75)",
    fontSize: 12,
  },
  cabinHint: {
    marginTop: 4,
    color: "rgba(190,214,255,0.8)",
    fontSize: 12,
  },
  payBtn: {
    marginTop: 12,
    backgroundColor: "#ffb700",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  payBtnText: {
    color: "#002b5c",
    fontSize: 16,
    fontWeight: "700",
  },
});

const SummaryRow = ({ label, value, bold = false }) => (
  <View style={summaryStyles.row}>
    <Text style={summaryStyles.label}>{label}</Text>
    <Text style={[summaryStyles.value, bold && summaryStyles.valueBold]}>
      {value}
    </Text>
  </View>
);

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  value: {
    color: "#fff",
    fontSize: 13,
  },
  valueBold: {
    fontWeight: "700",
  },
});
