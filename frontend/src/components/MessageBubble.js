// src/components/MessageBubble.js
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import LottieView from "lottie-react-native";
import { format } from "date-fns";
import GradientBackground from "./GradientBackground";
import { COLORS, GRADIENTS, BORDER_RADIUS, SPACING } from "../theme";

// 1) Static import so Metro bundles it
//    Make sure the file exists at: assets/lottie/loader-plane.json
let LoaderPlane;
try {
  LoaderPlane = require("../../assets/lottie/loader-plane.json");
} catch (e) {
  // optional: log in dev
  if (__DEV__) console.warn("Lottie plane JSON not found:", e?.message);
}

// 2) Dev fallback (use a bundled sample if your file path is wrong while testing)
//    If this path fails in your setup, just comment it out.
let DevFallback;
try {
  // NOTE: path may vary across versions; comment this out if it errors.
  // console.log("DevFallback");

  DevFallback = require("lottie-react-native/src/js/animations/Watermelon.json");
} catch {
  /* ignore */
}

const TypingBubble = () => {
  const lottieRef = React.useRef(null);
  const [instanceKey] = React.useState(() => String(Date.now()));

  const resetAndPlay = React.useCallback(() => {
    try {
      if (lottieRef.current) {
        lottieRef.current.reset?.();
        setTimeout(() => {
          lottieRef.current?.play?.();
        }, 10);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    const id = setTimeout(() => {
      resetAndPlay();
    }, 0);
    return () => clearTimeout(id);
  }, [resetAndPlay]);

  const sourceToUse = LoaderPlane || (__DEV__ ? DevFallback : null);

  return (
    <View style={[styles.row, { justifyContent: "flex-start" }]}>
      <View style={styles.typingBubble}>
        {sourceToUse ? (
          <LottieView
            key={instanceKey}
            ref={lottieRef}
            source={sourceToUse}
            autoPlay={false}
            loop
            speed={1}
            resizeMode="contain"
            style={styles.lottie}
            onLayout={resetAndPlay}
            onAnimationFinish={resetAndPlay}
          />
        ) : (
          <View style={styles.lottieFallback}>
            <Text style={styles.fallbackText}>···</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const MessageBubble = ({ role, text, time, isTyping, links }) => {
  const isUser = role === "user";

  if (isTyping) {
    return <TypingBubble />;
  }

  return (
    <View
      style={[
        styles.row,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      {isUser ? (
        <GradientBackground
          colors={GRADIENTS.primary}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{text}</Text>
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}
        </GradientBackground>
      ) : (
        <View style={styles.botBubble}>
          <Text style={styles.botText}>{text}</Text>
          {time && <Text style={styles.timeText}>{format(time, "HH:mm")}</Text>}

          {Array.isArray(links) && links.length > 0 && (
            <View style={styles.linksRow}>
              {links.map((l, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(l.url)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.linkText}>🔗 {l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full-width row so we can align left/right cleanly
  row: {
    width: "100%",
    flexDirection: "row",
    marginVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },

  // Bubbles wrap content and are width-capped
  userBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.xs,
  },
  botBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },

  // Typing bubble container for Lottie
  typingBubble: {
    maxWidth: "78%",
    alignSelf: "flex-start",
    borderRadius: BORDER_RADIUS.lg,
    borderBottomLeftRadius: BORDER_RADIUS.xs,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 64, // ensure visible height
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  // Big enough that you will see it for sure
  lottie: {
    width: 180,
    height: 52,
    // debug background so you know the view is present while testing; remove later
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
  },

  // Visible fallback if Lottie source can’t be loaded
  lottieFallback: {
    width: 60,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackText: {
    color: COLORS.text,
    fontSize: 20,
    letterSpacing: 2,
  },

  userText: {
    color: "#FFFFFF",
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  botText: {
    color: COLORS.text,
    fontFamily: "Urbanist_400Regular",
    fontSize: 16,
    lineHeight: 21,
  },
  timeText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    alignSelf: "flex-end",
    marginTop: SPACING.xs,
  },

  // Optional link buttons under bot bubbles
  linksRow: {
    marginTop: SPACING.sm,
    gap: 8,
  },
  linkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginTop: 8,
  },
  linkText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Urbanist_500Medium",
  },
});

export default MessageBubble;
