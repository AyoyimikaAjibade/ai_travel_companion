// src/screens/TermsScreen.js
import React, { useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, ShieldCheck, Mail, Clock } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import GradientBackground from "../components/GradientBackground";
import { COLORS, SPACING, BORDER_RADIUS, GRADIENTS } from "../theme";

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By creating a TWOS account or using the app you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, please discontinue use of the service.",
    ],
  },
  {
    title: "2. Service Description",
    body: [
      "TWOS is an AI-powered travel planning companion. Recommendations, pricing, or inventory surfaced in the experience are for discovery purposes only and may differ from the final booking partners.",
    ],
  },
  {
    title: "3. User Responsibilities",
    body: [
      "Provide accurate account information and keep your credentials secure.",
      "Respect all applicable laws when booking or traveling to a destination.",
      "Use the chat and sharing features responsibly—abusive content is prohibited.",
    ],
  },
  {
    title: "4. Data & Privacy",
    body: [
      "Conversation snippets, saved itineraries, and preferences may be used to improve suggestions. Sensitive information is encrypted both in transit and at rest.",
      "You can request data deletion or export any time via support@twos.app.",
    ],
  },
  {
    title: "5. Liability",
    body: [
      "TWOS does not guarantee availability, pricing accuracy, or travel outcomes. We are not responsible for damages arising from itinerary changes, travel delays, or third-party services.",
    ],
  },
  {
    title: "6. Updates",
    body: [
      "We may revise these terms as the product evolves. Material changes will be highlighted inside the app. Continued use after updates constitutes acceptance.",
    ],
  },
];

const TermsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const currentYear = new Date().getFullYear();

  const handleEmailPress = useCallback(() => {
    Linking.openURL("mailto:support@twos.app").catch(() => {});
  }, []);

  return (
    <GradientBackground colors={GRADIENTS.primary} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.glowOne} />
        <View style={styles.glowTwo} />

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { top: insets.top || 16 }]}
          activeOpacity={0.85}
        >
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentWrap}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>TWOS legal framework</Text>
            <Text style={styles.title}>Terms & Conditions</Text>
            <Text style={styles.subtitle}>
              Crafted to keep every itinerary private, compliant, and respectful
              of your data sovereignty.
            </Text>
          </View>

          <LinearGradient
            colors={["rgba(15,23,42,0.95)", "rgba(67,56,202,0.55)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Policy refresh</Text>
              </View>
              <View style={styles.versionPill}>
                <Text style={styles.versionText}>v2.4</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>The rules of engagement</Text>
            <Text style={styles.heroBody}>
              This document outlines how TWOS collaborates with travelers,
              protects conversations, and the rights/responsibilities on both
              sides of the cockpit.
            </Text>

            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Clock size={18} color="#bfdbfe" />
                <View style={styles.statCopy}>
                  <Text style={styles.statLabel}>Updated {currentYear}</Text>
                  <Text style={styles.statDetail}>Reviewed quarterly</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.heroStat}>
                <ShieldCheck size={18} color="#c7f9cc" />
                <View style={styles.statCopy}>
                  <Text style={styles.statLabel}>Security-first</Text>
                  <Text style={styles.statDetail}>
                    Zero-trust encrypted storage
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionList}>
            {sections.map((section, index) => (
              <View style={styles.sectionCard} key={section.title}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIndex}>
                    <Text style={styles.sectionIndexText}>
                      {(index + 1).toString().padStart(2, "0")}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{section.title}</Text>
                </View>
                {section.body.map((paragraph, bodyIndex) => (
                  <Text style={styles.cardBody} key={bodyIndex}>
                    {paragraph}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={handleEmailPress}
            activeOpacity={0.9}
          >
            <View style={styles.contactIcon}>
              <Mail size={18} color="#0f172a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactTitle}>Need clarification?</Text>
              <Text style={styles.contactBody}>
                Ping our privacy desk at support@twos.app — we reply within a
                day.
              </Text>
            </View>
          </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  glowOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(14,165,233,0.26)",
    top: -40,
    right: -90,
  },
  glowTwo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(59,130,246,0.2)",
    bottom: -30,
    left: -70,
  },
  backBtn: {
    position: "absolute",
    left: SPACING.md,
    zIndex: 50,
    backgroundColor: "rgba(15,23,42,0.5)",
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  contentWrap: {
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  eyebrow: {
    color: COLORS.secondary,
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  title: {
    color: COLORS.text,
    fontSize: 34,
    fontFamily: "Urbanist_700Bold",
  },
  subtitle: {
    color: "rgba(226,232,240,0.9)",
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    shadowColor: "#020617",
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  heroBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.25)",
  },
  heroBadgeText: {
    color: "#dbeafe",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: "Urbanist_600SemiBold",
  },
  versionPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.35)",
  },
  versionText: {
    color: "#f0fdf4",
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: "Urbanist_700Bold",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.xs,
  },
  heroBody: {
    color: "rgba(226,232,240,0.9)",
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statCopy: { marginLeft: SPACING.sm },
  statLabel: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  statDetail: {
    color: "rgba(226,232,240,0.9)",
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginHorizontal: SPACING.md,
  },
  sectionList: {
    gap: SPACING.md,
  },
  sectionCard: {
    backgroundColor: "rgba(4,7,16,0.92)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  sectionIndex: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(59,130,246,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  sectionIndexText: {
    color: "#bfdbfe",
    fontFamily: "Urbanist_600SemiBold",
    letterSpacing: 1,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
    flex: 1,
  },
  cardBody: {
    color: "rgba(226,232,240,0.85)",
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    gap: SPACING.md,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#bbf7d0",
    alignItems: "center",
    justifyContent: "center",
  },
  contactTitle: {
    color: "#0f172a",
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
  },
  contactBody: {
    color: "#1e293b",
    marginTop: 4,
    lineHeight: 20,
  },
});

export default TermsScreen;
