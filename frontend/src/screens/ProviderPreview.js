// src/screens/ProviderPreview.js (minimal)
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import ExpediaCheckoutClone from "./ExpediaCheckoutClone";
import BookingCheckoutClone from "./BookingCheckoutClone";
import GenericCheckout from "./GenericCheckout";

const isFlight = (type = "") =>
  ["flight", "flights", "air", "airfare"].includes(type?.toLowerCase?.());
const isHotel = (type = "") =>
  ["hotel", "stay", "accommodation"].includes(type?.toLowerCase?.());

export default function ProviderPreview({ route, navigation }) {
  const {
    provider = "Provider",
    data = {},
    type = "item",
    currency,
  } = route.params || {};

  const providerKey = (provider || "").toLowerCase();

  if (isFlight(type) || providerKey.includes("expedia")) {
    return (
      <ExpediaCheckoutClone
        route={{ params: { data, currency } }}
        navigation={navigation}
      />
    );
  }

  if (isHotel(type) || providerKey.includes("booking")) {
    return (
      <BookingCheckoutClone
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
