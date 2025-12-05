// src/screens/AdminScannerScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  ChevronLeft,
  RefreshCcw,
  ShieldCheck,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "../theme";

const flattenPayload = (value, prefix = "") => {
  const rows = [];
  const makeLabel = (key) => (prefix ? `${prefix}.${key}` : key);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      rows.push(...flattenPayload(item, `${prefix}[${index}]`));
    });
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, val]) => {
      rows.push(...flattenPayload(val, makeLabel(key)));
    });
  } else {
    rows.push({
      key: prefix || "value",
      value:
        value === null || value === undefined ? String(value) : String(value),
    });
  }

  return rows;
};

export default function AdminScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [payload, setPayload] = useState(null);
  const [rawData, setRawData] = useState("");
  const [parseError, setParseError] = useState(null);
  const isLoadingPermission = permission === null;
  const hasPermission = permission?.granted ?? false;
  const canAskAgain = permission?.canAskAgain !== false;
  const [expandedGroups, setExpandedGroups] = useState({
    flight: true,
    hotel: true,
    car: true,
    attraction: true,
    other: true,
    summaryFlight: true,
    summaryHotel: true,
    summaryCar: true,
    summaryAttractions: true,
  });
  const [lastScannedAt, setLastScannedAt] = useState(null);

  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    setLastScannedAt(new Date().toISOString());
    setRawData(data || "");
    try {
      const parsed = JSON.parse(data);
      setPayload(parsed);
      setParseError(null);
    } catch (err) {
      setPayload(null);
      setParseError(
        "Scanned code is not valid JSON. Showing raw payload below."
      );
    }
  };

  const resetScan = () => {
    setScanned(false);
    setPayload(null);
    setRawData("");
    setParseError(null);
    setLastScannedAt(null);
  };

  const flattenedDetails = useMemo(
    () => (payload ? flattenPayload(payload) : []),
    [payload]
  );

  const decodedSummary = useMemo(() => {
    if (!payload || typeof payload !== "object") return null;
    if (
      payload?.flight ||
      payload?.hotel ||
      payload?.car ||
      payload?.attractions
    ) {
      return {
        kind: "summaryFormatted",
        summary: payload,
      };
    }
    if (payload?.t === "twos-bookings-summary") {
      const bookings = Array.isArray(payload?.bk) ? payload.bk : [];
      return {
        kind: "summary",
        count: payload?.n ?? bookings.length,
        generatedAt: payload?.g ?? payload?.gAt ?? null,
        bookings: bookings.map((b) => {
          // Array format: [id, sk, st, p, s, cAt, amt, cur, trn, tre, trph, trcc]
          if (Array.isArray(b)) {
            return {
              bookingId: b[0],
              serviceKey: b[1],
              serviceType: b[2],
              provider: b[3],
              status: b[4] || "booked",
              confirmedAt: b[5],
              amount: b[6],
              currency: b[7],
              traveler: {
                n: b[8],
                e: b[9],
                ph: b[10],
                cc: b[11],
              },
            };
          }
          return {
            bookingId: b?.id ?? b?.bookingId,
            serviceKey: b?.sk ?? b?.serviceKey,
            serviceType: b?.st ?? b?.serviceType,
            provider: b?.p ?? b?.provider,
            status: b?.s ?? b?.status ?? "booked",
            confirmedAt: b?.cAt ?? b?.confirmedAt,
            amount: b?.amt ?? b?.amount,
            currency: b?.cur ?? b?.currency,
            traveler: b?.tr ?? null,
          };
        }),
      };
    }
    if (payload?.t === "twos-booking") {
      const pax = Array.isArray(payload?.pax) ? payload.pax : [];
      return {
        bookingId: payload.id ?? null,
        provider: payload.p ?? "Provider",
        serviceType: payload.st ?? payload.serviceType ?? "booking",
        confirmedAt: payload.cAt ?? payload.confirmedAt ?? null,
        status: payload.s ?? "booked",
        total:
          payload?.amt?.total ??
          payload.amount ??
          payload.total ??
          payload.price ??
          null,
        currency:
          payload?.amt?.currency ??
          payload.currency ??
          payload.price_currency ??
          "USD",
        travelerName: payload?.tr?.n ?? payload?.tr?.name ?? null,
        passengerCount: pax.length,
      };
    }
    return {
      bookingId:
        payload.bookingId ??
        payload.booking_id ??
        payload.id ??
        payload.reference,
      provider: payload.provider ?? payload.vendor ?? "Provider",
      serviceType: payload.serviceType ?? payload.type ?? "booking",
      confirmedAt: payload.confirmedAt ?? payload.confirmed_at ?? null,
      status: payload.status ?? "unknown",
      total:
        payload?.amounts?.total ??
        payload.amount ??
        payload.total ??
        payload.price ??
        null,
      currency:
        payload?.amounts?.currency ??
        payload.currency ??
        payload.price_currency,
      travelerName: payload?.traveler?.name ?? null,
      passengerCount: Array.isArray(payload?.passengers)
        ? payload.passengers.length
        : null,
    };
  }, [payload]);

  const groupedSummary = useMemo(() => {
    if (!decodedSummary || decodedSummary.kind !== "summary") return null;
    const groups = {
      flight: [],
      hotel: [],
      car: [],
      attraction: [],
      other: [],
    };
    decodedSummary.bookings.forEach((b) => {
      const type = (b.serviceType || "").toLowerCase();
      const key = ["flight", "hotel", "car", "attraction"].includes(type)
        ? type
        : "other";
      groups[key].push(b);
    });
    return groups;
  }, [decodedSummary]);

  const formatDateSafe = (value) => {
    if (!value) return "N/A";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  };

  const formatMoney = (amt, cur) => {
    if (amt == null) return "N/A";
    return `${amt} ${cur ?? ""}`.trim();
  };

  const toggleGroup = (key) =>
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const permissionDenied = permission && !permission.granted;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.replace("Login")}
          style={styles.backBtn}
          activeOpacity={0.85}
        >
          <ChevronLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Admin scanner</Text>
          <Text style={styles.headerSubtitle}>Validate booking QR codes</Text>
        </View>
        <View style={styles.badge}>
          <ShieldCheck size={14} color="#22c55e" />
          <Text style={styles.badgeText}>Verified</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.scannerCard}>
          <View style={styles.scannerHeader}>
            <View style={styles.scannerTitleRow}>
              <Camera size={18} color="#fff" />
              <Text style={styles.scannerTitle}>Scan booking</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.rescanBtn,
                !scanned && styles.rescanBtnDisabled,
              ]}
              onPress={resetScan}
              disabled={!scanned}
              activeOpacity={0.85}
            >
              <RefreshCcw size={14} color="#0ea5e9" />
              <Text style={styles.rescanText}>Scan again</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.scannerFrame}>
            {isLoadingPermission ? (
              <View style={styles.permissionNotice}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.noticeText}>
                  Checking camera permission…
                </Text>
              </View>
            ) : permissionDenied && !canAskAgain ? (
              <View style={styles.permissionNotice}>
                <Text style={styles.noticeTitle}>Camera blocked</Text>
                <Text style={styles.noticeText}>
                  Grant camera access in system settings to scan booking QR codes.
                </Text>
              </View>
            ) : !hasPermission ? (
              <TouchableOpacity
                onPress={requestPermission}
                style={styles.permissionNotice}
                activeOpacity={0.85}
              >
                <Text style={styles.noticeTitle}>Camera access needed</Text>
                <Text style={styles.noticeText}>
                  Tap to allow camera access and scan booking QR codes.
                </Text>
              </TouchableOpacity>
            ) : scanned ? (
              <View style={styles.permissionNotice}>
                <Text style={styles.noticeTitle}>Scan complete</Text>
                <Text style={styles.noticeText}>
                  Tap "Scan again" to reopen the camera.
                </Text>
              </View>
            ) : (
              <CameraView
                barcodeScannerSettings={{
                  barcodeTypes: ["qr", "pdf417"],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
            )}
            {!scanned && hasPermission && !permissionDenied ? (
              <View style={styles.overlayText}>
                <Text style={styles.overlayTitle}>Align the QR inside frame</Text>
                <Text style={styles.overlaySubtitle}>
                  We will decode all booking details automatically.
                </Text>
              </View>
            ) : null}
          </View>

          {parseError ? (
            <Text style={styles.errorText}>{parseError}</Text>
          ) : null}
          {rawData && !payload ? (
            <View style={styles.rawCard}>
              <Text style={styles.rawTitle}>Raw payload</Text>
              <ScrollView
                style={styles.rawScroll}
                contentContainerStyle={{ paddingBottom: SPACING.sm }}
                horizontal
              >
                <Text style={styles.rawText}>{rawData}</Text>
              </ScrollView>
            </View>
          ) : null}
        </View>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusPill,
              scanned ? styles.statusPillSuccess : styles.statusPillNeutral,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                scanned ? styles.statusPillTextActive : null,
              ]}
            >
              {scanned ? "Scan complete" : "Ready to scan"}
            </Text>
          </View>
          <View style={styles.statusPillMuted}>
            <Text style={styles.statusPillTextMuted}>
              Last scan:{" "}
              {lastScannedAt
                ? new Date(lastScannedAt).toLocaleTimeString()
                : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Decoded booking</Text>
          {decodedSummary?.kind === "summaryFormatted" ? (
            <>
              <Text style={styles.sectionSubtitle}>All bookings summary</Text>
              {["flight", "hotel", "car", "attractions"].map((key) => {
                const section = decodedSummary.summary[key];
                if (!section || (Array.isArray(section) && !section.length)) {
                  return null;
                }
                const isOpen =
                  expandedGroups[
                    `summary${key.charAt(0).toUpperCase() + key.slice(1)}`
                  ] ?? true;
                const toggleKey = `summary${
                  key.charAt(0).toUpperCase() + key.slice(1)
                }`;
                return (
                  <View key={key} style={styles.dropdownSection}>
                    <TouchableOpacity
                      style={styles.dropdownHeader}
                      onPress={() => toggleGroup(toggleKey)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dropdownTitle}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                        {Array.isArray(section) ? ` (${section.length})` : ""}
                      </Text>
                      {isOpen ? (
                        <ChevronUp size={16} color="#fff" />
                      ) : (
                        <ChevronDown size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                    {isOpen ? (
                      key === "flight" ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailKey}>Flight</Text>
                          <Text style={styles.detailValue}>
                            {section.airline_name ?? section.provider ?? "Flight"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Status: {section.status ?? "Booked"}
                          </Text>
                          {section.price_per_person ? (
                            <Text style={styles.detailSubValue}>
                              Price per person: {section.price_per_person} {section.currency ?? ""}
                            </Text>
                          ) : null}
                          {Array.isArray(section.passenger_names) &&
                          section.passenger_names.length ? (
                            <View style={styles.passengerList}>
                              {section.passenger_names.map((name, idx) => (
                                <Text
                                  key={`flight-passenger-${idx}`}
                                  style={styles.detailSubValue}
                                >
                                  {name}
                                </Text>
                              ))}
                            </View>
                          ) : null}
                          {section.amount_paid ? (
                            <Text style={styles.detailSubValue}>
                              Paid: {section.amount_paid} {section.currency ?? ""}
                            </Text>
                          ) : null}
                        </View>
                      ) : key === "hotel" ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailKey}>Hotel</Text>
                          <Text style={styles.detailValue}>
                            {section.name ?? "Hotel"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Rating: {section.rating ?? "N/A"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Total: {section.total_price} {section.currency ?? ""}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Per night: {section.price_per_night} {section.currency ?? ""}
                          </Text>
                        </View>
                      ) : key === "car" ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailKey}>Car</Text>
                          <Text style={styles.detailValue}>
                            {section.provider ?? "Car rental"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Status: {section.status ?? "Booked"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Total: {section.total_price ?? "N/A"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Pickup: {section.pickup ?? "N/A"}
                          </Text>
                          <Text style={styles.detailSubValue}>
                            Dropoff: {section.dropoff ?? "N/A"}
                          </Text>
                        </View>
                      ) : (
                        Array.isArray(section) && (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailKey}>Attractions</Text>
                            <View style={styles.attractionList}>
                              {section.map((a, idx) => (
                                <View
                                  key={`attraction-${idx}`}
                                  style={styles.attractionItem}
                                >
                                  <Text style={styles.attractionName}>
                                    {a.name}
                                  </Text>
                                  <Text style={styles.attractionPrice}>
                                    {a.price} {a.currency ?? ""}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )
                      )
                    ) : null}
                  </View>
                );
              })}

              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Totals</Text>
                <Text style={styles.detailValue}>
                  {decodedSummary.summary.total_price ?? "N/A"}
                </Text>
                <Text style={styles.detailSubValue}>
                  Status: {decodedSummary.summary.status ?? "Booked"}
                </Text>
              </View>
            </>
          ) : decodedSummary?.kind === "summary" ? (
            <>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Bookings included"
                  value={decodedSummary.count ?? "N/A"}
                />
                <SummaryItem
                  label="Generated at"
                  value={
                    decodedSummary.generatedAt
                      ? new Date(decodedSummary.generatedAt).toLocaleString()
                      : "N/A"
                  }
                />
              </View>
              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>Bookings</Text>
              {["flight", "hotel", "car", "attraction", "other"].map((key) => {
                const list = groupedSummary?.[key] || [];
                if (!list.length) return null;
                const isOpen = expandedGroups[key];
                const label =
                  key === "other"
                    ? "Other"
                    : key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <View key={key} style={styles.dropdownSection}>
                    <TouchableOpacity
                      style={styles.dropdownHeader}
                      onPress={() => toggleGroup(key)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dropdownTitle}>
                        {label} ({list.length})
                      </Text>
                      {isOpen ? (
                        <ChevronUp size={16} color="#fff" />
                      ) : (
                        <ChevronDown size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                    {isOpen
                      ? list.map((b) => (
                          <View
                            key={`${b.bookingId ?? b.serviceKey}`}
                            style={styles.detailRow}
                          >
                            <Text style={styles.detailKey}>
                              {b.bookingId ?? "Booking"}
                            </Text>
                            <Text style={styles.detailValue}>
                              {b.provider ?? "Provider"} •{" "}
                              {(b.status ?? "BOOKED").toUpperCase()}
                            </Text>
                            <Text style={styles.detailSubValue}>
                              Service key: {b.serviceKey ?? "N/A"}
                            </Text>
                            <Text style={styles.detailSubValue}>
                              Amount: {formatMoney(b.amount, b.currency)}
                            </Text>
                            <Text style={styles.detailSubValue}>
                              Traveler:{" "}
                              {b.traveler?.n ??
                                b.traveler?.name ??
                                "N/A"}
                            </Text>
                            {b.traveler?.e ? (
                              <Text style={styles.detailSubValue}>
                                Email: {b.traveler.e}
                              </Text>
                            ) : null}
                            {b.traveler?.ph ? (
                              <Text style={styles.detailSubValue}>
                                Phone: {b.traveler.cc ?? ""} {b.traveler.ph}
                              </Text>
                            ) : null}
                            <Text style={styles.detailSubValue}>
                              Confirmed: {formatDateSafe(b.confirmedAt)}
                            </Text>
                            <Text style={styles.detailSubValue}>
                              Type: {b.serviceType ?? key}
                            </Text>
                            {Array.isArray(b.passengers) && b.passengers.length ? (
                              <View style={styles.passengerList}>
                                {b.passengers.map((p, idx) => (
                                  <Text
                                    key={`${b.bookingId}-pax-${idx}`}
                                    style={styles.detailSubValue}
                                  >
                                    Passenger {idx + 1}:{" "}
                                    {[p?.fn, p?.ln].filter(Boolean).join(" ") ||
                                      "Name N/A"}
                                    {p?.t ? ` • ${p.t}` : ""}
                                  </Text>
                                ))}
                              </View>
                            ) : null}
                            {Array.isArray(b.dataEntries) && b.dataEntries.length ? (
                              <View style={styles.passengerList}>
                                {b.dataEntries.map(([k, v], idx) => (
                                  <Text
                                    key={`${b.bookingId}-data-${idx}`}
                                    style={styles.detailSubValue}
                                  >
                                    {k}: {String(v)}
                                  </Text>
                                ))}
                              </View>
                            ) : null}
                          </View>
                        ))
                      : null}
                  </View>
                );
              })}
            </>
          ) : payload ? (
            <>
              <View style={styles.summaryRow}>
                <SummaryItem label="Booking ID" value={decodedSummary?.bookingId} />
                <SummaryItem
                  label="Status"
                  value={
                    (decodedSummary?.status ?? "").toString().toUpperCase() ||
                    "UNKNOWN"
                  }
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Provider"
                  value={decodedSummary?.provider}
                />
                <SummaryItem
                  label="Service"
                  value={decodedSummary?.serviceType}
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Confirmed"
                  value={
                    decodedSummary?.confirmedAt
                      ? new Date(decodedSummary.confirmedAt).toLocaleString()
                      : "N/A"
                  }
                />
                <SummaryItem
                  label="Passengers"
                  value={
                    decodedSummary?.passengerCount != null
                      ? String(decodedSummary.passengerCount)
                      : "N/A"
                  }
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryItem
                  label="Traveler"
                  value={decodedSummary?.travelerName ?? "N/A"}
                />
                <SummaryItem
                  label="Total"
                  value={
                    decodedSummary?.total != null
                      ? `${decodedSummary.total} ${
                          decodedSummary?.currency ?? ""
                        }`.trim()
                      : "N/A"
                  }
                />
              </View>

              <View style={styles.divider} />
              <Text style={styles.sectionSubtitle}>All fields</Text>
              <View style={styles.detailsList}>
                {flattenedDetails.map((item, index) => (
                  <View
                    key={`${item.key}-${index}`}
                    style={styles.detailRow}
                  >
                    <Text style={styles.detailKey}>{item.key}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.rawJsonCard}>
                <Text style={styles.sectionSubtitle}>Raw JSON</Text>
                <ScrollView
                  style={styles.rawJsonScroll}
                  contentContainerStyle={{ paddingBottom: SPACING.md }}
                >
                  <Text style={styles.rawJsonText}>
                    {JSON.stringify(payload, null, 2)}
                  </Text>
                </ScrollView>
              </View>
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderTitle}>Awaiting scan</Text>
              <Text style={styles.placeholderSubtitle}>
                Point your camera at a booking QR code to see every detail here.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryItem = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value ?? "N/A"}</Text>
  </View>
);

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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  headerTitles: { flex: 1, marginLeft: SPACING.sm },
  headerTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 18,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.16)",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
  },
  badgeText: {
    color: "#bbf7d0",
    fontSize: 12,
    fontFamily: "Urbanist_600SemiBold",
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  scannerCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  scannerTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(14,165,233,0.12)",
    borderWidth: 1,
    borderColor: "rgba(14,165,233,0.4)",
  },
  rescanBtnDisabled: {
    opacity: 0.4,
  },
  rescanText: {
    color: "#0ea5e9",
    fontFamily: "Urbanist_600SemiBold",
  },
  scannerFrame: {
    marginTop: SPACING.sm,
    height: 260,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(124,58,237,0.4)",
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionNotice: {
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  noticeTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    marginBottom: 6,
  },
  noticeText: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  overlayText: {
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  overlayTitle: {
    color: "#fff",
    fontFamily: "Urbanist_700Bold",
  },
  overlaySubtitle: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 4,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  rawCard: {
    marginTop: SPACING.xs,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.sm,
  },
  rawTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    marginBottom: 4,
  },
  rawScroll: { maxHeight: 120 },
  rawText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  detailsCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Urbanist_700Bold",
    marginBottom: SPACING.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  summaryItem: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginBottom: 2,
  },
  summaryValue: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: SPACING.sm,
  },
  detailsList: {
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginHorizontal: SPACING.sm,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  statusPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  statusPillSuccess: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.35)",
  },
  statusPillNeutral: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  statusPillText: {
    color: "#22c55e",
    fontFamily: "Urbanist_700Bold",
  },
  statusPillTextActive: {
    color: "#22c55e",
  },
  statusPillMuted: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flex: 1,
  },
  statusPillTextMuted: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "Urbanist_600SemiBold",
  },
  detailRow: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(11,16,32,0.8)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: SPACING.xs,
  },
  detailKey: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    color: COLORS.text,
    fontFamily: "Urbanist_600SemiBold",
  },
  detailSubValue: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    marginTop: 2,
  },
  dropdownSection: {
    marginBottom: SPACING.sm,
  },
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  dropdownTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
  },
  passengerList: {
    marginTop: 4,
  },
  attractionList: {
    marginTop: 6,
    gap: SPACING.xs,
  },
  attractionItem: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1,
    borderColor: "rgba(124,58,237,0.35)",
  },
  attractionName: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
  },
  attractionPrice: {
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  rawJsonCard: {
    marginTop: SPACING.sm,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: SPACING.sm,
  },
  rawJsonScroll: {
    maxHeight: 240,
    marginTop: 6,
  },
  rawJsonText: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Urbanist_500Medium",
    fontSize: 12,
  },
  placeholder: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  placeholderTitle: {
    color: COLORS.text,
    fontFamily: "Urbanist_700Bold",
    fontSize: 16,
  },
  placeholderSubtitle: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    marginTop: 4,
    fontSize: 13,
  },
});
