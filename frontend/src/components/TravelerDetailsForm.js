// src/components/TravelerDetailsForm.js
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SPACING, COLORS, BORDER_RADIUS } from "../theme";
import { useCountryCodes } from "../hooks/useCountryCodes";

const defaultValue = {
  name: "",
  email: "",
  countryCode: "+1",
  phone: "",
};

export default function TravelerDetailsForm({
  value = defaultValue,
  onChange,
  title = "Traveler details",
}) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { codes, loading } = useCountryCodes();

  const merged = useMemo(() => ({ ...defaultValue, ...value }), [value]);

  const handleChange = (key, val) => {
    onChange?.({ ...merged, [key]: val });
  };

  const renderCodeItem = ({ item }) => (
    <TouchableOpacity
      style={styles.codeRow}
      onPress={() => {
        handleChange("countryCode", item.code);
        setPickerVisible(false);
      }}
    >
      <Text style={styles.codeName}>{item.name}</Text>
      <Text style={styles.codeValue}>{item.code}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}

      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        placeholder="Traveler name"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={merged.name}
        onChangeText={(text) => handleChange("name", text)}
        autoCapitalize="words"
        returnKeyType="next"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="you@example.com"
        placeholderTextColor="rgba(255,255,255,0.45)"
        value={merged.email}
        onChangeText={(text) => handleChange("email", text)}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
      />

      <Text style={styles.label}>Contact number</Text>
      <View style={styles.phoneRow}>
        <TouchableOpacity
          style={styles.codePicker}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.codePickerText}>{merged.countryCode}</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: SPACING.sm }]}
          placeholder="Phone number"
          placeholderTextColor="rgba(255,255,255,0.45)"
          value={merged.phone}
          onChangeText={(text) =>
            handleChange("phone", text.replace(/[^0-9]/g, ""))
          }
          keyboardType="phone-pad"
          maxLength={14}
        />
      </View>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select country code</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (
              <FlatList
                data={codes}
                keyExtractor={(item) => `${item.code}-${item.cca2}`}
                renderItem={renderCodeItem}
                contentContainerStyle={{ paddingBottom: SPACING.md }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.lg,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 16,
    marginBottom: SPACING.xs,
  },
  label: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  codePicker: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 72,
    alignItems: "center",
  },
  codePickerText: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7,9,17,0.8)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: "rgba(16,23,42,0.98)",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  modalClose: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  codeRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  codeName: {
    color: COLORS.text,
    fontSize: 15,
    marginBottom: 4,
  },
  codeValue: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
});

