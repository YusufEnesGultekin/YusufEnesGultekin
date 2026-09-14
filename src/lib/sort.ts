import type { Reading, Room } from "./types";
import { getLastReading } from "./roomStatus";

export function turkishCompare(a: string, b: string): number {
  return a.localeCompare(b, "tr");
}

export type RoomSortKey = "ad" | "kat" | "cephe" | "sicaklik" | "hissedilen" | "nem";

export function sortRooms(
  rooms: Room[],
  key: RoomSortKey,
  direction: "asc" | "desc" = "asc",
  readings: Reading[] = []
): Room[] {
  const sorted = [...rooms].sort((a, b) => {
    switch (key) {
      case "ad":
        return turkishCompare(a.ad, b.ad);
      case "kat":
        return turkishCompare(a.kat, b.kat) || turkishCompare(a.ad, b.ad);
      case "cephe":
        return turkishCompare(a.cephe, b.cephe) || turkishCompare(a.ad, b.ad);
      case "sicaklik": {
        const va = getLastReading(readings, a.id)?.sicaklik ?? -999;
        const vb = getLastReading(readings, b.id)?.sicaklik ?? -999;
        return va - vb;
      }
      case "hissedilen": {
        const va = getLastReading(readings, a.id)?.hissedilenSicaklik ?? -999;
        const vb = getLastReading(readings, b.id)?.hissedilenSicaklik ?? -999;
        return va - vb;
      }
      case "nem": {
        const va = getLastReading(readings, a.id)?.nem ?? -999;
        const vb = getLastReading(readings, b.id)?.nem ?? -999;
        return va - vb;
      }
      default:
        return 0;
    }
  });
  return direction === "desc" ? sorted.reverse() : sorted;
}
