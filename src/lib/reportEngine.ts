import type {
  AlarmRecord,
  BoilerRecord,
  DateRange,
  EnergyRecord,
  Reading,
  Room,
} from "./types";
import {
  computeAlarmKpi,
  computeCepheOrtalamalari,
  computeChronicRooms,
  computeEnergyKpi,
  computeRoomKpi,
  computeSensorHealth,
  filterAlarms,
  filterBoiler,
  filterEnergy,
  filterReadings,
} from "./calculations";

export interface ReportData {
  range: DateRange;
  generatedAt: number;
  kpi: {
    ortHissedilen: number;
    aktifAlarmSayisi: number;
    toplamTasarrufTL: number;
    toplamTasarrufM3: number;
    tasarrufYuzdesi: number;
    onlineOraniOrtalama: number;
  };
  sicaklikNem: { room: Room; kpi: ReturnType<typeof computeRoomKpi> }[];
  cepheKarsilastirma: ReturnType<typeof computeCepheOrtalamalari>;
  enerji: EnergyRecord[];
  enerjiKpi: ReturnType<typeof computeEnergyKpi>;
  alarmlar: AlarmRecord[];
  alarmKpi: ReturnType<typeof computeAlarmKpi>;
  kronikOdalar: ReturnType<typeof computeChronicRooms>;
  kombiGecmisi: BoilerRecord[];
  sensorSagligi: ReturnType<typeof computeSensorHealth>;
}

export function buildReport(
  range: DateRange,
  rooms: Room[],
  readings: Reading[],
  boiler: BoilerRecord[],
  alarms: AlarmRecord[],
  energy: EnergyRecord[],
  kronikMinTekrar: number
): ReportData {
  const r = filterReadings(readings, range);
  const a = filterAlarms(alarms, range);
  const b = filterBoiler(boiler, range);
  const e = filterEnergy(energy, range);

  const sicaklikNem = rooms.map((room) => ({ room, kpi: computeRoomKpi(r, room.id) }));
  const enerjiKpi = computeEnergyKpi(e);
  const alarmKpi = computeAlarmKpi(a);
  const sensorSagligi = computeSensorHealth(r, rooms);
  const onlineOraniOrtalama =
    sensorSagligi.length > 0
      ? Math.round(
          (sensorSagligi.reduce((sum, x) => sum + x.onlineOrani, 0) /
            sensorSagligi.length) *
            10
        ) / 10
      : 0;

  const allHissedilen = sicaklikNem
    .map((x) => x.kpi.ortHissedilen)
    .filter((v) => !Number.isNaN(v) && v !== 0);
  const ortHissedilen =
    allHissedilen.length > 0
      ? Math.round(
          (allHissedilen.reduce((s, v) => s + v, 0) / allHissedilen.length) * 100
        ) / 100
      : 0;

  return {
    range,
    generatedAt: Date.now(),
    kpi: {
      ortHissedilen,
      aktifAlarmSayisi: alarmKpi.acik,
      toplamTasarrufTL: enerjiKpi.toplamTasarrufTL,
      toplamTasarrufM3: enerjiKpi.toplamTasarrufM3,
      tasarrufYuzdesi: enerjiKpi.tasarrufYuzdesi,
      onlineOraniOrtalama,
    },
    sicaklikNem,
    cepheKarsilastirma: computeCepheOrtalamalari(r, rooms),
    enerji: e,
    enerjiKpi,
    alarmlar: a,
    alarmKpi,
    kronikOdalar: computeChronicRooms(a, rooms, kronikMinTekrar),
    kombiGecmisi: b,
    sensorSagligi,
  };
}
