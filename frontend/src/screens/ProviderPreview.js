// src/screens/ProviderPreview.js (minimal)
import React from "react";
import ExpediaCheckoutClone from "./ExpediaCheckoutClone";
import BookingCheckoutClone from "./BookingCheckoutClone";
import HertzCheckoutClone from "./HertzCheckoutClone";
import GenericCheckout from "./GenericCheckout";

const isFlight = (type = "") =>
  ["flight", "flights", "air", "airfare"].includes(type?.toLowerCase?.());
const isHotel = (type = "") =>
  ["hotel", "stay", "accommodation"].includes(type?.toLowerCase?.());
const isCar = (type = "") =>
  ["car", "cars", "rental", "rental car", "auto"].includes(
    type?.toLowerCase?.()
  );

export default function ProviderPreview({ route, navigation }) {
  const {
    provider = "Provider",
    data = {},
    type = "item",
    currency,
    serviceKey,
    serviceType,
    basePlanId,
    chatId,
  } = route.params || {};

  const providerKey = (provider || "").toLowerCase();
  const derivedType = serviceType || type;
  const commonParams = {
    data,
    currency,
    provider,
    serviceKey,
    serviceType: derivedType,
    basePlanId,
    chatId,
  };

  if (isFlight(derivedType) || providerKey.includes("expedia")) {
    return (
      <ExpediaCheckoutClone
        route={{ params: commonParams }}
        navigation={navigation}
      />
    );
  }

  if (isHotel(derivedType) || providerKey.includes("booking")) {
    return (
      <BookingCheckoutClone
        route={{ params: commonParams }}
        navigation={navigation}
      />
    );
  }

  if (isCar(derivedType) || providerKey.includes("hertz")) {
    return (
      <HertzCheckoutClone
        route={{ params: commonParams }}
        navigation={navigation}
      />
    );
  }

  return (
    <GenericCheckout
      route={{
        params: {
          provider,
          data,
          currency,
          type: derivedType,
          serviceKey,
          serviceType: derivedType,
          basePlanId,
          chatId,
        },
      }}
      navigation={navigation}
    />
  );
}
