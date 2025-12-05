// src/screens/SettingsScreen.js
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Image } from "expo-image";
import { useSessionStore } from "../stores/sessionStore";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { ChevronRight, LogOut } from "lucide-react-native";

const SettingsScreen = ({ navigation }) => {
  // keep using your session store for preferences & user
  const preferences = useSessionStore((s) => s.preferences);
  const updatePreferences = useSessionStore((s) => s.updatePreferences);
  const user = useSessionStore((s) => s.user);
  const clearSession = useSessionStore((s) => s.clearSession);
  const clearSavedChats = useSavedChatsStore((s) => s.clearAll);

  const profileName = React.useMemo(() => {
    if (!user) return "Guest";
    const first = user.first_name ?? user.firstName ?? "";
    const last = user.last_name ?? user.lastName ?? "";
    const full = [first, last].filter(Boolean).join(" ").trim();
    if (full) return full;
    return user.username ?? user.email ?? "Guest";
  }, [user]);

  const profileEmail = React.useMemo(() => {
    if (!user) return "Sign in to sync across devices";
    return user.email ?? "No email on file";
  }, [user]);

  const handleToggle = (key) => (value) => {
    updatePreferences({ [key]: value });
  };

  const handleRatingChange = (value) => {
    updatePreferences({ minRating: value });
  };

  const onSignOut = () => {
    // if clearSession exists, call it; otherwise navigate to Login
    try {
      if (clearSession) clearSession();
      if (clearSavedChats) clearSavedChats();
    } catch {}
    navigation.replace("Login");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: SPACING.xl }}
    >
      <View style={styles.top}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={
                user?.avatar
                  ? { uri: user.avatar }
                  : require("../../assets/profile-placeholder.png")
              }
              style={styles.avatar}
              contentFit="cover"
              contentPosition="top"
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileEmail}>{profileEmail}</Text>
          </View>

          <TouchableOpacity
            style={styles.profileAction}
            onPress={() => {
              if (user) navigation.navigate("Profile");
              else navigation.navigate("Login");
            }}
          >
            <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Minimum hotel rating</Text>
            <Text style={styles.rowDesc}>
              Only show hotels with this rating or higher
            </Text>
          </View>
          <View style={styles.rating}>
            {[3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => handleRatingChange(rating)}
                style={[
                  styles.ratingOption,
                  preferences.minRating === rating &&
                    styles.ratingOptionSelected,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.ratingText,
                    preferences.minRating === rating &&
                      styles.ratingTextSelected,
                  ]}
                >
                  {rating}+
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Include breakfast</Text>
            <Text style={styles.rowDesc}>
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

        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Include rental car</Text>
            <Text style={styles.rowDesc}>
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

        {!user ? (
          <>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("Signup")}
              activeOpacity={0.85}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Create account</Text>
                <Text style={styles.actionDesc}>
                  Save trips and manage bookings
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.85}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Sign in</Text>
                <Text style={styles.actionDesc}>Access your saved trips</Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.85}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Account settings</Text>
                <Text style={styles.actionDesc}>
                  Manage your profile and bookings
                </Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={onSignOut}
              activeOpacity={0.85}
            >
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Sign out</Text>
                <Text style={styles.actionDesc}>Log out from this device</Text>
              </View>
              <LogOut size={18} color="#f87171" />
            </TouchableOpacity>
          </>
        )}

        <View style={[styles.row, { marginTop: SPACING.md }]}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Currency</Text>
            <Text style={styles.rowDesc}>Display prices in this currency</Text>
          </View>
          <View style={styles.currency}>
            {["USD", "EUR", "GBP"].map((currency) => (
              <TouchableOpacity
                key={currency}
                onPress={() => updatePreferences({ currency })}
                style={[
                  styles.currencyOption,
                  preferences.currency === currency &&
                    styles.currencyOptionSelected,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.currencyText,
                    preferences.currency === currency &&
                      styles.currencyTextSelected,
                  ]}
                >
                  {currency}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          TWOS helps you plan trips through natural conversation. Tell the app
          what you want and it finds options.
        </Text>
        <Text style={styles.version}>Version 1.0.0</Text>

        <TouchableOpacity
          style={[styles.actionRow, { marginTop: SPACING.md }]}
          onPress={() => navigation.navigate("Terms")}
          activeOpacity={0.85}
        >
          <View style={styles.actionInfo}>
            <Text style={styles.actionTitle}>Terms & Conditions</Text>
            <Text style={styles.actionDesc}>
              Understand how we handle data and responsibilities
            </Text>
          </View>
          <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    paddingTop: 80,
  },
  top: { marginBottom: SPACING.md },

  profileCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 64, height: 64 },
  profileInfo: { flex: 1, marginLeft: SPACING.md },
  profileName: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Urbanist_600SemiBold",
  },
  profileAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileEmail: { color: "rgba(255,255,255,0.6)", marginTop: 4 },

  section: { marginBottom: SPACING.lg },

  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
    marginBottom: SPACING.md,
  },

  row: {
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },

  rowInfo: { flex: 1, marginRight: SPACING.md },
  rowTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  rowDesc: { color: "rgba(255,255,255,0.6)", marginTop: 4 },

  rating: { flexDirection: "row" },
  ratingOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginLeft: SPACING.xs,
  },
  ratingOptionSelected: { backgroundColor: COLORS.primary },
  ratingText: { color: "rgba(255,255,255,0.7)" },
  ratingTextSelected: { color: COLORS.text },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: "rgba(255,255,255,0.02)",
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },

  actionInfo: { flex: 1, marginRight: SPACING.md },
  actionTitle: { color: COLORS.text, fontFamily: "Urbanist_600SemiBold" },
  actionDesc: { color: "rgba(255,255,255,0.6)", marginTop: 4 },

  currency: { flexDirection: "row" },
  currencyOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.03)",
    marginLeft: SPACING.xs,
  },
  currencyOptionSelected: { backgroundColor: COLORS.primary },
  currencyText: { color: "rgba(255,255,255,0.7)" },
  currencyTextSelected: { color: COLORS.text },

  aboutText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  version: { color: "rgba(255,255,255,0.6)" },
});

export default SettingsScreen;
