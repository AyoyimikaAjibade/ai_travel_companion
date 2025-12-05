// src/screens/ProfileScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import { ArrowLeft } from "lucide-react-native";
import GradientBackground from "../components/GradientBackground";
import { GRADIENTS, SPACING, COLORS, BORDER_RADIUS } from "../theme";
import { getCurrentUser, updateCurrentUser, changePassword } from "../lib/api";
import { useSessionStore } from "../stores/sessionStore";

const normalizeUser = (user = {}) => ({
  username: user.username ?? "",
  email: user.email ?? "",
  firstName: user.first_name ?? user.firstName ?? "",
  lastName: user.last_name ?? user.lastName ?? "",
});

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const accessToken = useSessionStore((s) => s.accessToken);
  const sessionUser = useSessionStore((s) => s.user);
  const setSession = useSessionStore((s) => s.setSession);
  const updateUser = useSessionStore((s) => s.updateUser);

  const [form, setForm] = useState(normalizeUser(sessionUser));
  const [initialForm, setInitialForm] = useState(normalizeUser(sessionUser));
  const [loading, setLoading] = useState(!sessionUser);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const isDirty = useMemo(() => {
    return (
      form.username !== initialForm.username ||
      form.email !== initialForm.email ||
      form.firstName !== initialForm.firstName ||
      form.lastName !== initialForm.lastName
    );
  }, [form, initialForm]);

  const canChangePassword = useMemo(() => {
    const current = passwordForm.currentPassword.trim();
    const next = passwordForm.newPassword.trim();
    if (!current || !next) return false;
    if (current === next) return false;
    if (next.length < 6) return false;
    return true;
  }, [passwordForm]);

  useEffect(() => {
    if (!accessToken) {
      Alert.alert(
        "Session expired",
        "Please sign in again to manage your profile.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }]
      );
      return;
    }

    let mounted = true;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const profile = await getCurrentUser(accessToken);
        if (!mounted) return;
        const normalized = normalizeUser(profile);
        setForm(normalized);
        setInitialForm(normalized);
        setSession({ user: profile, accessToken });
      } catch (error) {
        if (!mounted) return;
        const message =
          error?.message ?? "Unable to load your profile right now.";
        Alert.alert("Profile", message, [
          { text: "Retry", onPress: fetchProfile },
          { text: "Cancel", style: "cancel" },
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      mounted = false;
    };
  }, [accessToken, navigation, setSession]);

  useEffect(() => {
    if (sessionUser) {
      const normalized = normalizeUser(sessionUser);
      setForm(normalized);
      setInitialForm(normalized);
      setLoading(false);
    }
  }, [sessionUser]);

  const handleChange = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePasswordFieldChange = (key) => (value) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdate = async () => {
    if (!accessToken) return;
    if (!isDirty) return;

    const payload = {
      username: form.username?.trim() ?? "",
      email: form.email?.trim() ?? "",
      first_name: form.firstName?.trim() ?? "",
      last_name: form.lastName?.trim() ?? "",
    };

    if (!payload.username || !payload.email) {
      Alert.alert("Profile", "Username and email are required.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCurrentUser(accessToken, payload);
      const normalized = normalizeUser(updated);
      setForm(normalized);
      setInitialForm(normalized);
      updateUser(updated);
      Alert.alert("Profile updated", "Your details have been saved.");
    } catch (error) {
      const message =
        error?.message ?? "We could not update your profile right now.";
      Alert.alert("Update failed", message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!accessToken || !canChangePassword) return;

    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();

    setChangingPassword(true);
    try {
      await changePassword(accessToken, { currentPassword, newPassword });
      setPasswordForm({ currentPassword: "", newPassword: "" });
      Alert.alert("Password updated", "Your password has been changed.");
    } catch (error) {
      const message =
        error?.message ?? "We could not change your password right now.";
      Alert.alert("Change password failed", message);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <GradientBackground colors={GRADIENTS.indigo} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { top: insets.top || 12 }]}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          // keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + SPACING.xl },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={styles.header}
              entering={FadeInDown.duration(320)}
              layout={Layout.springify().damping(18)}
            >
              <Text style={styles.title}>Your profile</Text>
              <Text style={styles.subtitle}>
                Keep your account details up to date.
              </Text>
            </Animated.View>

            <Animated.View
              style={styles.card}
              entering={FadeInUp.delay(120)}
              layout={Layout.springify().damping(18)}
            >
              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : (
                <>
                  <Text style={styles.groupTitle}>Profile details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                      value={form.username}
                      onChangeText={handleChange("username")}
                      placeholder="Username"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.input}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="username"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      value={form.email}
                      onChangeText={handleChange("email")}
                      placeholder="Email"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.rowInputs}>
                    <View
                      style={[
                        styles.inputGroup,
                        styles.rowInput,
                        styles.rowInputLeft,
                      ]}
                    >
                      <Text style={styles.label}>First name</Text>
                      <TextInput
                        value={form.firstName}
                        onChangeText={handleChange("firstName")}
                        placeholder="First name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        style={styles.input}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>

                    <View
                      style={[
                        styles.inputGroup,
                        styles.rowInput,
                        styles.rowInputRight,
                      ]}
                    >
                      <Text style={styles.label}>Last name</Text>
                      <TextInput
                        value={form.lastName}
                        onChangeText={handleChange("lastName")}
                        placeholder="Last name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        style={styles.input}
                        autoCapitalize="words"
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={handleUpdate}
                    style={[
                      styles.updateBtn,
                      (!isDirty || saving) && styles.updateBtnDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={!isDirty || saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.updateText}>Update profile</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider} />

                  <Text style={styles.groupTitle}>Change password</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Current password</Text>
                    <TextInput
                      value={passwordForm.currentPassword}
                      onChangeText={handlePasswordFieldChange("currentPassword")}
                      placeholder="Current password"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.input}
                      secureTextEntry
                      textContentType="password"
                      returnKeyType="next"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>New password</Text>
                    <TextInput
                      value={passwordForm.newPassword}
                      onChangeText={handlePasswordFieldChange("newPassword")}
                      placeholder="New password"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      style={styles.input}
                      secureTextEntry
                      textContentType="newPassword"
                      returnKeyType="done"
                      onSubmitEditing={handlePasswordChange}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handlePasswordChange}
                    style={[
                      styles.updateBtn,
                      (!canChangePassword || changingPassword) &&
                        styles.updateBtnDisabled,
                    ]}
                    activeOpacity={0.85}
                    disabled={!canChangePassword || changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.updateText}>Update password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

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
    // justifyContent: "space-between",
  },
  header: { marginTop: SPACING.lg },
  title: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Urbanist_700Bold",
  },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: SPACING.xs,
    fontSize: 14,
  },
  card: {
    marginTop: SPACING.xl,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingWrap: {
    paddingVertical: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  inputGroup: { marginBottom: SPACING.md },
  label: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 6,
    fontFamily: "Urbanist_500Medium",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: "row",
    marginBottom: SPACING.lg,
  },
  rowInput: {
    flex: 1,
  },
  rowInputLeft: {
    marginRight: SPACING.sm,
  },
  rowInputRight: {
    marginLeft: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: SPACING.lg,
  },
  updateBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
  },
  updateBtnDisabled: {
    opacity: 0.6,
  },
  updateText: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
  },
});

export default ProfileScreen;
