// src/components/MessageBubble.js
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import LottieView from "lottie-react-native";
import { format } from "date-fns";
import GradientBackground from "./GradientBackground";
import { COLORS, GRADIENTS, BORDER_RADIUS, SPACING } from "../theme";
import { useCurrencyConverter } from "../hooks/useCurrencyConverter";
import { formatCurrency } from "../utils/format";
import { buildServiceKey, normalizeBookingLedger } from "../utils/booking";

// 1) Static import so Metro bundles it
let LoaderPlane;
try {
  LoaderPlane = require("../../assets/lottie/loader-plane.json");
} catch (e) {
  if (__DEV__) console.warn("Lottie plane JSON not found:", e?.message);
}

// 2) Dev fallback (optional)
let DevFallback;
try {
  // Comment this if it errors in your setup
  DevFallback = require("lottie-react-native/src/js/animations/Watermelon.json");
} catch {
  /* ignore */
}

const TypingBubble = () => {
  const sourceToUse = LoaderPlane || (__DEV__ ? DevFallback : null);

  return (
    <View style={[styles.row, { justifyContent: "flex-start" }]}>
      <View style={styles.typingBubble}>
        {sourceToUse ? (
          <LottieView
            source={sourceToUse}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.lottie}
          />
        ) : (
          <View style={styles.lottieFallback}>
            <Text style={styles.fallbackText}>···</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const MessageBubble = ({
  role,
  text,
  time,
  isTyping,
  links,
  plan,
  chatId,
  booking = null,
  navigation: navigationProp, // may be passed from parent
}) => {
  const navFromHook = useNavigation();
  const navigation = navigationProp ?? navFromHook; // fallback to hook
  const { convertCurrency, targetCurrency } = useCurrencyConverter();

  const isUser = role === "user";

  const bookingLedger = React.useMemo(
    () => (booking ? normalizeBookingLedger(booking) : null),
    [booking]
  );

  const isServiceBooked = React.useCallback(
    (serviceKey) => {
      if (!serviceKey || !bookingLedger) return false;
      const record = bookingLedger.records?.[serviceKey];
      return Boolean(record && record.status !== "cancelled");
    },
    [bookingLedger]
  );

  const openServiceBooking = React.useCallback(
    (serviceKey) => {
      if (!serviceKey || !bookingLedger) return;
      navigation?.navigate?.("BookingConfirmation", {
        chatId,
        serviceKey,
      });
    },
    [bookingLedger, navigation, chatId]
  );

  if (isTyping) {
    return <TypingBubble />;
  }

  const formatDateTime = React.useCallback((value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return format(date, "MMM d, yyyy • HH:mm");
  }, []);

  const openLink = React.useCallback((url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {});
  }, []);

  const openProviderPreview = React.useCallback(
    (providerName, typeName, payload = {}) => {
      if (!navigation?.navigate) return;
      navigation.navigate("ProviderPreview", {
        provider: providerName,
        type: typeName,
        data: payload,
        currency: payload?.currency,
        chatId,
        serviceKey: payload?.serviceKey,
        serviceType: payload?.serviceType,
        basePlanId: payload?.planId || payload?.basePlanId,
      });
    },
    [navigation, chatId]
  );

  const handleBookAll = React.useCallback(
    ({
      plan: planOverride,
      basePlanId,
      flightKey,
      hotelKey,
      carKey,
      attractionDescriptors = [],
    } = {}) => {
      const sourcePlan = planOverride ?? plan;
      if (!navigation?.navigate || !sourcePlan) return;

      const effectiveBaseId =
        basePlanId ||
        sourcePlan.planId ||
        sourcePlan.slotId ||
        "plan";

      const items = [];
      const displayCurrency = targetCurrency || "USD";
      let total = 0;

      const registerItem = (label, price, meta = {}) => {
        if (price == null || Number.isNaN(Number(price))) return;
        const converted = convertCurrency(
          Number(price),
          meta.currency,
          displayCurrency
        );
        total += converted;
        items.push({
          label,
          price: converted,
          currency: displayCurrency,
          ...meta,
        });
      };

      const ensureKey = (providedKey, type, unique) =>
        providedKey || buildServiceKey(effectiveBaseId, type, unique);

      if (sourcePlan?.flight) {
        const key = ensureKey(flightKey, "flight");
        if (!isServiceBooked(key)) {
          registerItem("Flight", sourcePlan.flight.price, {
            provider: sourcePlan.flight.airline,
            description: `${sourcePlan.flight.airline ?? "Flight"} ${
              sourcePlan.flight.type ?? ""
            }`.trim(),
            currency: sourcePlan.flight.currency,
            serviceType: "flight",
            serviceKey: key,
            planData: sourcePlan.flight,
          });
        }
      }

      if (sourcePlan?.hotel) {
        const nightly = sourcePlan.hotel.price_per_night ?? sourcePlan.hotel.price;
        const hotelName = sourcePlan.hotel.name ?? "Hotel";
        const hotelDesc = sourcePlan.hotel.rating
          ? `${hotelName} (${sourcePlan.hotel.rating}★)`
          : hotelName;
        const key = ensureKey(hotelKey, "hotel");
        if (!isServiceBooked(key)) {
          registerItem("Hotel", nightly, {
            provider: hotelName,
            description: hotelDesc,
            currency: sourcePlan.hotel.currency,
            serviceType: "hotel",
            serviceKey: key,
            planData: sourcePlan.hotel,
          });
        }
      }

      if (sourcePlan?.car) {
        const carPrice =
          sourcePlan.car.total_price ??
          sourcePlan.car.price_per_day ??
          sourcePlan.car.price;
        const key = ensureKey(carKey, "car");
        if (!isServiceBooked(key)) {
          registerItem("Car", carPrice, {
            provider: sourcePlan.car.company,
            description: sourcePlan.car.car_type,
            currency: sourcePlan.car.currency,
            serviceType: "car",
            serviceKey: key,
            planData: sourcePlan.car,
          });
        }
      }

      const attractionsSource =
        attractionDescriptors.length > 0
          ? attractionDescriptors
          : Array.isArray(sourcePlan?.attractions)
          ? sourcePlan.attractions.map((attr, idx) => ({
              item: attr,
              serviceKey: ensureKey(
                null,
                "attraction",
                attr?.id ?? attr?.name ?? idx + 1
              ),
              booked: false,
              index: idx,
            }))
          : [];

      attractionsSource.forEach(({ item, serviceKey, booked, index }) => {
        const key = ensureKey(serviceKey, "attraction", item?.id ?? index + 1);
        if (isServiceBooked(key) || booked) return;
        registerItem(item.name ?? "Attraction", item.price, {
          provider: item.name,
          description: item.link,
          currency: item.currency,
          serviceType: "attraction",
          serviceKey: key,
          planData: item,
          attractionIndex: index,
        });
      });

      if (!items.length) return;

      navigation.navigate("GenericCheckout", {
        provider: "All-in-one package",
        type: "combined",
        chatId,
        data: {
          name: "Complete itinerary",
          description: "Flight, hotel, and extras in one secure checkout.",
          items,
          price: total,
          currency: displayCurrency,
          basePlanId: effectiveBaseId,
        },
      });
    },
    [
      navigation,
      plan,
      convertCurrency,
      targetCurrency,
      isServiceBooked,
    ]
  );

  const renderPlanSection = () => {
    if (!plan) return null;
    const { flight, hotel, car, attractions, planId, slotId } = plan;
    const hasAttractions = Array.isArray(attractions) && attractions.length > 0;
    const basePlanId = planId || slotId || "plan";

    const flightAvailable =
      flight && typeof flight === "object" && Object.keys(flight).length > 0;
    const hotelAvailable =
      hotel && typeof hotel === "object" && Object.keys(hotel).length > 0;
    const carAvailable =
      car && typeof car === "object" && Object.keys(car).length > 0;

    const flightKey = flightAvailable
      ? buildServiceKey(basePlanId, "flight")
      : null;
    const hotelKey = hotelAvailable
      ? buildServiceKey(basePlanId, "hotel")
      : null;
    const carKey = carAvailable ? buildServiceKey(basePlanId, "car") : null;

    const attractionDescriptors = hasAttractions
      ? attractions.map((item, idx) => {
          const unique = item?.id ?? item?.name ?? idx + 1;
          const serviceKey = buildServiceKey(basePlanId, "attraction", unique);
          return {
            item,
            index: idx,
            serviceKey,
            booked: isServiceBooked(serviceKey),
          };
        })
      : [];

    const flightBooked = flightKey ? isServiceBooked(flightKey) : false;
    const hotelBooked = hotelKey ? isServiceBooked(hotelKey) : false;
    const carBooked = carKey ? isServiceBooked(carKey) : false;

    const pendingKeys = [];
    if (flightAvailable && !flightBooked) pendingKeys.push(flightKey);
    if (hotelAvailable && !hotelBooked) pendingKeys.push(hotelKey);
    if (carAvailable && !carBooked) pendingKeys.push(carKey);
    attractionDescriptors.forEach((descriptor) => {
      if (!descriptor.booked) pendingKeys.push(descriptor.serviceKey);
    });
    const hasPendingServices = pendingKeys.length > 0;

    return (
      <View style={styles.planContainer}>
        {(planId || slotId) && (
          <View style={styles.planMeta}>
            {planId && (
              <Text style={styles.planMetaText}>Plan ID: {planId}</Text>
            )}
            {slotId && (
              <Text style={styles.planMetaText}>Slot: {slotId}</Text>
            )}
          </View>
        )}

        {flight && Object.keys(flight).length > 0 && (
          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Flight</Text>
            {flight.airline && (
              <Text style={styles.planLine}>Airline: {flight.airline}</Text>
            )}
            {flight.price != null && (
              <Text style={styles.planLine}>
                Price: {formatCurrency(
                  convertCurrency(flight.price, flight.currency, targetCurrency),
                  targetCurrency
                )}
              </Text>
            )}
            {flight.departure_time && (
              <Text style={styles.planLine}>
                Depart: {formatDateTime(flight.departure_time)}
              </Text>
            )}
            {flight.arrival_time && (
              <Text style={styles.planLine}>
                Arrive: {formatDateTime(flight.arrival_time)}
              </Text>
            )}
            {flight.link && (
              <TouchableOpacity
                style={styles.planLink}
                activeOpacity={0.85}
                onPress={() => openLink(flight.link)}
              >
                <Text style={styles.planLinkText}>Open flight details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.planCta}
              activeOpacity={0.9}
              onPress={
                flightBooked
                  ? () => openServiceBooking(flightKey)
                  : () =>
                      openProviderPreview("Expedia", "flight", {
                        ...flight,
                        price: flight.price,
                        currency: flight.currency,
                        serviceKey: flightKey,
                        serviceType: "flight",
                        planId: basePlanId,
                        basePlanId,
                      })
              }
            >
              <Text style={styles.planCtaText}>
                {flightBooked ? "View booking" : "Book with Expedia"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {hotel && Object.keys(hotel).length > 0 && (
          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Hotel</Text>
            {hotel.name && (
              <Text style={styles.planLine}>Name: {hotel.name}</Text>
            )}
            {hotel.price_per_night != null && (
              <Text style={styles.planLine}>
                Nightly: {formatCurrency(
                  convertCurrency(
                    hotel.price_per_night,
                    hotel.currency,
                    targetCurrency
                  ),
                  targetCurrency
                )}
              </Text>
            )}
            {hotel.link && (
              <TouchableOpacity
                style={styles.planLink}
                activeOpacity={0.85}
                onPress={() => openLink(hotel.link)}
              >
                <Text style={styles.planLinkText}>Open hotel details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.planCta}
              activeOpacity={0.9}
              onPress={
                hotelBooked
                  ? () => openServiceBooking(hotelKey)
                  : () =>
                      openProviderPreview("Booking.com", "hotel", {
                        ...hotel,
                        price: hotel.price_per_night ?? hotel.price,
                        currency: hotel.currency,
                        serviceKey: hotelKey,
                        serviceType: "hotel",
                        planId: basePlanId,
                        basePlanId,
                      })
              }
            >
              <Text style={styles.planCtaText}>
                {hotelBooked ? "View booking" : "Book with Booking.com"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {car && Object.keys(car).length > 0 && (
          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Car</Text>
            {car.company && (
              <Text style={styles.planLine}>Company: {car.company}</Text>
            )}
            {car.car_type && (
              <Text style={styles.planLine}>Type: {car.car_type}</Text>
            )}
            {car.price_per_day != null && (
              <Text style={styles.planLine}>
                Daily: {formatCurrency(
                  convertCurrency(car.price_per_day, car.currency, targetCurrency),
                  targetCurrency
                )}
              </Text>
            )}
            {car.link && (
              <TouchableOpacity
                style={styles.planLink}
                activeOpacity={0.85}
                onPress={() => openLink(car.link)}
              >
                <Text style={styles.planLinkText}>View car details</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.planCta}
              activeOpacity={0.9}
              onPress={
                carBooked
                  ? () => openServiceBooking(carKey)
                  : () =>
                      openProviderPreview(car.company ?? "Hertz", "car", {
                        ...car,
                        price: car.total_price ?? car.price_per_day ?? car.price,
                        currency: car.currency,
                        serviceKey: carKey,
                        serviceType: "car",
                        planId: basePlanId,
                        basePlanId,
                      })
              }
            >
              <Text style={styles.planCtaText}>
                {carBooked ? "View booking" : "Reserve this car"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {hasAttractions && (
          <View style={styles.planSection}>
            <Text style={styles.planSectionTitle}>Attractions</Text>
            {attractionDescriptors.map(({ item, serviceKey, booked }, idx) => (
              <View key={`${item.name}-${idx}`} style={styles.attractionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planLine}>{item.name}</Text>
                  {item.price != null && (
                    <Text style={styles.planSubLine}>
                      {formatCurrency(
                        convertCurrency(
                          item.price,
                          item.currency,
                          targetCurrency
                        ),
                        targetCurrency
                      )}
                    </Text>
                  )}
                </View>
                {item.link && (
                  <TouchableOpacity
                    style={styles.planLinkSmall}
                    activeOpacity={0.85}
                    onPress={
                      booked
                        ? () => openServiceBooking(serviceKey)
                        : () =>
                            openProviderPreview("Experience", "attraction", {
                              ...item,
                              price: item.price,
                              currency: item.currency,
                              serviceKey,
                              serviceType: "attraction",
                              planId: basePlanId,
                              basePlanId,
                              attractionIndex: idx,
                            })
                    }
                  >
                    <Text style={styles.planLinkTextSmall}>
                      {booked ? "View booking" : "Book"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {hasPendingServices && (
          <TouchableOpacity
            style={[styles.planCta, styles.planCtaFull]}
            activeOpacity={0.92}
            onPress={() =>
              handleBookAll({
                plan,
                basePlanId,
                flightKey,
                hotelKey,
                carKey,
                attractionDescriptors,
              })
            }
          >
            <Text style={styles.planCtaText}>Book everything together</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      {isUser ? (
        <GradientBackground
          colors={GRADIENTS.primary}
          style={styles.userBubble}
          expand={false}
        >
          {typeof text === "string" && text.length > 0 && (
            <Text style={styles.userText}>{text}</Text>
          )}
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}
        </GradientBackground>
      ) : (
        <View style={styles.botBubble}>
          {typeof text === "string" && text.length > 0 && (
            <Text style={styles.botText}>{text}</Text>
          )}
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}

          {Array.isArray(links) && links.length > 0 && (
            <View style={styles.linksRow}>
              {links.map((l, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.linkBtn}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation?.navigate("ProviderPreview", {
                      provider: l.provider,
                      type: l.type || "flight",
                      data: l.payload || {},
                    })
                  }
                >
                  <Text style={styles.linkText}>🔗 {l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {renderPlanSection()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full-width row so we can align left/right cleanly
  row: {
    width: "100%",
    flexDirection: "row",
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },

  // Bubbles wrap content and are width-capped
  userBubble: {
    maxWidth: "78%",
    alignSelf: "flex-end",
    flexShrink: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.xs,
  },
  botBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  // Typing bubble container for Lottie
  typingBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  lottie: {
    width: 180,
    height: 52,
    backgroundColor: "rgba(255,255,255,0.03)", // debug bg; remove if you want
    borderRadius: 12,
  },

  lottieFallback: {
    width: 60,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: COLORS.text,
    fontSize: 20,
    letterSpacing: 2,
  },

  userText: {
    color: "#FFFFFF",
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  botText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    alignSelf: "flex-end",
    marginTop: SPACING.xs,
  },

  // Optional link buttons under bot bubbles
  linksRow: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  linkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 8,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Urbanist_500Medium",
  },
  planContainer: {
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  planMeta: {
    gap: 2,
  },
  planMetaText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
  planSection: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  planSectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  planLine: {
    color: COLORS.text,
    fontSize: 13,
  },
  planSubLine: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  planLink: {
    marginTop: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(124,58,237,0.22)",
  },
  planLinkText: {
    color: COLORS.primary,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 13,
  },
  planCta: {
    marginTop: 8,
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  planCtaFull: {
    marginTop: SPACING.md,
  },
  planCtaText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  attractionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  planLinkSmall: {
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "rgba(124,58,237,0.22)",
  },
  planLinkTextSmall: {
    color: COLORS.primary,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 12,
  },
});

export default MessageBubble;
