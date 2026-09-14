import type { AlarmRecord, Reading, Room, Thresholds } from "./types";

export type RoomStatus = "normal" | "uyari" | "alarm";

export function getRoomStatus(
  room: Room,
  readings: Reading[],
  alarms: AlarmRecord[],
  thresholds: Thresholds
): RoomStatus {
  const openAlarm = alarms.find((a) => a.roomId === room.id && a.durum === "acik");
  if (openAlarm) return "alarm";

  const roomReadings = readings.filter((r) => r.roomId === room.id);
  const last = [...roomReadings].sort((a, b) => b.ts - a.ts)[0];
  if (!last || !last.online) return "uyari";
  if (
    last.hissedilenSicaklik < thresholds.hedefMinSicaklik - 1 ||
    last.hissedilenSicaklik > thresholds.hedefMaxSicaklik + 1
  ) {
    return "uyari";
  }
  return "normal";
}

export function getLastReading(readings: Reading[], roomId: string): Reading | null {
  const roomReadings = readings.filter((r) => r.roomId === roomId);
  const sorted = [...roomReadings].sort((a, b) => b.ts - a.ts);
  return sorted[0] ?? null;
}
