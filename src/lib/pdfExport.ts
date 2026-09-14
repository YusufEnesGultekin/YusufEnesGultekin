import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportData } from "./reportEngine";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("tr-TR");
}

export function exportReportToPdf(report: ReportData, dosyaAdi = "genel-rapor.pdf") {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi", 14, 15);
  doc.setFontSize(11);
  doc.text("Genel Rapor", 14, 22);
  doc.setFontSize(9);
  doc.text(
    `Tarih Aralığı: ${report.range.label} (${fmtDate(report.range.start)} - ${fmtDate(report.range.end)})`,
    14,
    28
  );
  doc.text(`Oluşturulma Zamanı: ${fmtDate(report.generatedAt)}`, 14, 33);

  autoTable(doc, {
    startY: 38,
    head: [["KPI", "Değer"]],
    body: [
      ["Ortalama Hissedilen Sıcaklık", `${report.kpi.ortHissedilen} °C`],
      ["Aktif Alarm Sayısı", `${report.kpi.aktifAlarmSayisi}`],
      ["Toplam Tasarruf", `${report.kpi.toplamTasarrufM3} m³ / ${report.kpi.toplamTasarrufTL} TL`],
      ["Tasarruf Yüzdesi", `%${report.kpi.tasarrufYuzdesi}`],
      ["Ortalama Sensör Online Oranı", `%${report.kpi.onlineOraniOrtalama}`],
    ],
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text("Sınıf Bazlı Sıcaklık/Nem Özeti", 14, y);
  autoTable(doc, {
    startY: y + 3,
    head: [["Sınıf", "Kat", "Cephe", "Ort. Sıcaklık", "Ort. Nem", "Ort. Hissedilen"]],
    body: report.sicaklikNem.map((x) => [
      x.room.ad,
      x.room.kat,
      x.room.cephe,
      `${x.kpi.ortSicaklik}°C`,
      `%${x.kpi.ortNem}`,
      `${x.kpi.ortHissedilen}°C`,
    ]),
    styles: { fontSize: 8 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > 250) {
    doc.addPage();
    y = 15;
  }
  doc.setFontSize(11);
  doc.text("Cephe Bazlı Karşılaştırma", 14, y);
  autoTable(doc, {
    startY: y + 3,
    head: [["Cephe", "Ort. Sıcaklık", "Ort. Hissedilen"]],
    body: report.cepheKarsilastirma.map((c) => [c.cephe, `${c.ortSicaklik}°C`, `${c.ortHissedilen}°C`]),
    styles: { fontSize: 8 },
  });

  doc.addPage();
  doc.setFontSize(11);
  doc.text("Alarm / Anomali Özeti", 14, 15);
  autoTable(doc, {
    startY: 20,
    head: [["Zaman", "Sınıf", "Tür", "Durum"]],
    body: report.alarmlar
      .slice(0, 60)
      .map((a) => [fmtDate(a.ts), a.roomId, a.tur, a.durum]),
    styles: { fontSize: 7 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > 250) {
    doc.addPage();
    y = 15;
  }
  doc.setFontSize(11);
  doc.text("Kronik Sorunlu Sınıflar", 14, y);
  autoTable(doc, {
    startY: y + 3,
    head: [["Sınıf", "Tekrar Sayısı"]],
    body: report.kronikOdalar.map((k) => [k.ad, k.tekrarSayisi]),
    styles: { fontSize: 8 },
  });

  doc.save(dosyaAdi);
}
