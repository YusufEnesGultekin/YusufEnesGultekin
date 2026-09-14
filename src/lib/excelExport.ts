import * as XLSX from "xlsx";
import type { ReportData } from "./reportEngine";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("tr-TR");
}

function headerRows(report: ReportData, baslik: string): (string | number)[][] {
  return [
    [baslik],
    [
      `Tarih Aralığı: ${report.range.label} (${fmtDate(report.range.start)} - ${fmtDate(
        report.range.end
      )})`,
    ],
    [`Oluşturulma Zamanı: ${fmtDate(report.generatedAt)}`],
    [],
  ];
}

function sheetFromAOA(rows: (string | number | undefined)[][]) {
  return XLSX.utils.aoa_to_sheet(rows);
}

export function exportReportToExcel(report: ReportData, dosyaAdi = "genel-rapor.xlsx") {
  const wb = XLSX.utils.book_new();

  const ozetRows = [
    ...headerRows(report, "Özet KPI Raporu"),
    ["Ortalama Hissedilen Sıcaklık (°C)", report.kpi.ortHissedilen],
    ["Aktif Alarm Sayısı", report.kpi.aktifAlarmSayisi],
    ["Toplam Tasarruf (m³)", report.kpi.toplamTasarrufM3],
    ["Toplam Tasarruf (TL)", report.kpi.toplamTasarrufTL],
    ["Tasarruf Yüzdesi (%)", report.kpi.tasarrufYuzdesi],
    ["Ortalama Sensör Online Oranı (%)", report.kpi.onlineOraniOrtalama],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(ozetRows), "Özet");

  const sicaklikRows: (string | number)[][] = [
    ...headerRows(report, "Sıcaklık / Nem / Hissedilen Sıcaklık Raporu"),
    ["Sınıf", "Kat", "Cephe", "Ort. Sıcaklık (°C)", "Ort. Nem (%)", "Ort. Hissedilen (°C)", "Okuma Sayısı"],
    ...report.sicaklikNem.map((x) => [
      x.room.ad,
      x.room.kat,
      x.room.cephe,
      x.kpi.ortSicaklik,
      x.kpi.ortNem,
      x.kpi.ortHissedilen,
      x.kpi.okumaSayisi,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(sicaklikRows), "Sicaklik-Nem");

  const cepheRows: (string | number)[][] = [
    ...headerRows(report, "Cephe Bazlı Karşılaştırma"),
    ["Cephe", "Ort. Sıcaklık (°C)", "Ort. Hissedilen (°C)"],
    ...report.cepheKarsilastirma.map((c) => [c.cephe, c.ortSicaklik, c.ortHissedilen]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(cepheRows), "Cephe Karsilastirma");

  const enerjiRows: (string | number)[][] = [
    ...headerRows(report, "Enerji Tüketim / Tasarruf Raporu"),
    [
      "Tarih",
      "Tahmini Tüketim (m³)",
      "Referans Tüketim (m³)",
      "Tasarruf (m³)",
      "Tasarruf (TL)",
      "m³ Birim Fiyat (TL)",
    ],
    ...report.enerji.map((e) => [
      e.tarih,
      e.tahminiTuketimM3,
      e.referansTuketimM3,
      e.tasarrufM3,
      e.tasarrufTL,
      e.m3BirimFiyat,
    ]),
    [],
    ["TOPLAM", report.enerjiKpi.toplamTuketimM3, report.enerjiKpi.toplamReferansM3, report.enerjiKpi.toplamTasarrufM3, report.enerjiKpi.toplamTasarrufTL],
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(enerjiRows), "Enerji");

  const alarmRows: (string | number)[][] = [
    ...headerRows(report, "Alarm / Anomali Raporu"),
    ["Zaman", "Sınıf ID", "Tür", "Durum", "Mesaj", "Onaylayan"],
    ...report.alarmlar.map((a) => [
      fmtDate(a.ts),
      a.roomId,
      a.tur,
      a.durum,
      a.mesaj,
      a.onaylayan ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(alarmRows), "Alarmlar");

  const kombiRows: (string | number)[][] = [
    ...headerRows(report, "Kombi Setpoint Geçmişi"),
    ["Zaman", "Setpoint (°C)", "Açık mı", "Sebep", "Kullanıcı"],
    ...report.kombiGecmisi.map((b) => [
      fmtDate(b.ts),
      b.setpoint,
      b.acikMi ? "Açık" : "Kapalı",
      b.sebep,
      b.kullanici ?? "",
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(kombiRows), "Kombi Gecmisi");

  const sensorRows: (string | number)[][] = [
    ...headerRows(report, "Sensör Sağlık / Bağlantı Raporu"),
    ["Sınıf", "Son Haberleşme", "Online Oranı (%)"],
    ...report.sensorSagligi.map((s) => [
      s.ad,
      s.sonHaberlesme ? fmtDate(s.sonHaberlesme) : "-",
      s.onlineOrani,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(sensorRows), "Sensor Sagligi");

  XLSX.writeFile(wb, dosyaAdi);
}

export function exportSingleSheet(
  rows: (string | number | undefined)[][],
  sheetName: string,
  dosyaAdi: string
) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheetFromAOA(rows), sheetName);
  XLSX.writeFile(wb, dosyaAdi);
}
