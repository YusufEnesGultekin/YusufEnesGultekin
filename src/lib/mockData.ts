import type {
  AlarmRecord,
  BoilerRecord,
  Building,
  EnergyRecord,
  Floor,
  HolidayEntry,
  Reading,
  Room,
  ScheduleEntry,
  Thresholds,
} from "./types";
import { SETPOINT_SENSITIVITY } from "./calculations";
import { GUNCEL_M3_FIYAT_VARSAYIM_TL } from "./simulationEngine";

export const BUILDING: Building = {
  id: "bina-1",
  ad: "Cumhuriyet İlkokulu",
  adres: "Merkez Mah. Atatürk Cad. No:12",
};

export const FLOORS: Floor[] = [
  { id: "kat-0", buildingId: BUILDING.id, ad: "Zemin Kat", siraNo: 0 },
  { id: "kat-1", buildingId: BUILDING.id, ad: "1. Kat", siraNo: 1 },
  { id: "kat-2", buildingId: BUILDING.id, ad: "2. Kat", siraNo: 2 },
  { id: "kat-3", buildingId: BUILDING.id, ad: "3. Kat", siraNo: 3 },
];

const cepheler = ["kuzey", "guney", "dogu", "bati"] as const;

// Her katta 2 sınıf seviyesi (4'er şube) + kat başına 1 özel oda = 9 nokta/kat.
const GRADES_PER_FLOOR: [number, number][] = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
];
const SECTIONS = ["A", "B", "C", "D"] as const;
const SPECIAL_ROOMS = [
  "Fen Laboratuvarı",
  "Kütüphane",
  "Bilgisayar Laboratuvarı",
  "Öğretmenler Odası",
];

function makeRooms(): Room[] {
  const rooms: Room[] = [];
  let slaveId = 1;
  let idx = 0;
  FLOORS.forEach((floor, fi) => {
    const [g1, g2] = GRADES_PER_FLOOR[fi];
    const roomNames = [
      ...SECTIONS.map((s) => `${g1}-${s} Sınıfı`),
      ...SECTIONS.map((s) => `${g2}-${s} Sınıfı`),
      SPECIAL_ROOMS[fi],
    ];
    roomNames.forEach((ad) => {
      const cephe = cepheler[idx % cepheler.length];
      const isCritical = SPECIAL_ROOMS.includes(ad);
      rooms.push({
        id: `oda-${idx + 1}`,
        floorId: floor.id,
        buildingId: BUILDING.id,
        ad,
        kat: floor.ad,
        cephe,
        sensorTipi: idx % 5 === 0 || isCritical ? "SAS-IAQ" : "SAS-TH",
        modbusSlaveId: slaveId++,
        kritikNokta: isCritical,
      });
      idx++;
    });
  });
  return rooms;
}

export const ROOMS: Room[] = makeRooms();

export const CHRONIC_ROOM_IDS = ["oda-3", "oda-14", "oda-27"];

export const THRESHOLDS: Thresholds = {
  aniDususDerece: 2.5,
  aniDususDakika: 15,
  kronikTekrarSayisi: 3,
  guvenEsigiSapma: 4,
  hedefMinSicaklik: 19,
  hedefMaxSicaklik: 23,
  setpointMaxDegisim: 1,
  setpointMinBekleme: 15,
};

export const SCHEDULE: ScheduleEntry[] = [1, 2, 3, 4, 5].map((gun) => ({
  gun,
  teneffusSaatleri: [
    { baslangic: "09:40", bitis: "09:55" },
    { baslangic: "10:35", bitis: "10:50" },
    { baslangic: "11:30", bitis: "11:45" },
    { baslangic: "12:15", bitis: "13:00" },
    { baslangic: "13:45", bitis: "14:00" },
  ],
}));

export const HOLIDAYS: HolidayEntry[] = [
  { tarih: "2025-11-24", ad: "Öğretmenler Günü (İdari Tatil)" },
  { tarih: "2026-01-01", ad: "Yılbaşı" },
  { tarih: "2026-01-19", ad: "Yarıyıl Tatili Başlangıcı" },
  { tarih: "2026-01-30", ad: "Yarıyıl Tatili Bitişi" },
];

// Deterministic pseudo-random generator so data is stable across reloads.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260914);

const MS_HOUR = 3600_000;
export const NOW = Date.now();
export const DATA_HISTORY_START = NOW - 100 * 24 * MS_HOUR; // ~100 gün geriye

function isHoliday(d: Date): boolean {
  const iso = d.toISOString().slice(0, 10);
  if (HOLIDAYS.some((h) => h.tarih === iso)) return true;
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function isBreakTime(d: Date): boolean {
  const day = d.getUTCDay();
  const entry = SCHEDULE.find((s) => s.gun === day);
  if (!entry) return false;
  const hm = d.getUTCHours() * 60 + d.getUTCMinutes();
  return entry.teneffusSaatleri.some((t) => {
    const [bh, bm] = t.baslangic.split(":").map(Number);
    const [eh, em] = t.bitis.split(":").map(Number);
    const bmin = bh * 60 + bm;
    const emin = eh * 60 + em;
    return hm >= bmin && hm <= emin;
  });
}

function outdoorTemp(ts: number): number {
  const d = new Date(ts);
  const dayOfYear = Math.floor(
    (ts - Date.UTC(d.getUTCFullYear(), 0, 0)) / (24 * MS_HOUR)
  );
  // heating season colder curve, warm in summer months
  const seasonal = 10 - 14 * Math.cos((2 * Math.PI * (dayOfYear - 30)) / 365);
  const hour = d.getUTCHours();
  const diurnal = 3 * Math.sin(((hour - 6) / 24) * 2 * Math.PI);
  return seasonal + diurnal;
}

const cepheOffset: Record<string, number> = {
  kuzey: -1.2,
  guney: 1.0,
  dogu: 0.1,
  bati: 0.3,
};

export function computeHissedilen(sicaklik: number, nem: number): number {
  // simplified heat index / wind-chill-like adjustment for indoor comfort
  if (sicaklik >= 20) {
    return sicaklik + (nem - 50) * 0.02;
  }
  return sicaklik - (60 - nem) * 0.015;
}

interface SimState {
  readings: Reading[];
  boiler: BoilerRecord[];
  alarms: AlarmRecord[];
}

function generateAll(): SimState {
  const readings: Reading[] = [];
  const boiler: BoilerRecord[] = [];
  const alarms: AlarmRecord[] = [];

  let currentSetpoint = 55;
  let lastSetpointChange = DATA_HISTORY_START;

  const roomBaseline: Record<string, number> = {};
  ROOMS.forEach((r) => {
    roomBaseline[r.id] = 21 + cepheOffset[r.cephe] + (rand() - 0.5) * 0.6;
  });

  const stepMs = MS_HOUR; // hourly resolution for history, denser for recent 48h
  for (let ts = DATA_HISTORY_START; ts <= NOW; ts += stepMs) {
    const d = new Date(ts);
    const outdoor = outdoorTemp(ts);
    const heatingActive = outdoor < 16;
    const holiday = isHoliday(d);
    const breakTime = isBreakTime(d);

    let clusterAvg: Record<string, number> = { kuzey: 0, guney: 0, dogu: 0, bati: 0 };
    let clusterCount: Record<string, number> = { kuzey: 0, guney: 0, dogu: 0, bati: 0 };

    const roomTemps: Record<string, number> = {};

    ROOMS.forEach((room) => {
      let base = roomBaseline[room.id];
      const chronic = CHRONIC_ROOM_IDS.includes(room.id);
      let target = heatingActive
        ? base + (currentSetpoint - 55) * SETPOINT_SENSITIVITY
        : base + (outdoor - 16) * 0.15;

      if (chronic && heatingActive && !holiday) {
        target -= 1.8 + rand() * 0.8; // kronik ısı kaybı
      }
      if (breakTime && !holiday) {
        target -= 0.6 + rand() * 0.4; // pencere açılması
      }

      let noise = (rand() - 0.5) * 0.4;
      let temp = target + noise;

      // occasional sudden drop event (window opened), not on chronic-flagged hours to keep separate signal
      const suddenDrop = !chronic && rand() < 0.0025 && heatingActive && !holiday;
      if (suddenDrop) {
        temp -= 3 + rand() * 2;
      }

      const humidity = 40 + rand() * 20 - (heatingActive ? 5 : 0);
      const hissedilen = computeHissedilen(temp, humidity);
      const online = rand() > 0.003;

      roomTemps[room.id] = temp;
      clusterAvg[room.cephe] += temp;
      clusterCount[room.cephe]++;

      readings.push({
        roomId: room.id,
        ts,
        sicaklik: Number(temp.toFixed(2)),
        nem: Number(humidity.toFixed(1)),
        hissedilenSicaklik: Number(hissedilen.toFixed(2)),
        havaKaliteIndeksi:
          room.sensorTipi === "SAS-IAQ"
            ? Number((60 + rand() * 30 - (breakTime ? 10 : 0)).toFixed(0))
            : undefined,
        online,
      });

      if (suddenDrop) {
        alarms.push({
          id: `alarm-${room.id}-${ts}`,
          roomId: room.id,
          ts,
          tur: "ani-dusus",
          durum: rand() > 0.5 ? "kapandi" : "acik",
          mesaj: `${room.ad}: 15 dk içinde ${(3).toFixed(1)}°C üzeri ani düşüş tespit edildi (pencere açılmış olabilir).`,
        });
      }
      if (!online) {
        alarms.push({
          id: `alarm-off-${room.id}-${ts}`,
          roomId: room.id,
          ts,
          tur: "sensor-offline",
          durum: "kapandi",
          mesaj: `${room.ad}: sensör haberleşme kaybı.`,
        });
      }
    });

    CHRONIC_ROOM_IDS.forEach((rid) => {
      if (heatingActive && !holiday && rand() < 0.02) {
        const room = ROOMS.find((r) => r.id === rid)!;
        alarms.push({
          id: `alarm-chronic-${rid}-${ts}`,
          roomId: rid,
          ts,
          tur: "kronik-sorun",
          durum: "acik",
          mesaj: `${room.ad}: tekrarlayan ısı kaybı paterni tespit edildi (kronik sorun adayı).`,
        });
      }
    });

    // kümeleme kararı: cephe bazlı medyan sapması
    let quorumOk = true;
    for (const c of cepheler) {
      if (clusterCount[c] === 0) continue;
      const avg = clusterAvg[c] / clusterCount[c];
      const roomsInCluster = ROOMS.filter((r) => r.cephe === c);
      const maxDev = Math.max(
        ...roomsInCluster.map((r) => Math.abs(roomTemps[r.id] - avg))
      );
      if (maxDev > THRESHOLDS.guvenEsigiSapma) quorumOk = false;
    }

    let sebep: BoilerRecord["sebep"] = "otomatik";
    if (
      heatingActive &&
      quorumOk &&
      ts - lastSetpointChange >= THRESHOLDS.setpointMinBekleme * 60_000 * 4
    ) {
      const overallAvgFelt =
        Object.values(clusterAvg).reduce((a, b) => a + b, 0) /
        Object.values(clusterCount).reduce((a, b) => a + b, 0);
      const mid =
        (THRESHOLDS.hedefMinSicaklik + THRESHOLDS.hedefMaxSicaklik) / 2;
      const diff = mid - overallAvgFelt;
      if (Math.abs(diff) > 0.3) {
        const delta = Math.sign(diff) * THRESHOLDS.setpointMaxDegisim;
        currentSetpoint = Math.min(70, Math.max(35, currentSetpoint + delta));
        lastSetpointChange = ts;
      }
    } else if (!quorumOk) {
      sebep = "otomatik";
    }

    if (
      boiler.length === 0 ||
      boiler[boiler.length - 1].setpoint !== currentSetpoint ||
      boiler[boiler.length - 1].acikMi !== heatingActive ||
      ts - boiler[boiler.length - 1].ts > 6 * MS_HOUR
    ) {
      boiler.push({
        ts,
        setpoint: Number(currentSetpoint.toFixed(1)),
        acikMi: heatingActive,
        sebep,
      });
    }

    if (!quorumOk && rand() < 0.05) {
      alarms.push({
        id: `alarm-guven-${ts}`,
        roomId: ROOMS[Math.floor(rand() * ROOMS.length)].id,
        ts,
        tur: "guven-esigi",
        durum: "acik",
        mesaj:
          "Cephe kümesi içinde tutarsız veri tespit edildi, sistem pasif/güvenli moda geçti.",
      });
    }
  }

  applyLiveShowcase(readings, alarms);

  return { readings, boiler, alarms };
}

// Dashboard'un boş/tamamen yeşil açılmaması için, gerçek takvim mevsimi ne
// olursa olsun (örn. yaz ayında ısıtma sezonu dışı kalınsa bile) en güncel
// anda sınıfların büyükçe bir kısmında örnek uyarı/alarm durumu görülmesini
// garanti eder. Oranlar toplam nokta sayısına göre otantik biçimde ölçeklenir.
function applyLiveShowcase(readings: Reading[], alarms: AlarmRecord[]) {
  const lastTs = Math.max(...readings.map((r) => r.ts));
  const findLast = (roomId: string) =>
    readings.find((r) => r.roomId === roomId && r.ts === lastTs);
  const HOUR = 3_600_000;

  const total = ROOMS.length;
  function pickEvery(start: number, step: number, count: number): string[] {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(ROOMS[(start + i * step) % total].id);
    }
    return ids;
  }

  const aniDususRooms = pickEvery(0, 5, Math.max(2, Math.round(total * 0.11)));
  const kronikRooms = pickEvery(1, 5, Math.max(2, Math.round(total * 0.11)));
  const guvenEsigiRooms = pickEvery(2, 7, Math.max(1, Math.round(total * 0.06)));
  const offlineAlarmRooms = pickEvery(3, 6, Math.max(2, Math.round(total * 0.08)));
  const warmWarningRooms = pickEvery(4, 6, Math.max(2, Math.round(total * 0.08)));
  const coldWarningRooms = pickEvery(5, 6, Math.max(2, Math.round(total * 0.08)));

  aniDususRooms.forEach((roomId, i) => {
    const room = ROOMS.find((r) => r.id === roomId);
    const reading = findLast(roomId);
    if (!room) return;
    const derece = 2.8 + (i % 4) * 0.5;
    if (reading) {
      reading.sicaklik -= derece;
      reading.hissedilenSicaklik -= derece;
    }
    alarms.push({
      id: `alarm-demo-drop-${roomId}`,
      roomId,
      ts: lastTs - i * HOUR,
      tur: "ani-dusus",
      durum: "acik",
      mesaj: `${room.ad}: 15 dk içinde ${derece.toFixed(1)}°C üzeri ani düşüş tespit edildi (pencere açılmış olabilir).`,
    });
  });

  kronikRooms.forEach((roomId, i) => {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    alarms.push({
      id: `alarm-demo-chronic-${roomId}`,
      roomId,
      ts: lastTs - i * HOUR,
      tur: "kronik-sorun",
      durum: "acik",
      mesaj: `${room.ad}: tekrarlayan ısı kaybı paterni tespit edildi (kronik sorun adayı).`,
    });
  });

  guvenEsigiRooms.forEach((roomId, i) => {
    const room = ROOMS.find((r) => r.id === roomId);
    if (!room) return;
    alarms.push({
      id: `alarm-demo-guven-${roomId}`,
      roomId,
      ts: lastTs - i * HOUR,
      tur: "guven-esigi",
      durum: "acik",
      mesaj: `${room.ad}: cephe kümesi içinde tutarsız veri tespit edildi, ilgili nokta güven eşiği dışında kaldı.`,
    });
  });

  offlineAlarmRooms.forEach((roomId, i) => {
    const room = ROOMS.find((r) => r.id === roomId);
    const reading = findLast(roomId);
    if (!room) return;
    if (reading) reading.online = false;
    alarms.push({
      id: `alarm-demo-offline-${roomId}`,
      roomId,
      ts: lastTs - i * HOUR,
      tur: "sensor-offline",
      durum: "acik",
      mesaj: `${room.ad}: sensör haberleşme kaybı.`,
    });
  });

  warmWarningRooms.forEach((roomId, i) => {
    const reading = findLast(roomId);
    if (!reading) return;
    reading.sicaklik = 24.6 + (i % 3) * 0.6;
    reading.hissedilenSicaklik = 24.9 + (i % 3) * 0.6;
  });

  coldWarningRooms.forEach((roomId, i) => {
    const reading = findLast(roomId);
    if (!reading) return;
    reading.sicaklik = 17.6 - (i % 3) * 0.6;
    reading.hissedilenSicaklik = 17.0 - (i % 3) * 0.6;
  });
}

const generated = generateAll();
export const READINGS: Reading[] = generated.readings;
export const BOILER_HISTORY: BoilerRecord[] = generated.boiler;
export const ALARMS: AlarmRecord[] = generated.alarms;

export const M3_BIRIM_FIYAT = GUNCEL_M3_FIYAT_VARSAYIM_TL;

export function generateEnergyRecords(): EnergyRecord[] {
  const records: EnergyRecord[] = [];
  const dayMs = 24 * MS_HOUR;
  for (let ts = DATA_HISTORY_START; ts <= NOW; ts += dayMs) {
    const d = new Date(ts);
    const iso = d.toISOString().slice(0, 10);
    const outdoor = outdoorTemp(ts);
    const heating = outdoor < 16;
    const referans = heating ? 38 + Math.max(0, 14 - outdoor) * 2.1 : 4;
    const savingsRatio = 0.11 + rand() * 0.08; // %11-19 arası tasarruf
    const tahmini = heating ? referans * (1 - savingsRatio) : referans * 0.97;
    const tasarrufM3 = referans - tahmini;
    records.push({
      tarih: iso,
      tahminiTuketimM3: Number(tahmini.toFixed(1)),
      referansTuketimM3: Number(referans.toFixed(1)),
      tasarrufM3: Number(tasarrufM3.toFixed(1)),
      tasarrufTL: Number((tasarrufM3 * M3_BIRIM_FIYAT).toFixed(0)),
      m3BirimFiyat: M3_BIRIM_FIYAT,
    });
  }
  return records;
}

export const ENERGY_RECORDS: EnergyRecord[] = generateEnergyRecords();
