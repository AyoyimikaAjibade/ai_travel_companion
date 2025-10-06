// src/screens/ProviderPreview.js (minimal)
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import ExpediaCheckoutClone from "./ExpediaCheckoutClone";
import BookingCheckoutClone from "./BookingCheckoutClone";
import GenericCheckout from "./GenericCheckout";

export default function ProviderPreview({ route, navigation }) {
  const {
    provider = "Provider",
    data = {},
    type = "item",
    currency,
  } = route.params || {};
  const key = (provider || "").toLowerCase();

  if (key.includes("booking")) {
    return (
      <BookingCheckoutClone
        route={{ params: { data, currency } }}
        navigation={navigation}
      />
    );
  }
  if (key.includes("expedia")) {
    return (
      <ExpediaCheckoutClone
        route={{ params: { data, currency } }}
        navigation={navigation}
      />
    );
  }
  return (
    <GenericCheckout
      route={{ params: { provider, data, currency, type } }}
      navigation={navigation}
    />
  );
}
