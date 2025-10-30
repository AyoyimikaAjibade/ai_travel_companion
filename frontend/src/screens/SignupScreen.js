// src/screens/SignupScreen.js
import React, { useState } from "react";
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
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
        {/* Back button */}
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
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>
              Save trips, sync across devices.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputRow}>
              <UserPlus size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                returnKeyType="next"
                underlineColorAndroid="transparent"
              />
            </View>

            <View style={styles.inputRow}>
              <Mail size={18} color="rgba(255,255,255,0.7)" />
              <TextInput
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.55)"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                underlineColorAndroid="transparent"
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
                underlineColorAndroid="transparent"
              />
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleSignup}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionText}>Create account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.altRow}>
              <Text style={styles.altText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
                <Text style={styles.altLink}> Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By creating an account you agree to the TWOS terms of service.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    marginTop: -SPACING.xxl * 1.5,
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
});
