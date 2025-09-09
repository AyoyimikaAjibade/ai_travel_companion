// src/screens/SettingsScreen.js
import React from "react";
import { View, Text, ScrollView, Switch, StyleSheet } from "react-native";
import { useSessionStore } from "../stores/sessionStore";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";

const SettingsScreen = () => {
  const preferences = useSessionStore((state) => state.preferences);
  const updatePreferences = useSessionStore((state) => state.updatePreferences);

  const handleToggle = (key) => (value) => {
    updatePreferences({ [key]: value });
  };

  const handleRatingChange = (value) => {
    updatePreferences({ minRating: value });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Minimum Hotel Rating</Text>
            <Text style={styles.settingDescription}>
              Only show hotels with this rating or higher
            </Text>
          </View>
          <View style={styles.rating}>
            {[3, 4, 5].map((rating) => (
              <Text
                key={rating}
                style={[
                  styles.ratingOption,
                  preferences.minRating === rating &&
                    styles.ratingOptionSelected,
                ]}
                onPress={() => handleRatingChange(rating)}
              >
                {rating}+
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Include Breakfast</Text>
            <Text style={styles.settingDescription}>
              Prefer hotels with breakfast included
            </Text>
          </View>
          <Switch
            value={preferences.breakfastIncluded}
            onValueChange={handleToggle("breakfastIncluded")}
            trackColor={{ false: "#767577", true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Include Rental Car</Text>
            <Text style={styles.settingDescription}>
              Add a rental car to packages by default
            </Text>
          </View>
          <Switch
            value={preferences.carIncluded}
            onValueChange={handleToggle("carIncluded")}
            trackColor={{ false: "#767577", true: COLORS.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <View style={styles.setting}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Currency</Text>
            <Text style={styles.settingDescription}>
              Display prices in this currency
            </Text>
          </View>
          <View style={styles.currency}>
            {["USD", "EUR", "GBP"].map((currency) => (
              <Text
                key={currency}
                style={[
                  styles.currencyOption,
                  preferences.currency === currency &&
                    styles.currencyOptionSelected,
                ]}
                onPress={() => updatePreferences({ currency })}
              >
                {currency}
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          TWOS (Travel WithOut Stress) helps you plan perfect trips through
          natural conversation. No forms, no stress — just tell us what you
          want!
        </Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 20,
    marginBottom: SPACING.md,
  },
  setting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 16,
    marginBottom: SPACING.xs,
  },
  settingDescription: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_400Regular",
    fontSize: 14,
  },
  rating: {
    flexDirection: "row",
  },
  ratingOption: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_500Medium",
    fontSize: 14,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.xs,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  ratingOptionSelected: {
    color: COLORS.text,
    backgroundColor: COLORS.primary,
  },
  currency: {
    flexDirection: "row",
  },
  currencyOption: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_500Medium",
    fontSize: 14,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.xs,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  currencyOptionSelected: {
    color: COLORS.text,
    backgroundColor: COLORS.primary,
  },
  aboutText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  version: {
    color: COLORS.textMuted,
    fontFamily: "Urbanist_400Regular",
    fontSize: 14,
  },
});

export default SettingsScreen;
