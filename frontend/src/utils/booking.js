// src/utils/booking.js

const SERVICE_TYPES = ["flight", "hotel", "car", "attraction", "combined"];

const randomId = (prefix = "bk") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const buildServiceKey = (planId, serviceType, unique = null) => {
  const base =
    typeof planId === "string" && planId.trim().length
      ? planId.trim()
      : "plan";
  const cleanType =
    typeof serviceType === "string" && serviceType.trim().length
      ? serviceType.trim().toLowerCase()
      : "combined";
  const suffix =
    unique === null || unique === undefined || unique === ""
      ? ""
      : `_${String(unique).replace(/\s+/g, "-")}`;
  return `${base}_${cleanType}${suffix}`;
};

export const createEmptyBookingLedger = () => ({
  records: {},
  byType: SERVICE_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {}),
  batches: {},
  lastUpdated: null,
});

export const normalizeBookingLedger = (ledger) => {
  if (!ledger || typeof ledger !== "object") {
    return createEmptyBookingLedger();
  }

  const next = createEmptyBookingLedger();

  if (Array.isArray(ledger)) {
    ledger
      .filter((record) => record?.serviceKey)
      .forEach((record) => {
        upsertBookingRecord(next, record);
      });
    return next;
  }

  const records = ledger.records && typeof ledger.records === "object"
    ? ledger.records
    : {};

  Object.entries(records).forEach(([key, record]) => {
    if (record && typeof record === "object" && record?.serviceKey) {
      // Ensure we have a valid record object with all required fields
      const validRecord = {
        ...record,
        serviceKey: String(record.serviceKey || key),
      };
      // Directly add to next.records instead of calling upsertBookingRecord 
      // to avoid recursive normalization issues
      next.records[validRecord.serviceKey] = validRecord;
      
      // Update byType
      const serviceType = validRecord.serviceType || "combined";
      if (!Array.isArray(next.byType[serviceType])) {
        next.byType[serviceType] = [];
      }
      if (!next.byType[serviceType].includes(validRecord.serviceKey)) {
        next.byType[serviceType] = [...next.byType[serviceType], validRecord.serviceKey];
      }
      
      // Update batches if needed
      if (validRecord.batchId) {
        if (!Array.isArray(next.batches[validRecord.batchId])) {
          next.batches[validRecord.batchId] = [];
        }
        if (!next.batches[validRecord.batchId].includes(validRecord.serviceKey)) {
          next.batches[validRecord.batchId] = [...next.batches[validRecord.batchId], validRecord.serviceKey];
        }
      }
    }
  });

  if (ledger.batches && typeof ledger.batches === "object") {
    Object.entries(ledger.batches).forEach(([batchId, keys]) => {
      if (!Array.isArray(keys)) return;
      next.batches[batchId] = keys.filter((key) => Boolean(next.records[key]));
    });
  }

  next.lastUpdated = ledger.lastUpdated ?? null;
  return next;
};

export const createBookingRecord = ({
  serviceKey,
  serviceType,
  provider,
  amount = 0,
  currency = "USD",
  subtotal = 0,
  taxes = 0,
  twosFee = 0,
  traveler = null,
  passengers = [],
  cabinClass = null,
  data = {},
  batchId = null,
}) => {
  const safeType = SERVICE_TYPES.includes(serviceType)
    ? serviceType
    : "combined";
  const confirmedAt = new Date().toISOString();
  const bookingId = randomId(safeType);
  const passengerNames = Array.isArray(passengers)
    ? passengers
        .map((p) =>
          [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim()
        )
        .filter(Boolean)
    : [];

  const qrPayload = {
    bookingId,
    serviceKey,
    serviceType: safeType,
    provider,
    status: "confirmed",
    confirmedAt,
    batchId,
    amounts: {
      total: amount,
      subtotal,
      taxes,
      twosFee,
      currency,
    },
    traveler: traveler
      ? {
          name: traveler.name,
          email: traveler.email,
          phone: traveler.phone,
          countryCode: traveler.countryCode,
        }
      : null,
    passengers: Array.isArray(passengers)
      ? passengers.map((p) => ({
          firstName: p?.firstName ?? null,
          lastName: p?.lastName ?? null,
          type: p?.type ?? null,
          age: p?.age ?? null,
          seat: p?.seat ?? null,
          document: p?.document ?? null,
        }))
      : [],
    passengerNames,
    cabinClass,
    data: data || {},
  };

  return {
    bookingId,
    serviceKey,
    serviceType: safeType,
    provider,
    amount,
    currency,
    subtotal,
    taxes,
    twosFee,
    traveler,
    passengers: Array.isArray(passengers) ? passengers : [],
    cabinClass,
    data: data || {},
    batchId,
    confirmedAt,
    status: "confirmed",
    qrData: JSON.stringify(qrPayload, null, 2),
  };
};

export const upsertBookingRecord = (ledger, record) => {
  if (!ledger || !record?.serviceKey) {
    return ledger;
  }
  const next = normalizeBookingLedger(ledger);
  const { serviceKey, serviceType } = record;
  // Deep copy the record to ensure all nested properties are preserved
  next.records[serviceKey] = JSON.parse(JSON.stringify(record));

  if (!Array.isArray(next.byType[serviceType])) {
    next.byType[serviceType] = [];
  }
  if (!next.byType[serviceType].includes(serviceKey)) {
    next.byType[serviceType] = [...next.byType[serviceType], serviceKey];
  }

  if (record.batchId) {
    const existing = Array.isArray(next.batches[record.batchId])
      ? next.batches[record.batchId]
      : [];
    if (!existing.includes(serviceKey)) {
      next.batches[record.batchId] = [...existing, serviceKey];
    }
  }

  next.lastUpdated = new Date().toISOString();
  return next;
};

export const cancelBookingRecords = (ledger, serviceKeys = []) => {
  if (!ledger) return createEmptyBookingLedger();
  const next = normalizeBookingLedger(ledger);
  const now = new Date().toISOString();
  serviceKeys.forEach((key) => {
    if (next.records[key]) {
      next.records[key] = {
        ...next.records[key],
        status: "cancelled",
        cancelledAt: now,
      };
    }
  });
  next.lastUpdated = now;
  return next;
};

export const removeBookingRecords = (ledger, serviceKeys = []) => {
  if (!ledger) return createEmptyBookingLedger();
  const next = normalizeBookingLedger(ledger);
  const set = new Set(serviceKeys);
  Object.keys(next.records).forEach((key) => {
    if (set.has(key)) {
      const record = next.records[key];
      delete next.records[key];
      const list = next.byType[record.serviceType] || [];
      next.byType[record.serviceType] = list.filter((k) => k !== key);
      if (record.batchId && Array.isArray(next.batches[record.batchId])) {
        next.batches[record.batchId] = next.batches[record.batchId].filter(
          (k) => k !== key
        );
      }
    }
  });
  next.lastUpdated = new Date().toISOString();
  return next;
};

export const getActiveBookings = (ledger, type) => {
  if (!ledger) return [];
  const normalized = normalizeBookingLedger(ledger);
  if (type) {
    return (normalized.byType[type] || [])
      .map((key) => normalized.records[key])
      .filter((record) => record && record.status !== "cancelled");
  }

  return Object.values(normalized.records).filter(
    (record) => record && record.status !== "cancelled"
  );
};

export const hasActiveBookings = (ledger) =>
  getActiveBookings(ledger).length > 0;

export const mergeBookingLedgers = (current, incoming) => {
  const base = normalizeBookingLedger(current);
  const additions = normalizeBookingLedger(incoming);
  let merged = base;
  Object.values(additions.records).forEach((record) => {
    merged = upsertBookingRecord(merged, record);
  });
  Object.entries(additions.batches).forEach(([batchId, keys]) => {
    if (!Array.isArray(keys)) return;
    const existing = Array.isArray(merged.batches[batchId])
      ? merged.batches[batchId]
      : [];
    merged.batches[batchId] = Array.from(new Set([...existing, ...keys]));
  });
  merged.lastUpdated = additions.lastUpdated ?? merged.lastUpdated;
  return merged;
};
