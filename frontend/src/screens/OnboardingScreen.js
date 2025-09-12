// src/screens/OnboardingScreen.js
import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "../components/GradientBackground";
import GradientButton from "../components/GradientButton";
import { COLORS, GRADIENTS, SPACING, BORDER_RADIUS } from "../theme";
import {
  Plane,
  Hotel,
  Car,
  Sparkles,
  Compass,
  BadgeCheck,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");
const CARD_BG = "rgba(12, 16, 24, 0.55)";
const STROKE = "rgba(255,255,255,0.08)";

// --- Small presentational bits ---
const Chip = ({ label }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
  </View>
);

const Feature = ({ icon: Icon, label }) => (
  <View style={styles.feature}>
    <Icon size={16} color={COLORS.text} />
    <Text style={styles.featureText}>{label}</Text>
  </View>
);

const MockChatCard = () => (
  <View style={styles.mockCard}>
    <View style={styles.mockHeader}>
      <Compass size={16} color="rgba(255,255,255,0.9)" />
      <Text style={styles.mockHeaderText}>TWOS · Trip Builder</Text>
    </View>
    <View style={styles.mockBubbleLeft}>
      <Text style={styles.mockLeftText}>
        Hi there! 👋 I'm TWOS, your travel planning assistant.
      </Text>
    </View>
    <View style={styles.mockBubbleRight}>
      <Text style={styles.mockRightText}>Need a flight</Text>
    </View>
    <View style={styles.mockFooterRow}>
      <Chip label="Breakfast + Pool" />
      <Chip label="Under $1500" />
    </View>
  </View>
);

// --- Slides data ---
const SLIDES = [
  {
    key: "1",
    badge: "AI Travel Assistant",
    titleTop: "Plan trips at",
    titleAccent: "chat speed",
    titleEnd: ".",
    subtitle:
      "Build flights, stays, and experiences with a simple conversation. No spreadsheets. No stress.",
    hero: <MockChatCard />,
    features: [
      { icon: Plane, label: "Smart flights" },
      { icon: Hotel, label: "Curated stays" },
      { icon: Car, label: "Rental cars" },
      { icon: Sparkles, label: "Experiences" },
    ],
  },
  {
    key: "2",
    badge: "Instant Packages",
    titleTop: "From idea to",
    titleAccent: "itinerary",
    titleEnd: " in seconds.",
    subtitle:
      "Tell TWOS your vibe and budget. We assemble flights, hotels, cars, and tours automatically.",
    hero: <MockChatCard />,
    features: [
      { icon: Plane, label: "Non-stop options" },
      { icon: Hotel, label: "Breakfast + pool" },
      { icon: Car, label: "Compact to SUV" },
      { icon: Sparkles, label: "Top-rated tours" },
    ],
  },
  {
    key: "3",
    badge: "Crystal Clarity",
    titleTop: "Transparent",
    titleAccent: "pricing",
    titleEnd: " you control.",
    subtitle:
      "Live totals and under-budget alerts—swap items anytime. No hidden fees. Just great trips.",
    hero: <MockChatCard />,
    features: [
      { icon: Plane, label: "Fare tracking" },
      { icon: Hotel, label: "Verified reviews" },
      { icon: Car, label: "Major providers" },
      { icon: Sparkles, label: "Hand-picked" },
    ],
  },
];

const OnboardingScreen = ({ navigation, setHasCompletedOnboarding }) => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatRef = useRef(null);
  const [index, setIndex] = useState(0);

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const goToIndex = (i) => {
    flatRef.current?.scrollToOffset({ offset: i * width, animated: true });
    setIndex(i);
  };

  const onNext = () => {
    if (index < SLIDES.length - 1) {
      goToIndex(index + 1);
    } else {
      try {
        setHasCompletedOnboarding?.(true);
      } catch {}
      navigation?.replace?.("Main");
    }
  };

  const onSkip = () => goToIndex(SLIDES.length - 1);

  const dots = useMemo(
    () =>
      SLIDES.map((_, i) => {
        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: "clamp",
        });
        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [1, 1.35, 1],
          extrapolate: "clamp",
        });
        return { opacity, scale };
      }),
    [scrollX]
  );

  const ctaTitle = index < SLIDES.length - 1 ? "Next" : "Start Chatting →";

  return (
    <View style={styles.fill}>
      {/* Full-screen gradient */}
      <GradientBackground colors={GRADIENTS.sky} style={styles.absoluteFill} />

      <SafeAreaView
        style={styles.fill}
        edges={["top", "left", "right", "bottom"]}
      >
        {/* SKIP button (top-right) */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Pager */}
        <Animated.FlatList
          ref={flatRef}
          data={SLIDES}
          keyExtractor={(it) => it.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
          onMomentumScrollEnd={onMomentumEnd}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width, height }]}>
              {/* subtle glow */}
              <View style={styles.glow} />

              <View style={styles.badge}>
                <BadgeCheck size={16} color="#111318" />
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>

              <Text style={styles.headline}>
                {item.titleTop}{" "}
                <Text style={styles.headlineAccent}>{item.titleAccent}</Text>
                {item.titleEnd}
              </Text>

              <Text style={styles.subhead}>{item.subtitle}</Text>

              {item.hero}

              <View style={styles.featuresRow}>
                {item.features.map((f, idx) => (
                  <Feature key={idx} icon={f.icon} label={f.label} />
                ))}
              </View>
            </View>
          )}
        />

        {/* Bottom overlay: dots + CTA */}
        <View style={styles.bottomOverlay}>
          <View style={styles.dotsRow}>
            {dots.map((d, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  {
                    opacity: d.opacity,
                    transform: [{ scale: d.scale }],
                  },
                ]}
              />
            ))}
          </View>

          <GradientButton title={ctaTitle} onPress={onNext} />
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  absoluteFill: { ...StyleSheet.absoluteFillObject },

  topBar: {
    position: "absolute",
    top: SPACING.xxl * 1.75,
    right: SPACING.xl,
    zIndex: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
    // marginBottom: -SPACING.xxl * 5
  },

  slide: {
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: -SPACING.xxl * 1.5, // 👈 shift content upward
  },

  glow: {
    position: "absolute",
    top: height * 0.08, // 👈 was 0.15, now higher
    width: Math.min(520, width * 0.9),
    height: Math.min(520, width * 0.9),
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    shadowColor: "#8bc6ff",
    shadowOpacity: 0.45,
    shadowRadius: 40,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
    marginBottom: SPACING.sm,
  },
  badgeText: {
    color: "#111318",
    fontFamily: "Urbanist_700Bold",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  headline: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 32,
    textAlign: "center",
    lineHeight: 40,
  },
  headlineAccent: { color: "#a8e1ff" },

  subhead: {
    color: COLORS.text,
    opacity: 0.9,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },

  mockCard: {
    width: Math.min(420, width - SPACING.xl * 2),
    borderRadius: BORDER_RADIUS?.xl ?? 28,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: STROKE,
    padding: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  mockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.md,
  },
  mockHeaderText: {
    color: "rgba(255,255,255,0.9)",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  mockBubbleLeft: {
    alignSelf: "flex-start",
    maxWidth: "82%",
    padding: SPACING.md,
    borderRadius: 18,
    borderBottomLeftRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: STROKE,
  },
  mockLeftText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 15,
    lineHeight: 20,
  },
  mockBubbleRight: {
    alignSelf: "flex-end",
    maxWidth: "75%",
    padding: SPACING.md,
    borderRadius: 18,
    borderBottomRightRadius: 8,
    marginTop: SPACING.sm,
    backgroundColor: "rgba(132, 93, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(132, 93, 255, 0.35)",
  },
  mockRightText: {
    color: "#ffffff",
    fontFamily: "Urbanist_500Medium",
    fontSize: 15,
    lineHeight: 20,
  },
  mockFooterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: SPACING.md,
  },

  featuresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: STROKE,
  },
  featureText: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 13,
  },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: STROKE,
  },
  chipText: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 12,
  },

  bottomOverlay: {
    position: "absolute",
    left: SPACING.xl,
    right: SPACING.xl,
    bottom: SPACING.lg,
  },
  dotsRow: {
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flexDirection: "row",
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});

export default OnboardingScreen;
