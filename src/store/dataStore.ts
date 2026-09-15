import { create } from "zustand";
import {
  ALARMS,
  BOILER_HISTORY,
  DATA_HISTORY_START,
  ENERGY_RECORDS,
  HOLIDAYS,
  M3_BIRIM_FIYAT,
  NOW,
  READINGS,
  ROOMS,
  SCHEDULE,
  THRESHOLDS,
  computeHissedilen,
  computeLiveTodayEnergy,
} from "../lib/mockData";
import type {
  AlarmRecord,
  BoilerRecord,
  DateRange,
  DateRangePreset,
  EnergyRecord,
  HolidayEntry,
  OverrideRecord,
  Reading,
  Room,
  ScheduleEntry,
  SistemModu,
  Thresholds,
  UserRole,
} from "../lib/types";
import { resolveDateRange } from "../lib/calculations";

let overrideSeq = 1;

interface DataState {
  rooms: Room[];
  readings: Reading[];
  boilerHistory: BoilerRecord[];
  alarms: AlarmRecord[];
  energyRecords: EnergyRecord[];
  overrides: OverrideRecord[];
  thresholds: Thresholds;
  schedule: ScheduleEntry[];
  holidays: HolidayEntry[];
  m3BirimFiyat: number;

  role: UserRole;
  setRole: (r: UserRole) => void;

  systemMode: SistemModu;
  emergencyStop: boolean;
  emergencyStopInfo: { kullanici: string; ts: number } | null;
  lastUpdate: number;
  connectionOk: boolean;

  datePreset: DateRangePreset;
  customRange: { start: number; end: number } | null;
  setDatePreset: (p: DateRangePreset) => void;
  setCustomRange: (start: number, end: number) => void;
  getDateRange: () => DateRange;

  tick: () => void;
  applyOverride: (setpoint: number, kullanici: string, not?: string) => void;
  toggleEmergencyStop: (kullanici: string) => void;
  acknowledgeAlarm: (id: string, kullanici: string) => void;
  closeAlarm: (id: string) => void;
  updateThresholds: (t: Partial<Thresholds>) => void;
  updateRoom: (id: string, patch: Partial<Room>) => void;
  addRoom: (room: Omit<Room, "id" | "buildingId" | "modbusSlaveId">) => void;
  removeRoom: (id: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  rooms: ROOMS,
  readings: READINGS,
  boilerHistory: BOILER_HISTORY,
  alarms: ALARMS,
  energyRecords: ENERGY_RECORDS,
  overrides: [],
  thresholds: THRESHOLDS,
  schedule: SCHEDULE,
  holidays: HOLIDAYS,
  m3BirimFiyat: M3_BIRIM_FIYAT,

  role: "yonetici",
  setRole: (r) => set({ role: r }),

  systemMode: "otomatik",
  emergencyStop: false,
  emergencyStopInfo: null,
  lastUpdate: NOW,
  connectionOk: true,

  datePreset: "son30gun",
  customRange: null,
  setDatePreset: (p) => set({ datePreset: p }),
  setCustomRange: (start, end) =>
    set({ customRange: { start, end }, datePreset: "ozel" }),
  getDateRange: () => {
    const s = get();
    return resolveDateRange(
      s.datePreset,
      DATA_HISTORY_START,
      Date.now(),
      s.customRange ?? undefined
    );
  },

  tick: () => {
    const s = get();
    const ts = Date.now();

    // "Bugün" tüketimi otomasyon durumundan bağımsız, gün içinde her zaman
    // kümülatif olarak artmaya devam eder (bkz. computeLiveTodayEnergy).
    const liveToday = computeLiveTodayEnergy(ts, s.m3BirimFiyat);
    const energyRecords = [
      ...s.energyRecords.filter((e) => e.tarih !== liveToday.tarih),
      liveToday,
    ];

    if (s.emergencyStop) {
      set({ lastUpdate: ts, energyRecords });
      return;
    }
    const connectionOk = Math.random() > 0.03;
    const newReadings: Reading[] = s.rooms.map((room) => {
      const prior = [...s.readings]
        .filter((r) => r.roomId === room.id)
        .sort((a, b) => b.ts - a.ts)[0];
      const base = prior ? prior.sicaklik : 21;
      const drift = (Math.random() - 0.5) * 0.5;
      const temp = Number((base + drift).toFixed(2));
      const humidity = Number((45 + (Math.random() - 0.5) * 10).toFixed(1));
      return {
        roomId: room.id,
        ts,
        sicaklik: temp,
        nem: humidity,
        hissedilenSicaklik: Number(computeHissedilen(temp, humidity).toFixed(2)),
        havaKaliteIndeksi:
          room.sensorTipi === "SAS-IAQ"
            ? Number((60 + Math.random() * 30).toFixed(0))
            : undefined,
        online: connectionOk ? Math.random() > 0.01 : false,
      };
    });

    let quorumOk = true;
    const cepheler = ["kuzey", "guney", "dogu", "bati"];
    for (const c of cepheler) {
      const inCluster = s.rooms.filter((r) => r.cephe === c).map((r) => r.id);
      const temps = newReadings
        .filter((r) => inCluster.includes(r.roomId))
        .map((r) => r.sicaklik);
      if (temps.length === 0) continue;
      const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
      const maxDev = Math.max(...temps.map((t) => Math.abs(t - avg)));
      if (maxDev > s.thresholds.guvenEsigiSapma) quorumOk = false;
    }

    const systemMode: SistemModu = quorumOk ? "otomatik" : "pasif-guvenli";

    set({
      readings: [...s.readings, ...newReadings],
      lastUpdate: ts,
      connectionOk,
      systemMode: s.systemMode === "manuel" ? "manuel" : systemMode,
      energyRecords,
    });
  },

  applyOverride: (setpoint, kullanici, not) => {
    const s = get();
    const rec: OverrideRecord = {
      id: `ovr-${overrideSeq++}`,
      ts: Date.now(),
      kullanici,
      setpoint,
      not,
    };
    const boilerRec: BoilerRecord = {
      ts: Date.now(),
      setpoint,
      acikMi: true,
      sebep: "manuel-override",
      kullanici,
    };
    set({
      overrides: [rec, ...s.overrides],
      boilerHistory: [...s.boilerHistory, boilerRec],
      systemMode: "manuel",
    });
  },

  toggleEmergencyStop: (kullanici) => {
    const s = get();
    const next = !s.emergencyStop;
    const ts = Date.now();
    const latestSetpoint = [...s.boilerHistory].sort((a, b) => b.ts - a.ts)[0]?.setpoint ?? 55;
    const boilerRec: BoilerRecord = {
      ts,
      setpoint: latestSetpoint,
      acikMi: !next,
      sebep: "manuel-override",
      kullanici,
    };
    set({
      emergencyStop: next,
      emergencyStopInfo: next ? { kullanici, ts } : null,
      systemMode: next ? "manuel" : "otomatik",
      boilerHistory: [...s.boilerHistory, boilerRec],
    });
    if (next) {
      const rec: AlarmRecord = {
        id: `alarm-emergency-${ts}`,
        roomId: s.rooms[0].id,
        ts,
        tur: "guven-esigi",
        durum: "acik",
        mesaj: `ACİL DURDUR aktifleştirildi (${kullanici}). Tüm otomasyon durduruldu.`,
      };
      set({ alarms: [rec, ...s.alarms] });
    }
  },

  acknowledgeAlarm: (id, kullanici) =>
    set((s) => ({
      alarms: s.alarms.map((a) =>
        a.id === id
          ? { ...a, durum: "onaylandi", onaylayan: kullanici, onayZamani: Date.now() }
          : a
      ),
    })),

  closeAlarm: (id) =>
    set((s) => ({
      alarms: s.alarms.map((a) => (a.id === id ? { ...a, durum: "kapandi" } : a)),
    })),

  updateThresholds: (t) => set((s) => ({ thresholds: { ...s.thresholds, ...t } })),

  updateRoom: (id, patch) =>
    set((s) => ({
      rooms: s.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })),

  addRoom: (room) =>
    set((s) => {
      const nextIdNum = s.rooms.length + 1 + Math.floor(Math.random() * 1000);
      const nextSlaveId = Math.max(0, ...s.rooms.map((r) => r.modbusSlaveId)) + 1;
      const newRoom: Room = {
        ...room,
        id: `oda-yeni-${nextIdNum}`,
        buildingId: s.rooms[0]?.buildingId ?? "bina-1",
        modbusSlaveId: nextSlaveId,
      };
      const ts = Date.now();
      const seedReading: Reading = {
        roomId: newRoom.id,
        ts,
        sicaklik: 21,
        nem: 45,
        hissedilenSicaklik: computeHissedilen(21, 45),
        havaKaliteIndeksi: newRoom.sensorTipi === "SAS-IAQ" ? 70 : undefined,
        online: true,
      };
      return { rooms: [...s.rooms, newRoom], readings: [...s.readings, seedReading] };
    }),

  removeRoom: (id) =>
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
    })),
}));
