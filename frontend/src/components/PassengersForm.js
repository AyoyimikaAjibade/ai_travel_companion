// src/components/PassengersForm.js
import React, { useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Plus, Minus } from "lucide-react-native";
import Animated, {
  FadeInDown,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SPACING, BORDER_RADIUS, COLORS } from "../theme";

export const createPassenger = (overrides = {}) => ({
  id: `passenger_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`,
  firstName: "",
  lastName: "",
  type: "adult",
  ...overrides,
});

const PASSENGER_TYPES = ["adult", "child"];

const formatType = (type) =>
  type === "child" ? "Child" : type === "adult" ? "Adult" : "Guest";

export default function PassengersForm({
  value,
  onChange,
  title = "Passengers",
  maxCount = Infinity,
  allowRemoval = true,
  showTypeToggle = true,
}) {
  const passengers =
    Array.isArray(value) && value.length ? value : [createPassenger()];

  const canAddMore = passengers.length < maxCount;
  const addBtnScale = useSharedValue(1);

  useEffect(() => {
    // Gentle pulse when the passenger list changes
    addBtnScale.value = withSequence(
      withTiming(0.95, { duration: 110 }),
      withSpring(1, { damping: 12 })
    );
  }, [passengers.length, addBtnScale]);

  const addBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addBtnScale.value }],
  }));

  const updatePassenger = (index, updates) => {
    const next = passengers.map((passenger, idx) =>
      idx === index ? { ...passenger, ...updates } : passenger
    );
    onChange?.(next);
  };

  const handleAdd = () => {
    if (!canAddMore) return;
    onChange?.([...passengers, createPassenger()]);
  };

  const handleRemove = (index) => {
    if (!allowRemoval || passengers.length <= 1) return;
    onChange?.(passengers.filter((_, idx) => idx !== index));
  };

  const toggleType = (current) => {
    const currentIndex = PASSENGER_TYPES.indexOf(current);
    const nextIndex = (currentIndex + 1) % PASSENGER_TYPES.length;
    return PASSENGER_TYPES[nextIndex];
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.countLabel}>
          {passengers.length}
          {Number.isFinite(maxCount) ? ` / ${maxCount}` : ""}
        </Text>
      </View>

      {passengers.map((passenger, index) => (
        <Animated.View
          key={passenger.id ?? `passenger-${index}`}
          style={styles.passengerCard}
          entering={FadeInDown.delay(index * 80)}
          layout={Layout.springify().damping(16)}
        >
          <View style={styles.row}>
            <View style={styles.inputBlock}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="Jane"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={passenger.firstName ?? ""}
                onChangeText={(text) =>
                  updatePassenger(index, { firstName: text })
                }
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={styles.inputBlock}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Doe"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={passenger.lastName ?? ""}
                onChangeText={(text) =>
                  updatePassenger(index, { lastName: text })
                }
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          <View style={styles.rowBetween}>
            {showTypeToggle ? (
              <TouchableOpacity
                style={styles.typePill}
                onPress={() =>
                  updatePassenger(index, {
                    type: toggleType(passenger.type ?? "adult"),
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.typePillText}>
                  {formatType(passenger.type)}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.guestLabel}>Guest</Text>
            )}

            {allowRemoval && passengers.length > 1 ? (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(index)}
                activeOpacity={0.85}
              >
                <Minus size={16} color="#fda4af" />
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </Animated.View>
      ))}

      {canAddMore ? (
        <Animated.View style={addBtnStyle}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAdd}
            activeOpacity={0.88}
          >
            <Plus size={16} color={COLORS.text} />
            <Text style={styles.addText}>Add passenger</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
  },
  countLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  passengerCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputBlock: {
    flex: 1,
  },
  label: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
  },
  typePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  typePillText: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 13,
    textTransform: "uppercase",
  },
  guestLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontFamily: "Urbanist_600SemiBold",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  removeText: {
    color: "#fda4af",
    fontSize: 13,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.45)",
    backgroundColor: "rgba(124,58,237,0.18)",
  },
  addText: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
});
