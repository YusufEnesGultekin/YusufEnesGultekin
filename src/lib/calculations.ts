import type {
  AlarmRecord,
  BoilerRecord,
  DateRange,
  DateRangePreset,
  EnergyRecord,
  Reading,
  Room,
} from "./types";

// TEK MERKEZİ HESAPLAMA KATMANI
// Dashboard, rapor ekranı ve Excel/Word export'u SADECE bu fonksiyonları
// kullanmalı. Aynı sayının farklı yerde farklı çıkması burada engellenir.

// Kombi setpoint'i 1°C değiştiğinde bir sınıfın sıcaklığının ne kadar
// değişeceğini gösteren katsayı (mockData'daki simülasyon ile birebir aynı).
export const SETPOINT_SENSITIVITY = 0.08;

export function predictRoomTemp(
  lastTemp: number,
  currentSetpoint: number,
  trialSetpoint: number
): number {
  return round(lastTemp + (trialSetpoint - currentSetpoint) * SETPOINT_SENSITIVITY, 2);
}

export function inRange(ts: number, range: DateRange): boolean {
  return ts >= range.start && ts <= range.end;
}

export function filterReadings(readings: Reading[], range: DateRange): Reading[] {
  return readings.filter((r) => inRange(r.ts, range));
}

export function filterAlarms(alarms: AlarmRecord[], range: DateRange): AlarmRecord[] {
  return alarms.filter((a) => inRange(a.ts, range));
}

export function filterBoiler(records: BoilerRecord[], range: DateRange): BoilerRecord[] {
  return records.filter((b) => inRange(b.ts, range));
}

export function filterEnergy(records: EnergyRecord[], range: DateRange): EnergyRecord[] {
  return records.filter((e) => {
    const ts = new Date(e.tarih + "T00:00:00Z").getTime();
    return inRange(ts, range);
  });
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function round(value: number, digits = 1): number {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

export interface RoomKpi {
  roomId: string;
  ortSicaklik: number;
  ortNem: number;
  ortHissedilen: number;
  sonSicaklik: number | null;
  sonOnline: boolean;
  okumaSayisi: number;
}

export function computeRoomKpi(readings: Reading[], roomId: string): RoomKpi {
  const roomReadings = readings.filter((r) => r.roomId === roomId);
  const sorted = [...roomReadings].sort((a, b) => a.ts - b.ts);
  const last = sorted[sorted.length - 1] ?? null;
  return {
    roomId,
    ortSicaklik: round(average(roomReadings.map((r) => r.sicaklik)), 2),
    ortNem: round(average(roomReadings.map((r) => r.nem)), 1),
    ortHissedilen: round(average(roomReadings.map((r) => r.hissedilenSicaklik)), 2),
    sonSicaklik: last ? last.sicaklik : null,
    sonOnline: last ? last.online : false,
    okumaSayisi: roomReadings.length,
  };
}

export function computeCepheOrtalamalari(
  readings: Reading[],
  rooms: Room[]
): { cephe: string; ortSicaklik: number; ortHissedilen: number }[] {
  const cepheler = ["kuzey", "guney", "dogu", "bati"];
  return cepheler.map((cephe) => {
    const roomIds = rooms.filter((r) => r.cephe === cephe).map((r) => r.id);
    const filtered = readings.filter((r) => roomIds.includes(r.roomId));
    return {
      cephe,
      ortSicaklik: round(average(filtered.map((r) => r.sicaklik)), 2),
      ortHissedilen: round(average(filtered.map((r) => r.hissedilenSicaklik)), 2),
    };
  });
}

export interface EnergyKpi {
  toplamTuketimM3: number;
  toplamReferansM3: number;
  toplamTasarrufM3: number;
  toplamTasarrufTL: number;
  tasarrufYuzdesi: number;
}

export function computeEnergyKpi(records: EnergyRecord[]): EnergyKpi {
  const toplamTuketimM3 = round(sum(records.map((r) => r.tahminiTuketimM3)), 1);
  const toplamReferansM3 = round(sum(records.map((r) => r.referansTuketimM3)), 1);
  const toplamTasarrufM3 = round(toplamReferansM3 - toplamTuketimM3, 1);
  const toplamTasarrufTL = round(sum(records.map((r) => r.tasarrufTL)), 0);
  const tasarrufYuzdesi =
    toplamReferansM3 > 0 ? round((toplamTasarrufM3 / toplamReferansM3) * 100, 1) : 0;
  return {
    toplamTuketimM3,
    toplamReferansM3,
    toplamTasarrufM3,
    toplamTasarrufTL,
    tasarrufYuzdesi,
  };
}

export interface AlarmKpi {
  toplam: number;
  acik: number;
  kapandi: number;
  onaylandi: number;
  turDagilimi: Record<string, number>;
}

export function computeAlarmKpi(alarms: AlarmRecord[]): AlarmKpi {
  const turDagilimi: Record<string, number> = {};
  alarms.forEach((a) => {
    turDagilimi[a.tur] = (turDagilimi[a.tur] ?? 0) + 1;
  });
  return {
    toplam: alarms.length,
    acik: alarms.filter((a) => a.durum === "acik").length,
    kapandi: alarms.filter((a) => a.durum === "kapandi").length,
    onaylandi: alarms.filter((a) => a.durum === "onaylandi").length,
    turDagilimi,
  };
}

export function computeChronicRooms(
  alarms: AlarmRecord[],
  rooms: Room[],
  minTekrar: number
): { roomId: string; ad: string; tekrarSayisi: number }[] {
  const counts: Record<string, number> = {};
  alarms
    .filter((a) => a.tur === "kronik-sorun" || a.tur === "ani-dusus")
    .forEach((a) => {
      counts[a.roomId] = (counts[a.roomId] ?? 0) + 1;
    });
  return Object.entries(counts)
    .filter(([, c]) => c >= minTekrar)
    .map(([roomId, tekrarSayisi]) => ({
      roomId,
      ad: rooms.find((r) => r.id === roomId)?.ad ?? roomId,
      tekrarSayisi,
    }))
    .sort((a, b) => b.tekrarSayisi - a.tekrarSayisi);
}

export function computeSensorHealth(
  readings: Reading[],
  rooms: Room[]
): {
  roomId: string;
  ad: string;
  sonHaberlesme: number | null;
  onlineOrani: number;
}[] {
  return rooms.map((room) => {
    const roomReadings = readings.filter((r) => r.roomId === room.id);
    const sorted = [...roomReadings].sort((a, b) => a.ts - b.ts);
    const last = sorted[sorted.length - 1];
    const onlineCount = roomReadings.filter((r) => r.online).length;
    return {
      roomId: room.id,
      ad: room.ad,
      sonHaberlesme: last ? last.ts : null,
      onlineOrani:
        roomReadings.length > 0
          ? round((onlineCount / roomReadings.length) * 100, 1)
          : 0,
    };
  });
}

const PRESET_LABELS: Record<DateRangePreset, string> = {
  bugun: "Bugün",
  son7gun: "Son 7 Gün",
  son30gun: "Son 30 Gün",
  buay: "Bu Ay",
  gecenay: "Geçen Ay",
  busezon: "Bu Sezon (Ekim-Mart)",
  buyil: "Bu Yıl",
  tumzamanlar: "Tüm Zamanlar",
  ozel: "Özel Aralık",
};

export function resolveDateRange(
  preset: DateRangePreset,
  earliest: number,
  now: number,
  custom?: { start: number; end: number }
): DateRange {
  const d = new Date(now);
  const startOfDay = (t: number) => {
    const dt = new Date(t);
    dt.setUTCHours(0, 0, 0, 0);
    return dt.getTime();
  };
  const endOfDay = (t: number) => {
    const dt = new Date(t);
    dt.setUTCHours(23, 59, 59, 999);
    return dt.getTime();
  };
  const DAY = 24 * 3600_000;

  switch (preset) {
    case "bugun":
      return { start: startOfDay(now), end: endOfDay(now), label: PRESET_LABELS[preset] };
    case "son7gun":
      return { start: startOfDay(now - 6 * DAY), end: endOfDay(now), label: PRESET_LABELS[preset] };
    case "son30gun":
      return { start: startOfDay(now - 29 * DAY), end: endOfDay(now), label: PRESET_LABELS[preset] };
    case "buay": {
      const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
      return { start, end: endOfDay(now), label: PRESET_LABELS[preset] };
    }
    case "gecenay": {
      const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1);
      const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0, 23, 59, 59, 999);
      return { start, end, label: PRESET_LABELS[preset] };
    }
    case "busezon": {
      const year = d.getUTCMonth() >= 9 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
      const start = Date.UTC(year, 9, 1);
      const end = Date.UTC(year + 1, 2, 31, 23, 59, 59, 999);
      return { start, end: Math.min(end, endOfDay(now)), label: PRESET_LABELS[preset] };
    }
    case "buyil": {
      const start = Date.UTC(d.getUTCFullYear(), 0, 1);
      return { start, end: endOfDay(now), label: PRESET_LABELS[preset] };
    }
    case "tumzamanlar":
      return { start: earliest, end: endOfDay(now), label: PRESET_LABELS[preset] };
    case "ozel":
      return {
        start: custom ? startOfDay(custom.start) : startOfDay(now),
        end: custom ? endOfDay(custom.end) : endOfDay(now),
        label: PRESET_LABELS[preset],
      };
  }
}
