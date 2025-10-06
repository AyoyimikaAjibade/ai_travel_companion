// src/screens/ExpediaCheckoutClone.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "../utils/format";

const ExpediaCheckoutClone = ({ route, navigation }) => {
  const { data = {}, currency = "USD" } = route.params || {};
  const price = data?.price ?? 980;

  const handlePay = () => {
    navigation.navigate("FakePayment", {
      provider: "Expedia",
      type: "flight",
      data,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expedia Checkout</Text>
        <Text style={styles.simLabel}>Simulated preview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Trip Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Trip</Text>
          <Text style={styles.itemTitle}>
            {data.airline ?? "Qatar Airways"} • {data.type ?? "Non-stop"}
          </Text>
          <Text style={styles.small}>Nov 10 – Nov 15 • 2 adults</Text>
          <Text style={styles.price}>{formatCurrency(price, currency)}</Text>
        </View>

        {/* Traveler Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Traveler Information</Text>
          <Text style={styles.small}>John Doe</Text>
          <Text style={styles.small}>Jane Doe</Text>
        </View>

        {/* Price Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Price Summary</Text>
          <Text style={styles.small}>
            Base Fare: {formatCurrency(price * 0.85, currency)}
          </Text>
          <Text style={styles.small}>
            Taxes: {formatCurrency(price * 0.15, currency)}
          </Text>
          <Text style={styles.total}>
            Total: {formatCurrency(price, currency)}
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.cta} onPress={handlePay}>
          <Text style={styles.ctaText}>
            Continue • {formatCurrency(price, currency)}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ExpediaCheckoutClone;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: "#002B5C",
    padding: 16,
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  simLabel: { color: "#FFD700", fontSize: 12, marginTop: 4 },
  scroll: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1C1C1C",
  },
  itemTitle: { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  small: { color: "#555", fontSize: 13, marginVertical: 2 },
  price: { fontSize: 16, fontWeight: "600", color: "#002B5C", marginTop: 6 },
  total: { fontSize: 16, fontWeight: "700", color: "#1C1C1C", marginTop: 8 },
  cta: {
    backgroundColor: "#FFC72C",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  ctaText: { color: "#002B5C", fontSize: 16, fontWeight: "700" },
});
