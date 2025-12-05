// src/screens/LoginScreen.js
import React, { useCallback, useRef, useState } from "react";
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
  Modal,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import GradientBackground from "../components/GradientBackground";
import { login, getCurrentUser, requestPasswordReset } from "../lib/api";
import { useSessionStore } from "../stores/sessionStore";
import { SPACING, COLORS, GRADIENTS, BORDER_RADIUS } from "../theme";
import {
  User,
  Lock,
  ArrowRight,
  ArrowLeft,
  Mail,
  ClipboardCopy,
  CheckCircle,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResponse, setResetResponse] = useState(null);
  const [copied, setCopied] = useState(false);
  const setSession = useSessionStore((s) => s.setSession);
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const validate = () => {
    if (!username.trim()) return "Enter your username.";
    if (!password.length) return "Enter your password.";
    return null;
  };

  const handleLogin = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Login", err);
      return;
    }

    setLoading(true);
    try {
      const authResponse = await login({ username, password });
      const accessToken =
        authResponse?.access_token ?? authResponse?.token ?? null;
      const refreshToken =
        authResponse?.refresh_token ?? authResponse?.refreshToken ?? null;
      const userIdFromAuth =
        authResponse?.user_id ?? authResponse?.userId ?? null;

      if (!accessToken) {
        throw new Error("Missing access token in login response.");
      }

      let profile = authResponse?.user;

      if (!profile) {
        profile = await getCurrentUser(accessToken);
      }

      const derivedUserId =
        userIdFromAuth ??
        profile?.id ??
        profile?.user_id ??
        profile?.userId ??
        null;

      setSession({
        user: profile,
        accessToken,
        refreshToken,
        userId: derivedUserId,
      });
      Alert.alert("Welcome back", "You are logged in.");
      navigation.replace("Main", { screen: "Chat" });
    } catch (error) {
      const message =
        error?.message ?? "Something went wrong while signing you in.";
      Alert.alert("Login failed", message);
    } finally {
      setLoading(false);
    }
  };

  const openReset = () => {
    setResetVisible(true);
    setResetEmail("");
    setResetResponse(null);
    setCopied(false);
  };

  const closeReset = () => {
    if (resetLoading) return;
    setResetVisible(false);
  };

  const handleResetSubmit = async () => {
    const email = resetEmail.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert("Password reset", "Enter a valid email address.");
      return;
    }

    setResetLoading(true);
    setResetResponse(null);
    setCopied(false);
    try {
      const response = await requestPasswordReset(email);
      setResetResponse(response);
    } catch (error) {
      const message =
        error?.message ?? "We could not request a reset right now.";
      Alert.alert("Password reset failed", message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyTempPassword = useCallback(async () => {
    if (!resetResponse?.temporary_password) return;
    await Clipboard.setStringAsync(resetResponse.temporary_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [resetResponse]);

  return (
    <GradientBackground colors={GRADIENTS.primary} style={styles.bg}>
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
            <View style={styles.heroSection}>
              <LinearGradient
                colors={["rgba(15,23,42,0.85)", "rgba(67,56,202,0.65)"]}
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
                  <View style={styles.logoTextWrap}>
                    <Text style={styles.brandName}>TWOS</Text>
                    <Text style={styles.brandSub}>Travel Operating System</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>v2.4</Text>
                  </View>
                </View>

                <Text style={styles.heroTitle}>Return to mission control</Text>
                <Text style={styles.heroSubtitle}>
                  Your AI concierge kept every itinerary on standby.
                </Text>

                <View style={styles.heroMetaRow}>
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaValue}>140+</Text>
                    <Text style={styles.metaLabel}>
                      smart drafts synced today
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaBlock}>
                    <Text style={styles.metaValue}>Live</Text>
                    <Text style={styles.metaLabel}>concierge status</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.formEyebrow}>Sign back in</Text>
              <Text style={styles.formTitle}>Unlock your personal co-pilot</Text>
              <Text style={styles.formSubtitle}>
                Secure workspace access with enterprise-grade auth.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.inputRow}>
                  <User size={18} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    placeholder="alex.mercer"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={username}
                    onChangeText={setUsername}
                    style={styles.input}
                    autoCapitalize="none"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus?.()}
                    ref={usernameRef}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TouchableOpacity onPress={openReset} activeOpacity={0.85}>
                    <Text style={styles.inlineAction}>forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputRow}>
                  <Lock size={18} color="rgba(255,255,255,0.7)" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="rgba(255,255,255,0.45)"
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                    returnKeyType="go"
                    blurOnSubmit={false}
                    onSubmitEditing={handleLogin}
                    ref={passwordRef}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#22d3ee", "#7c3aed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.primaryBtnInner}>
                      <Text style={styles.actionText}>Enter cockpit</Text>
                      <View style={styles.primaryBtnIcon}>
                        <ArrowRight size={18} color="#fff" />
                      </View>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.replace("Signup")}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryText}>
                  Need an account? Launch one
                </Text>
              </TouchableOpacity>

              <View style={styles.trustRow}>
                <View style={styles.trustDot} />
                <Text style={styles.trustCopy}>
                  Traveler data stays encrypted end-to-end.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Modal
        visible={resetVisible}
        animationType="slide"
        transparent
        onRequestClose={closeReset}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset your password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your account email to receive a temporary password.
            </Text>

            <View style={[styles.inputRow, styles.modalInputRow]}>
              <Mail size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={resetEmail}
                onChangeText={setResetEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>

            {resetResponse && (
              <View style={styles.resetResult}>
                <CheckCircle size={24} color="#34d399" />
                <View style={styles.resetTextWrap}>
                  <Text style={styles.resetMsg}>
                    {resetResponse.msg ??
                      "Password reset successful. Use the temporary password to login and then change it."}
                  </Text>
                  {!!resetResponse?.note && (
                    <Text style={styles.resetNote}>{resetResponse.note}</Text>
                  )}
                </View>
                {resetResponse?.temporary_password ? (
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={handleCopyTempPassword}
                    activeOpacity={0.85}
                  >
                    <ClipboardCopy size={18} color="#fff" />
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {resetResponse?.temporary_password ? (
              <View style={styles.tempPasswordCard}>
                <Text style={styles.tempPasswordLabel}>Temporary password</Text>
                <Text style={styles.tempPasswordValue}>
                  {resetResponse.temporary_password}
                </Text>
                {copied ? (
                  <Text style={styles.copiedHint}>Copied to clipboard</Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalCancel,
                  resetLoading && styles.modalButtonDisabled,
                ]}
                onPress={closeReset}
                disabled={resetLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmit,
                  resetLoading && styles.modalButtonDisabled,
                ]}
                onPress={handleResetSubmit}
                disabled={resetLoading}
                activeOpacity={0.85}
              >
                {resetLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalButtonText}>Send reset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  glowOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 260 / 2,
    backgroundColor: "rgba(14,165,233,0.32)",
    top: -40,
    right: -80,
    opacity: 0.82,
  },
  glowTwo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 200 / 2,
    backgroundColor: "rgba(15,118,110,0.35)",
    bottom: 80,
    left: -60,
    opacity: 0.7,
  },
  backBtn: {
    position: "absolute",
    left: 12,
    zIndex: 30,
    backgroundColor: "rgba(6,182,212,0.15)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: "flex-end",
  },
  heroSection: {
    marginBottom: SPACING.lg,
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 10,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  logo: { width: 56, height: 56, marginRight: SPACING.sm },
  logoTextWrap: { flex: 1 },
  brandName: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  brandSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.32)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Urbanist_600SemiBold",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    backgroundColor: "rgba(15,23,42,0.5)",
    borderRadius: BORDER_RADIUS.lg,
  },
  metaBlock: { flex: 1 },
  metaValue: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  metaLabel: {
    color: "rgba(226,232,240,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: SPACING.sm,
  },
  formCard: {
    backgroundColor: "rgba(6,11,25,0.85)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    shadowColor: "#020617",
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 14,
  },
  formEyebrow: {
    color: COLORS.secondary,
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  formTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 24,
  },
  formSubtitle: {
    color: "rgba(148,163,184,0.9)",
    marginTop: 4,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    color: "rgba(255,255,255,0.75)",
    marginBottom: SPACING.xs / 2,
    fontSize: 13,
    fontFamily: "Urbanist_600SemiBold",
  },
  inlineAction: {
    color: "#38bdf8",
    fontSize: 13,
    fontFamily: "Urbanist_600SemiBold",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.9)",
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
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  primaryBtnIcon: {
    marginLeft: SPACING.sm,
  },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Urbanist_600SemiBold",
  },
  secondaryBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  secondaryText: {
    color: "#e0f2fe",
    fontSize: 14,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.md,
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: SPACING.sm,
  },
  trustCopy: {
    color: "rgba(148,163,184,0.9)",
    flex: 1,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(4,6,14,0.85)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: "rgba(16,23,42,0.98)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  modalTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    fontSize: 20,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: SPACING.md,
    fontSize: 14,
  },
  modalInputRow: {
    marginBottom: SPACING.md,
  },
  resetResult: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(34,197,94,0.12)",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  resetTextWrap: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  resetMsg: {
    color: "#dcfce7",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  resetNote: {
    color: "rgba(220,252,231,0.8)",
    fontSize: 12,
  },
  copyBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(34,197,94,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  tempPasswordCard: {
    backgroundColor: "rgba(148,163,184,0.1)",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  tempPasswordLabel: {
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  tempPasswordValue: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    letterSpacing: 1.2,
    fontSize: 16,
  },
  copiedHint: {
    marginTop: 6,
    color: "rgba(34,197,94,0.8)",
    fontSize: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: SPACING.md,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
  },
  modalCancel: {
    backgroundColor: "rgba(148,163,184,0.18)",
  },
  modalSubmit: {
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
});
