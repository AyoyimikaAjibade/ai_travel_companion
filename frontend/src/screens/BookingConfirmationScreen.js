// src/screens/BookingConfirmationScreen.js
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";
import { formatCurrency } from "../utils/format";
import { useSavedChatsStore } from "../stores/savedChatsStore";
import {
  normalizeBookingLedger,
  getActiveBookings,
} from "../utils/booking";
import { ChevronLeft, MessageCircle, Luggage } from "lucide-react-native";

const QR_SIZE = 12;

const generateQrMatrix = (value, size = QR_SIZE) => {
  const source =
    typeof value === "string" && value.length
      ? value
      : "ai-travel-companion";
  const bytes = Array.from(source).map((char) => char.charCodeAt(0));
  const totalCells = size * size;
  const bits = [];

  bytes.forEach((byte, index) => {
    for (let shift = 0; shift < 8; shift += 1) {
      const rotated = (shift + index) % 8;
      const bit = (byte >> rotated) & 1;
      bits.push(bit);
    }
  });

  while (bits.length < totalCells) {
    bits.push((bits.length + bytes.length) % 2);
  }

  const matrix = [];
  for (let row = 0; row < size; row += 1) {
    matrix.push(bits.slice(row * size, (row + 1) * size));
  }
  return matrix;
};

const renderQrMatrix = (matrix) => (
  <View style={styles.qrContainer}>
    {matrix.map((row, rowIndex) => (
      <View key={`qr-row-${rowIndex}`} style={styles.qrRow}>
        {row.map((bit, cellIndex) => (
          <View
            key={`qr-cell-${rowIndex}-${cellIndex}`}
            style={[styles.qrCell, bit ? styles.qrCellFilled : null]}
          />
        ))}
      </View>
    ))}
  </View>
);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function BookingConfirmationScreen({ route, navigation }) {
  const {
    chatId,
    booking: navigationBooking,
    serviceKey: initialServiceKey,
    batchId,
  } = route.params || {};

  const cancelServiceBookings = useSavedChatsStore(
    (state) => state.cancelServiceBookings
  );

  const chat = useSavedChatsStore(
    React.useCallback(
      (state) => state.chats.find((c) => c.id === chatId),
      [chatId]
    )
  );

  const ledger = useMemo(() => {
    const source = navigationBooking ?? chat?.booking ?? null;
    
    if (__DEV__) {
      console.log('[BookingConfirmation] Raw source:', {
        hasNavigationBooking: !!navigationBooking,
        hasChatBooking: !!chat?.booking,
        chatId,
        navigationBookingType: typeof navigationBooking,
        navigationBookingKeys: navigationBooking ? Object.keys(navigationBooking) : [],
        navigationBookingRecords: navigationBooking?.records ? Object.keys(navigationBooking.records) : [],
        chatBookingRecords: chat?.booking?.records ? Object.keys(chat.booking.records) : [],
      });
    }
    
    const normalized = normalizeBookingLedger(source);
    
    if (__DEV__) {
      console.log('[BookingConfirmation] After normalization:', {
        normalizedRecordsCount: Object.keys(normalized.records || {}).length,
        recordKeys: Object.keys(normalized.records || {}),
        normalizedStructure: {
          hasRecords: !!normalized.records,
          recordsType: typeof normalized.records,
          recordsKeys: normalized.records ? Object.keys(normalized.records) : [],
        }
      });
    }
    
    return normalized;
  }, [navigationBooking, chat?.booking, chatId]);

  const records = useMemo(() => {
    const list = Object.values(ledger.records || {});
    return list
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.confirmedAt || 0).getTime();
        const bTime = new Date(b.confirmedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [ledger]);

  const activeRecords = useMemo(() => getActiveBookings(ledger), [ledger]);

  const [selectedKey, setSelectedKey] = React.useState(
    initialServiceKey ||
      activeRecords[0]?.serviceKey ||
      records[0]?.serviceKey ||
      null
  );

  React.useEffect(() => {
    const current = selectedKey ? ledger.records[selectedKey] : null;
    if (current) return;

    const batchCandidates =
      batchId && ledger.batches?.[batchId]
        ? ledger.batches[batchId].filter(
            (key) => ledger.records[key]?.status !== "cancelled"
          )
        : [];

    const fallback =
      (initialServiceKey &&
        ledger.records[initialServiceKey] &&
        ledger.records[initialServiceKey].status !== "cancelled" &&
        initialServiceKey) ||
      batchCandidates[0] ||
      activeRecords[0]?.serviceKey ||
      records[0]?.serviceKey ||
      null;

    if (fallback && fallback !== selectedKey) {
      setSelectedKey(fallback);
    }
  }, [
    ledger,
    selectedKey,
    initialServiceKey,
    batchId,
    activeRecords,
    records,
  ]);

  const selectedRecord = selectedKey ? ledger.records[selectedKey] : null;

  const qrMatrix = useMemo(
    () =>
      generateQrMatrix(
        selectedRecord?.qrData ?? selectedRecord?.bookingId ?? ""
      ),
    [selectedRecord]
  );

  const isSelectedCancelled = selectedRecord?.status === "cancelled";
  const hasActive = activeRecords.length > 0;

  const amountLabel =
    selectedRecord?.amount != null
      ? formatCurrency(
          selectedRecord.amount,
          selectedRecord.currency ?? "USD"
        )
      : null;
  const twosFeeLabel =
    selectedRecord?.twosFee != null && selectedRecord.twosFee !== 0
      ? formatCurrency(
          selectedRecord.twosFee,
          selectedRecord.currency ?? "USD"
        )
      : null;
  const taxesLabel =
    selectedRecord?.taxes != null && selectedRecord.taxes !== 0
      ? formatCurrency(
          selectedRecord.taxes,
          selectedRecord.currency ?? "USD"
        )
      : null;
  const subtotalLabel =
    selectedRecord?.subtotal != null && selectedRecord.subtotal !== 0
      ? formatCurrency(
          selectedRecord.subtotal,
          selectedRecord.currency ?? "USD"
        )
      : null;
  const traveler = selectedRecord?.traveler;

  const handleCancelSelected = React.useCallback(() => {
    if (!chatId || !selectedRecord || isSelectedCancelled) return;
    cancelServiceBookings?.(chatId, [selectedRecord.serviceKey]);
  }, [chatId, selectedRecord, isSelectedCancelled, cancelServiceBookings]);

  const handleCancelAll = React.useCallback(() => {
    if (!chatId) return;
    const activeKeys = getActiveBookings(ledger).map(
      (record) => record.serviceKey
    );
    if (!activeKeys.length) return;
    cancelServiceBookings?.(chatId, activeKeys);
  }, [chatId, ledger, cancelServiceBookings]);

  const goToChat = () => {
    if (chatId) {
      navigation.navigate("Main", { screen: "Chat", params: { chatId } });
    } else {
      navigation.navigate("Main", { screen: "Chat" });
    }
  };

  const goToTrips = () => navigation.navigate("Main", { screen: "MyTrips" });

  const renderStatusBadge = (record) => {
    if (!record) return null;
    const status = record.status === "cancelled" ? "Cancelled" : "Confirmed";
    const badgeStyles =
      record.status === "cancelled"
        ? [styles.statusBadge, styles.statusBadgeCancelled]
        : [styles.statusBadge, styles.statusBadgeConfirmed];
    const textStyles =
      record.status === "cancelled"
        ? [styles.statusBadgeText, styles.statusBadgeTextCancelled]
        : [styles.statusBadgeText, styles.statusBadgeTextConfirmed];
    return (
      <View style={badgeStyles}>
        <Text style={textStyles}>{status}</Text>
      </View>
    );
  };

  const formatServiceTitle = (serviceType) =>
    formatLabel(serviceType ?? "Booking");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking confirmation</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.selectorCard}>
          <Text style={styles.sectionTitle}>Your bookings</Text>
          {records.length === 0 ? (
            <View style={styles.emptyList}>
              <Text style={styles.emptyLabel}>
                Confirm a trip component to see it here.
              </Text>
            </View>
          ) : (
            <View style={styles.selectorList}>
              {records.map((record) => {
                const isActive = record.serviceKey === selectedKey;
                return (
                  <TouchableOpacity
                    key={record.serviceKey}
                    style={[
                      styles.bookingChip,
                      isActive && styles.bookingChipActive,
                    ]}
                    onPress={() => setSelectedKey(record.serviceKey)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.bookingChipHeader}>
                      <Text
                        style={[
                          styles.bookingChipTitle,
                          isActive && styles.bookingChipTitleActive,
                        ]}
                      >
                        {formatServiceTitle(record.serviceType)}
                      </Text>
                      {renderStatusBadge(record)}
                    </View>
                    <Text
                      style={[
                        styles.bookingChipSubtitle,
                        isActive && styles.bookingChipSubtitleActive,
                      ]}
                      numberOfLines={1}
                    >
                      {record.provider}
                    </Text>
                    <Text style={styles.bookingChipDate}>
                      {formatDate(record.confirmedAt)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {selectedRecord ? (
          <>
            <View style={styles.cardPrimary}>
              <Text style={styles.cardTitle}>
                {isSelectedCancelled ? "Booking cancelled" : "You're booked!"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {selectedRecord.provider ?? "Travel partner"}{" "}
                {isSelectedCancelled
                  ? `previously confirmed your ${formatServiceTitle(
                      selectedRecord.serviceType
                    ).toLowerCase()}.`
                  : `confirmed your ${formatServiceTitle(
                      selectedRecord.serviceType
                    ).toLowerCase()}.`}
              </Text>
              {renderStatusBadge(selectedRecord)}
              {renderQrMatrix(qrMatrix)}
              <Text style={styles.qrHint}>
                Scan to retrieve booking #{selectedRecord.bookingId}.
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Booking details</Text>
              <SummaryRow label="Provider" value={selectedRecord.provider} />
              <SummaryRow
                label="Type"
                value={formatServiceTitle(selectedRecord.serviceType)}
              />
              <SummaryRow
                label="Confirmed"
                value={formatDate(selectedRecord.confirmedAt)}
              />
              {selectedRecord?.cabinClass ? (
                <SummaryRow
                  label="Cabin"
                  value={formatLabel(selectedRecord.cabinClass)}
                />
              ) : null}
              {subtotalLabel ? (
                <SummaryRow label="Subtotal" value={subtotalLabel} />
              ) : null}
              {taxesLabel ? (
                <SummaryRow label="Taxes" value={taxesLabel} />
              ) : null}
              {twosFeeLabel ? (
                <SummaryRow label="TWOS service fee" value={twosFeeLabel} />
              ) : null}
              {amountLabel ? (
                <SummaryRow label="Total paid" value={amountLabel} bold />
              ) : null}
            </View>

            {selectedRecord?.data ? (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Itinerary</Text>
                {Object.entries(selectedRecord.data)
                  .filter(([_, value]) => {
                    if (
                      typeof value === "string" ||
                      typeof value === "number"
                    )
                      return true;
                    return false;
                  })
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <SummaryRow
                      key={key}
                      label={formatLabel(key)}
                      value={String(value)}
                    />
                  ))}
              </View>
            ) : null}

            {traveler ? (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Traveler</Text>
                <SummaryRow label="Name" value={traveler.name} />
                <SummaryRow label="Email" value={traveler.email} />
                <SummaryRow
                  label="Contact"
                  value={
                    traveler.phone
                      ? `${traveler.countryCode} ${traveler.phone}`
                      : null
                  }
                />
              </View>
            ) : null}

            {Array.isArray(selectedRecord?.passengers) &&
            selectedRecord.passengers.length ? (
              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Passengers</Text>
                {selectedRecord.passengers.map((passenger, index) => (
                  <SummaryRow
                    key={`${passenger.firstName}-${passenger.lastName}-${index}`}
                    label={`Passenger ${index + 1}`}
                    value={`${passenger.firstName ?? ""} ${
                      passenger.lastName ?? ""
                    }${
                      passenger.type
                        ? ` • ${formatLabel(passenger.type)}`
                        : ""
                    }`.trim()}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.cancelRow}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  isSelectedCancelled && styles.cancelBtnDisabled,
                ]}
                onPress={handleCancelSelected}
                disabled={isSelectedCancelled}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    isSelectedCancelled && styles.cancelBtnTextDisabled,
                  ]}
                >
                  Cancel selected
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  styles.cancelBtnOutline,
                  !hasActive && styles.cancelBtnDisabled,
                ]}
                onPress={handleCancelAll}
                disabled={!hasActive}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.cancelBtnText,
                    styles.cancelBtnOutlineText,
                    !hasActive && styles.cancelBtnTextDisabled,
                  ]}
                >
                  Cancel all active
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptySubtitle}>
              Confirm a flight, stay, or experience to preview it here.
            </Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={goToChat}
            activeOpacity={0.9}
          >
            <MessageCircle size={18} color="#fff" />
            <Text style={styles.actionTextPrimary}>Continue chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={goToTrips}
            activeOpacity={0.85}
          >
            <Luggage size={18} color={COLORS.text} />
            <Text style={styles.actionTextSecondary}>View trips</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryRow = ({ label, value, bold = false }) => {
  if (!value) return null;
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>
        {value}
      </Text>
    </View>
  );
};

const formatLabel = (key) =>
  key
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
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
    fontSize: 20,
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  cardPrimary: {
    backgroundColor: "rgba(124,58,237,0.12)",
    borderColor: "rgba(124,58,237,0.35)",
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 24,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.75)",
    marginTop: SPACING.xs,
  },
  qrContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: BORDER_RADIUS.lg,
    alignSelf: "center",
  },
  qrRow: {
    flexDirection: "row",
  },
  qrCell: {
    width: 14,
    height: 14,
    margin: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
  },
  qrCellFilled: {
    backgroundColor: "#fff",
  },
  qrHint: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    marginTop: SPACING.md,
  },
  summaryCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  selectorCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  selectorList: {
    flexDirection: "column",
    gap: SPACING.sm,
  },
  emptyList: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  emptyLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  bookingChip: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: SPACING.md,
    gap: 4,
  },
  bookingChipActive: {
    borderColor: "rgba(124,58,237,0.6)",
    backgroundColor: "rgba(124,58,237,0.16)",
  },
  bookingChipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingChipTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  bookingChipTitleActive: {
    color: "#fff",
  },
  bookingChipSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
  },
  bookingChipSubtitleActive: {
    color: "#fff",
  },
  bookingChipDate: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  statusBadgeConfirmed: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  statusBadgeCancelled: {
    backgroundColor: "rgba(248,113,113,0.18)",
    borderColor: "rgba(248,113,113,0.4)",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "Urbanist_600SemiBold",
    textTransform: "uppercase",
  },
  statusBadgeTextConfirmed: {
    color: "#86efac",
  },
  statusBadgeTextCancelled: {
    color: "#f87171",
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
  },
  summaryValueBold: {
    fontFamily: "Urbanist_600SemiBold",
  },
  cancelRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.18)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  cancelBtnOutline: {
    backgroundColor: "transparent",
  },
  cancelBtnText: {
    color: "#fca5a5",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 14,
  },
  cancelBtnOutlineText: {
    color: "#fda4af",
  },
  cancelBtnDisabled: {
    opacity: 0.45,
  },
  cancelBtnTextDisabled: {
    color: "rgba(255,255,255,0.4)",
  },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    marginTop: SPACING.xs,
    fontSize: 13,
  },
  actionRow: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    gap: SPACING.xs,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  actionTextPrimary: {
    color: "#fff",
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
  actionTextSecondary: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
    fontSize: 15,
  },
});
