// src/screens/LoginScreen.js
import React, { useCallback, useState } from "react";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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

      if (!accessToken) {
        throw new Error("Missing access token in login response.");
      }

      let profile = authResponse?.user;

      if (!profile) {
        profile = await getCurrentUser(accessToken);
      }

      setSession({ user: profile, accessToken });
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
    <GradientBackground colors={GRADIENTS.indigo} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        {/* Back */}
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
          <View style={styles.header}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue planning trips.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputRow}>
              <User size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputRow}>
              <Lock size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                returnKeyType="done"
              />
            </View>

            <TouchableOpacity
              style={styles.forgot}
              onPress={openReset}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.actionInner}>
                  <Text style={styles.actionText}>Sign in</Text>
                  <ArrowRight size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.altRow}>
              <Text style={styles.altText}>No account yet?</Text>
              <TouchableOpacity onPress={() => navigation.replace("Signup")}>
                <Text style={styles.altLink}> Create one</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Fast, private, demo-only sign in.
            </Text>
          </View>
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
  backBtn: {
    position: "absolute",
    left: 12,
    zIndex: 30,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 8,
    borderRadius: 10,
  },
  container: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: "space-between",
  },
  header: { alignItems: "center", marginTop: -SPACING.xl },
  logo: { width: 200, height: 200, marginBottom: -SPACING.md },
  title: {
    color: "#fff",
    fontSize: 26,
    fontFamily: "Urbanist_700Bold",
  },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    marginTop: SPACING.xs,
    fontSize: 14,
  },

  card: {
    marginTop: -SPACING.xxl * 2.5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.sm,
  },
  input: {
    marginLeft: SPACING.sm,
    color: "#fff",
    flex: 1,
    fontSize: 15,
  },

  forgot: { alignItems: "flex-end", marginTop: SPACING.xs },
  forgotText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },

  actionBtn: {
    marginTop: SPACING.md,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#0b84ff",
    shadowColor: "#0b84ff",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  actionInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  actionText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Urbanist_600SemiBold",
  },
  altRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  altText: { color: "rgba(255,255,255,0.7)" },
  altLink: { color: "#fff", fontFamily: "Urbanist_600SemiBold" },

  footer: { alignItems: "center", paddingBottom: SPACING.lg },
  footerText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    textAlign: "center",
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
