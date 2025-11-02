// src/screens/FakePayment.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SPACING, COLORS } from "../theme";
import { formatCurrency } from "../utils/format";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import { ChevronLeft } from "lucide-react-native";

export default function FakePayment({ route, navigation }) {
  const { provider, type, data } = route.params || {};
  const summary = route.params?.summary ?? {};
  const summaryTotal = summary.total_price;
  const summaryCurrency = summary.currency;
  const baseAmount = data?.price ?? summaryTotal ?? 0;
  const amount = baseAmount;
  const currency = data?.currency ?? summaryCurrency ?? "USD";
  const fallbackSubtotal = amount / 1.15;
  const subtotal = Math.max(summary.subtotal ?? fallbackSubtotal, 0);
  const twosFee = Math.max(summary.twos_fee ?? amount * 0.05, 0);
  const taxes = Math.max(summary.taxes ?? amount - subtotal - twosFee, 0);
  const travelerInfo = data?.traveler ?? null;
  const chatIdRef = useRef(useSavedChatsStore.getState()?.currentChatId ?? null);

  // UI state
  const [method, setMethod] = useState("apple"); // 'apple' | 'card' | 'paypal'
  const [sheetVisible, setSheetVisible] = useState(false); // Apple / PayPal sheet reuse
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Card form state
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVC, setCardCVC] = useState("");

  // PayPal simple state
  const [paypalEmail, setPaypalEmail] = useState("");

  // Helpers
  const resetForm = () => {
    setCardName("");
    setCardNumber("");
    setCardExpiry("");
    setCardCVC("");
    setPaypalEmail("");
  };

  const openSheet = (m) => {
    setMethod(m);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
  };

  // Simulate processing and then go back to Chat
  const finishPayment = () => {
    setLoading(true);
    // simulate remote processing
    setTimeout(() => {
      setLoading(false);
      setSheetVisible(false);
      setSuccess(true);

      try {
        const store = useSavedChatsStore.getState();
        const chatId = chatIdRef.current ?? store?.currentChatId;
        chatIdRef.current = chatId;
        if (chatId) {
          const chat = store.getChatById?.(chatId);
          if (chat) {
            const confirmationTimestamp = new Date().toISOString();
            const confirmationText = `✅ Booking confirmed with ${
              provider ?? "our partner"
            }. Your ${type ?? "booking"} is all set!`;
            const confirmationMessage = {
              role: "bot",
              text: confirmationText,
              timestamp: confirmationTimestamp,
            };
            const updatedMessages = [...(chat.messages || []), confirmationMessage];

            const booking = {
              provider: provider ?? "Travel Partner",
              type: type ?? "booking",
              amount,
              currency,
              data,
              confirmedAt: confirmationTimestamp,
              twosFee,
              traveler: travelerInfo,
            };

            store.updateChatContent?.(chatId, updatedMessages, {
              status: "booked",
              booking,
            });

            setTimeout(() => {
              resetForm();
              navigation.replace("BookingConfirmation", {
                chatId,
                booking,
              });
            }, 900);
            return;
          }
        }
      } catch (err) {
        if (__DEV__) console.warn("Failed to record booking", err);
      }

      // small delay so user sees success state then return to chat
      setTimeout(() => {
        resetForm();
        navigation.replace("Main", { screen: "Chat" });
      }, 900);
    }, 1400);
  };

  // Basic client-side checks
  const validateCard = () => {
    if (!cardName.trim()) return "Name on card is required.";
    const num = cardNumber.replace(/\s+/g, "");
    if (num.length < 13) return "Card number looks short.";
    if (!/^\d{2}\/?\d{2,4}$/.test(cardExpiry)) return "Expiry must be MM/YY.";
    if (!/^\d{3,4}$/.test(cardCVC)) return "CVC must be 3 or 4 digits.";
    return null;
  };

  const handleCardPay = () => {
    const err = validateCard();
    if (err) {
      Alert.alert("Card details", err);
      return;
    }
    finishPayment();
  };

  const handlePaypalPay = () => {
    if (!paypalEmail || !paypalEmail.includes("@")) {
      Alert.alert("PayPal", "Enter a valid PayPal email.");
      return;
    }
    finishPayment();
  };

  const handleApplePay = () => {
    // On Expo Go you can't trigger real apple pay; this simulates the sheet
    finishPayment();
  };

  // Payment method buttons
  const MethodButton = ({ id, label, active, onPress, subtitle, style }) => (
    <TouchableOpacity
      style={[styles.methodBtn, active && styles.methodBtnActive, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View>
        <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[styles.methodSub, active && styles.methodSubActive]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secure checkout</Text>
        <View style={{ width: 36 }} />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Checkout — {provider ?? "Provider"}</Text>

          <View style={styles.summary}>
            <Text style={styles.summaryText}>Item: {type ?? "Booking"}</Text>
            <Text style={styles.summaryText}>
              Subtotal: {formatCurrency(subtotal, currency)}
            </Text>
            <Text style={styles.summaryText}>
              Taxes & fees: {formatCurrency(taxes, currency)}
            </Text>
            <Text style={styles.summaryText}>
              TWOS service fee (5%): {formatCurrency(twosFee, currency)}
            </Text>
            <Text style={styles.summaryText}>
              Amount due: {formatCurrency(amount, currency)}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Choose payment method</Text>

          <View style={styles.methodsRow}>
            <MethodButton
              id="apple"
              label="Apple Pay"
              subtitle={` Pay • ${formatCurrency(amount, currency)}`}
              active={method === "apple"}
              onPress={() => setMethod("apple")}
            />
            <MethodButton
              id="card"
              label="Credit / Debit Card"
              subtitle="Visa, Mastercard, Amex"
              active={method === "card"}
              onPress={() => setMethod("card")}
              style={{ marginHorizontal: SPACING.sm }}
            />
            <MethodButton
              id="paypal"
              label="PayPal"
              subtitle="Pay with PayPal"
              active={method === "paypal"}
              onPress={() => setMethod("paypal")}
            />
          </View>

          {/* Method-specific UI */}
          <View style={styles.methodBox}>
            {method === "apple" && (
              <>
                <Text style={styles.hint}>
                  Fast and secure. Uses Apple Pay.
                </Text>
                <TouchableOpacity
                  style={styles.applePayBtn}
                  onPress={() => openSheet("apple")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.applePayText}>
                     Pay • {formatCurrency(amount, currency)}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.smallNote}>
                  On this demo, Apple Pay is simulated.
                </Text>
              </>
            )}

            {method === "card" && (
              <>
                <Text style={styles.hint}>Enter card details below.</Text>

                <View style={styles.formRow}>
                  <TextInput
                    placeholder="Name on card"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={cardName}
                    onChangeText={setCardName}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.formRow}>
                  <TextInput
                    placeholder="Card number"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={styles.input}
                    value={cardNumber}
                    onChangeText={(t) => {
                      // simple spacing formatter
                      const cleaned = t.replace(/\D/g, "");
                      const parts = cleaned.match(/.{1,4}/g);
                      setCardNumber(parts ? parts.join(" ") : cleaned);
                    }}
                    keyboardType="number-pad"
                    maxLength={23}
                  />
                </View>

                <View style={[styles.row, { marginTop: SPACING.sm }]}>
                  <TextInput
                    placeholder="MM/YY"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={[styles.input, { flex: 1, marginRight: SPACING.sm }]}
                    value={cardExpiry}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/\D/g, "");
                      if (cleaned.length >= 3) {
                        setCardExpiry(
                          `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`
                        );
                      } else setCardExpiry(cleaned);
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                  />

                  <TextInput
                    placeholder="CVC"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={[styles.input, { width: 100 }]}
                    value={cardCVC}
                    onChangeText={(t) => setCardCVC(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>

                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={handleCardPay}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payBtnText}>
                      Pay {formatCurrency(amount, currency)}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {method === "paypal" && (
              <>
                <Text style={styles.hint}>
                  Pay using your PayPal account (demo).
                </Text>

                <TextInput
                  placeholder="PayPal email"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  style={[styles.input, { marginTop: SPACING.sm }]}
                  value={paypalEmail}
                  onChangeText={setPaypalEmail}
                  keyboardType="email-address"
                />

                <TouchableOpacity
                  style={[styles.payBtn, { marginTop: SPACING.md }]}
                  onPress={() => openSheet("paypal")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.payBtnText}>Continue with PayPal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {travelerInfo ? (
            <View style={styles.travelerCard}>
              <Text style={styles.sectionTitle}>Traveler</Text>
              <Text style={styles.travelerText}>{travelerInfo.name}</Text>
              <Text style={styles.travelerSub}>{travelerInfo.email}</Text>
              <Text style={styles.travelerSub}>
                {travelerInfo.countryCode} {travelerInfo.phone}
              </Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />

          {/* Bottom notes */}
          <Text style={styles.smallNote}>
            This is a demo. No real payment will be taken in this build.
          </Text>
        </ScrollView>

        {/* Reusable bottom sheet modal for Apple Pay and PayPal confirmation */}
        <Modal
          visible={sheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSheetVisible(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              {method === "apple" && (
                <>
                  <Text style={styles.sheetTitle}>Confirm with Apple Pay</Text>
                  <Text style={styles.sheetDesc}>
                    Double-click the side button to pay securely with Apple Pay.
                  </Text>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>TOTAL</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(amount, currency)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.sheetBtn}
                    onPress={handleApplePay}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sheetBtnText}>Pay with  Pay</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {method === "paypal" && (
                <>
                  <Text style={styles.sheetTitle}>PayPal</Text>
                  <Text style={styles.sheetDesc}>
                    You will be redirected to PayPal to complete the payment.
                    (Simulated in demo.)
                  </Text>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>TOTAL</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(amount, currency)}
                    </Text>
                  </View>

                  {/* Simulate a PayPal login step */}
                  <TextInput
                    placeholder="PayPal email"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    style={[styles.input, { marginBottom: SPACING.md }]}
                    value={paypalEmail}
                    onChangeText={setPaypalEmail}
                    keyboardType="email-address"
                  />

                  <TouchableOpacity
                    style={styles.sheetBtn}
                    onPress={handlePaypalPay}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.sheetBtnText}>Pay with PayPal</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSheetVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  container: {
    padding: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: 20,
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.md,
  },
  summary: {
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  summaryText: { color: "#fff", fontSize: 16 },

  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  methodsRow: {
    flexDirection: "row",
    marginBottom: SPACING.md,
  },
  methodBtn: {
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: SPACING.sm,
    borderRadius: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  methodBtnActive: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  methodLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Urbanist_600SemiBold",
  },
  methodLabelActive: {
    color: COLORS.text,
  },
  methodSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 6,
  },
  methodSubActive: {
    color: "rgba(255,255,255,0.8)",
  },

  methodBox: {
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },

  hint: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: SPACING.sm,
  },

  applePayBtn: {
    backgroundColor: "#000",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  applePayText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Urbanist_600SemiBold",
  },

  smallNote: {
    color: "rgba(255,255,255,0.6)",
    marginTop: SPACING.sm,
    fontSize: 13,
  },

  formRow: { marginTop: SPACING.sm },

  input: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    color: "#fff",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    fontSize: 16,
  },

  row: { flexDirection: "row", alignItems: "center" },

  payBtn: {
    backgroundColor: "#0b84ff",
    paddingVertical: 14,
    marginTop: SPACING.md,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Urbanist_600SemiBold",
  },
  travelerCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  travelerText: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  travelerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 2,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1c1c1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.sm,
  },
  sheetDesc: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  amountLabel: { color: "#aaa", fontSize: 14 },
  amountValue: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "Urbanist_600SemiBold",
  },
  sheetBtn: {
    backgroundColor: "#000",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sheetBtnText: { color: "#fff", fontSize: 18 },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: { color: "#f87171", fontSize: 16 },
});
