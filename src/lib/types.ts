export type Cephe = "kuzey" | "guney" | "dogu" | "bati";
export type SensorType = "SAS-TH" | "SAS-IAQ";
export type UserRole = "yonetici" | "bakim" | "salt-okuyucu";
export type SistemModu = "otomatik" | "pasif-guvenli" | "manuel";
export type AlarmTuru =
  | "ani-dusus"
  | "kronik-sorun"
  | "guven-esigi"
  | "sensor-offline";
export type AlarmDurum = "acik" | "kapandi" | "onaylandi";

export interface Building {
  id: string;
  ad: string;
  adres: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  ad: string;
  siraNo: number;
}

export interface Room {
  id: string;
  floorId: string;
  buildingId: string;
  ad: string;
  kat: string;
  cephe: Cephe;
  sensorTipi: SensorType;
  modbusSlaveId: number;
  kritikNokta: boolean;
}

export interface Reading {
  roomId: string;
  ts: number;
  sicaklik: number;
  nem: number;
  hissedilenSicaklik: number;
  havaKaliteIndeksi?: number;
  online: boolean;
}

export interface BoilerRecord {
  ts: number;
  setpoint: number;
  acikMi: boolean;
  sebep: "otomatik" | "manuel-override";
  kullanici?: string;
}

export interface AlarmRecord {
  id: string;
  roomId: string;
  ts: number;
  tur: AlarmTuru;
  durum: AlarmDurum;
  mesaj: string;
  onaylayan?: string;
  onayZamani?: number;
}

export interface EnergyRecord {
  tarih: string; // yyyy-MM-dd
  tahminiTuketimM3: number;
  referansTuketimM3: number;
  tasarrufM3: number;
  tasarrufTL: number;
  m3BirimFiyat: number;
}

export interface OverrideRecord {
  id: string;
  ts: number;
  kullanici: string;
  setpoint: number;
  not?: string;
}

export interface ScheduleEntry {
  gun: number; // 0-6
  teneffusSaatleri: { baslangic: string; bitis: string }[];
}

export interface HolidayEntry {
  tarih: string;
  ad: string;
}

export interface Thresholds {
  aniDususDerece: number;
  aniDususDakika: number;
  kronikTekrarSayisi: number;
  guvenEsigiSapma: number;
  hedefMinSicaklik: number;
  hedefMaxSicaklik: number;
  setpointMaxDegisim: number;
  setpointMinBekleme: number;
}

export type DateRangePreset =
  | "bugun"
  | "son7gun"
  | "son30gun"
  | "buay"
  | "gecenay"
  | "busezon"
  | "buyil"
  | "tumzamanlar"
  | "ozel";

export interface DateRange {
  start: number;
  end: number;
  label: string;
}
