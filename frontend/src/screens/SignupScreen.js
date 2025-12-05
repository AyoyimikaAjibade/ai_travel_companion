// src/screens/SignupScreen.js
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import GradientBackground from "../components/GradientBackground";
import { register } from "../lib/api";
import { SPACING, COLORS, GRADIENTS, BORDER_RADIUS } from "../theme";
import { UserPlus, Mail, Lock, ArrowLeft } from "lucide-react-native";

export default function SignupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = () => {
    if (!username.trim()) return "Enter a username.";
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email))
      return "Enter a valid email.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSignup = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Signup", err);
      return;
    }

    setLoading(true);
    try {
      await register({ username, email, password });
      Alert.alert("Account created", "You can now sign in.");
      navigation.replace("Login");
    } catch (error) {
      const message =
        error?.message ?? "Something went wrong while creating your account.";
      Alert.alert("Signup failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground colors={GRADIENTS.sky} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { top: insets.top || 12 }]}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient
              colors={["rgba(15,118,110,0.8)", "rgba(12,74,110,0.65)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.logoRow}>
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.logoCopy}>
                  <Text style={styles.brandName}>TWOS</Text>
                  <Text style={styles.brandSub}>AI Travel Companion</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Claim your cockpit seat</Text>
              <Text style={styles.heroSubtitle}>
                Design cinematic trips, sync with teams, and co-build with your
                AI concierge.
              </Text>

              <View style={styles.heroChips}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Realtime pricing radar</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Shared mission logs</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Priority concierge access</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.formCard}>
              <Text style={styles.formEyebrow}>Create profile</Text>
              <Text style={styles.formTitle}>
                We just need the essentials to launch you.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.inputRow}>
                  <UserPlus size={18} color="rgba(255,255,255,0.8)" />
                  <TextInput
                    placeholder="captain.rivera"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    ref={usernameRef}
                    onSubmitEditing={() => emailRef.current?.focus?.()}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.inputRow}>
                  <Mail size={18} color="rgba(255,255,255,0.8)" />
                  <TextInput
                    placeholder="you@orbit.studio"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    ref={emailRef}
                    onSubmitEditing={() => passwordRef.current?.focus?.()}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                  <Lock size={18} color="rgba(255,255,255,0.8)" />
                  <TextInput
                    placeholder="Use 6+ characters"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                    returnKeyType="go"
                    blurOnSubmit={false}
                    ref={passwordRef}
                    onSubmitEditing={handleSignup}
                    underlineColorAndroid="transparent"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleSignup}
                activeOpacity={0.9}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#06b6d4", "#8b5cf6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnText}>Activate account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.altRow}>
                <Text style={styles.altText}>Already mission-ready?</Text>
                <TouchableOpacity onPress={() => navigation.replace("Login")}>
                  <Text style={styles.altLink}> Sign in</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.disclaimer}>
                By creating an account you agree to the TWOS terms and the
                promise to keep exploring.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  glowOne: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 240 / 2,
    backgroundColor: "rgba(8,145,178,0.35)",
    top: -60,
    right: -70,
    opacity: 0.8,
  },
  glowTwo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 200 / 2,
    backgroundColor: "rgba(14,165,233,0.35)",
    bottom: -30,
    left: -60,
    opacity: 0.7,
  },
  backBtn: {
    position: "absolute",
    left: 12,
    zIndex: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: "flex-end",
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(94,234,212,0.3)",
    shadowColor: "#0f172a",
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 12,
    marginBottom: SPACING.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: SPACING.sm,
  },
  logoCopy: { flex: 1 },
  brandName: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
    letterSpacing: 1.2,
  },
  brandSub: {
    color: "rgba(226,232,240,0.8)",
    fontSize: 13,
    marginTop: 2,
  },
  heroTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 26,
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    color: "rgba(226,232,240,0.8)",
    fontSize: 14,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    backgroundColor: "rgba(15,23,42,0.35)",
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chipText: {
    color: "#e0f2fe",
    fontSize: 12,
  },
  formCard: {
    backgroundColor: "rgba(4,7,16,0.85)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    shadowColor: "#020617",
    shadowOpacity: 0.75,
    shadowRadius: 30,
    elevation: 14,
  },
  formEyebrow: {
    color: COLORS.secondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontSize: 13,
    marginBottom: 4,
  },
  formTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 22,
    marginBottom: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.75)",
    marginBottom: SPACING.xs / 2,
    fontSize: 13,
    fontFamily: "Urbanist_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.85)",
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1,
    marginLeft: SPACING.sm,
    color: "#fff",
    fontSize: 15,
    fontFamily: "Urbanist_500Medium",
  },
  primaryBtn: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  primaryBtnGradient: {
    alignItems: "center",
    paddingVertical: 16,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Urbanist_600SemiBold",
  },
  altRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  altText: { color: "rgba(226,232,240,0.75)" },
  altLink: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
  },
  disclaimer: {
    color: "rgba(148,163,184,0.9)",
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.md,
    lineHeight: 18,
  },
});
