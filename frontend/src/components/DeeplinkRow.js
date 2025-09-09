// src/components/DeeplinkRow.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { ExternalLink } from "lucide-react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";

const DeeplinkRow = ({ title, url, icon: Icon }) => {
  const handlePress = async () => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.container}>
      <View style={styles.content}>
        {Icon && <Icon size={24} color={COLORS.text} style={styles.icon} />}
        <Text style={styles.title}>{title}</Text>
      </View>
      <ExternalLink size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: SPACING.xs,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: SPACING.md,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_500Medium",
    fontSize: 16,
  },
});

export default DeeplinkRow;
