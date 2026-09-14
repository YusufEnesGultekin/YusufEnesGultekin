// EtHub / İzleme Sistemi projesinin dayanak raporundaki (16 derslik + 9 etkinlik
// salonu, 3382 m², 4 katlı örnek okul) yöntem ve sabitlere dayanan ölçeklenebilir
// tasarruf simülasyonu. Kaynak: proje raporu "Bulgular" bölümü — Tablo 1/Tablo 2
// deneysel ölçümü ve "Fazla Harcama = Harcanan Sabiti × Alan × Derece" formülü.

export type SimulationScale = "okul" | "ilce" | "il" | "bolge" | "turkiye";

export interface SimulationInputs {
  binaAlaniM2: number;
  fazlaIsitmaDerece: number;
  kisSezonuGun: number;
  harcananSabiti: number; // m³ doğalgaz / m² / °C (günlük)
  m3BirimFiyatTL: number;
  sistemBirimMaliyetiTL: number;
  seriUretimIndirimi: boolean; // true ise birim maliyet yarıya iner (rapor önerisi)
  olcek: SimulationScale;
  binaSayilari: Record<SimulationScale, number>;
}

export interface SimulationResult {
  gunlukFazlaGazM3: number;
  sezonlukFazlaGazM3: number;
  sezonlukTasarrufTL: number;
  binaSayisi: number;
  toplamSezonlukGazM3: number;
  toplamSezonlukTasarrufTL: number;
  toplamSistemMaliyetiTL: number;
  amortismanAy: number | null;
}

// Rapordaki referans örnek okul (deneysel ölçümün yapıldığı bina).
export const REFERENCE_SCHOOL = {
  binaAlaniM2: 3382,
  fazlaIsitmaDerece: 6,
  kisSezonuGun: 125,
  harcananSabiti: 0.00095,
  egitimOrtamiSayisi: 25, // 16 derslik + 9 etkinlik salonu
  ogrenciSayisi: 400,
  personelSayisi: 30,
  katSayisi: 4,
  sistemBirimMaliyetiTL: 11_875,
};

// 2026 BOTAŞ toptan sanayi/ticarethane referans fiyatına (~15 TL/Sm³, KDV-ÖTV
// hariç) dağıtım bedeli ve vergiler eklenerek türetilmiş güncellenebilir bir
// perakende varsayımdır — kesin değer için bölgenizin dağıtım şirketi
// tarifesine bakınız.
export const GUNCEL_M3_FIYAT_VARSAYIM_TL = 18.5;

// Milli Eğitim Bakanlığı'na bağlı okul sayısı (2023-2024 istatistikleri, proje
// raporunda da referans alınmıştır). Türkiye idari birim sayıları yaklaşıktır.
export const DEFAULT_BINA_SAYILARI: Record<SimulationScale, number> = {
  okul: 1,
  ilce: 66, // 61.011 / 922 ilçe ortalaması
  il: 753, // 61.011 / 81 il ortalaması
  bolge: 8716, // 61.011 / 7 coğrafi bölge ortalaması
  turkiye: 61_011,
};

export const SCALE_LABELS: Record<SimulationScale, string> = {
  okul: "1 Okul",
  ilce: "İlçe Geneli",
  il: "İl Geneli",
  bolge: "Bölge Geneli (7 Coğrafi Bölge)",
  turkiye: "Türkiye Geneli (MEB - 61.011 Okul)",
};

export function runSimulation(inputs: SimulationInputs): SimulationResult {
  const gunlukFazlaGazM3 =
    inputs.harcananSabiti * inputs.binaAlaniM2 * inputs.fazlaIsitmaDerece;
  const sezonlukFazlaGazM3 = gunlukFazlaGazM3 * inputs.kisSezonuGun;
  const sezonlukTasarrufTL = sezonlukFazlaGazM3 * inputs.m3BirimFiyatTL;

  const binaSayisi = inputs.binaSayilari[inputs.olcek];
  const toplamSezonlukGazM3 = sezonlukFazlaGazM3 * binaSayisi;
  const toplamSezonlukTasarrufTL = sezonlukTasarrufTL * binaSayisi;

  const birimMaliyet = inputs.seriUretimIndirimi
    ? inputs.sistemBirimMaliyetiTL / 2
    : inputs.sistemBirimMaliyetiTL;
  const toplamSistemMaliyetiTL = birimMaliyet * binaSayisi;

  // Amortisman: sistem maliyeti / (tasarruf TL / sezon günü) = geri ödeme günü,
  // ay cinsine çevrilir.
  const amortismanGun =
    toplamSezonlukTasarrufTL > 0
      ? toplamSistemMaliyetiTL / (toplamSezonlukTasarrufTL / inputs.kisSezonuGun)
      : null;

  return {
    gunlukFazlaGazM3: round(gunlukFazlaGazM3, 4),
    sezonlukFazlaGazM3: round(sezonlukFazlaGazM3, 1),
    sezonlukTasarrufTL: round(sezonlukTasarrufTL, 0),
    binaSayisi,
    toplamSezonlukGazM3: round(toplamSezonlukGazM3, 0),
    toplamSezonlukTasarrufTL: round(toplamSezonlukTasarrufTL, 0),
    toplamSistemMaliyetiTL: round(toplamSistemMaliyetiTL, 0),
    amortismanAy: amortismanGun !== null ? round(amortismanGun / 30, 2) : null,
  };
}

function round(value: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

// Büyük ölçek sonuçlarını (ör. Türkiye geneli milyarlarca TL) okunabilir
// tutmak için kısaltılmış gösterim: "21,2 Milyar", "942,9 Milyon" vb.
export function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Milyar`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} Milyon`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} Bin`;
  }
  return value.toLocaleString("tr-TR");
}
