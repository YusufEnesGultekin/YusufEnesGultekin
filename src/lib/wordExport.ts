import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ReportData } from "./reportEngine";

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleString("tr-TR");
}

function cell(text: string, opts: { header?: boolean } = {}): TableCell {
  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: !!opts.header })],
      }),
    ],
  });
}

function dataTable(headers: string[], rows: (string | number)[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, { header: true })) }),
      ...rows.map((r) => new TableRow({ children: r.map((v) => cell(String(v))) })),
    ],
  });
}

function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}

export async function exportReportToWord(report: ReportData, dosyaAdi = "genel-rapor.docx") {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi",
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: "Genel Rapor", bold: true, size: 24 })],
            spacing: { before: 100, after: 200 },
          }),
          new Paragraph({
            text: `Tarih Aralığı: ${report.range.label} (${fmtDate(report.range.start)} - ${fmtDate(report.range.end)})`,
          }),
          new Paragraph({ text: `Oluşturulma Zamanı: ${fmtDate(report.generatedAt)}` }),

          heading("Özet KPI"),
          dataTable(
            ["KPI", "Değer"],
            [
              ["Ortalama Hissedilen Sıcaklık", `${report.kpi.ortHissedilen} °C`],
              ["Aktif Alarm Sayısı", report.kpi.aktifAlarmSayisi],
              ["Toplam Tasarruf", `${report.kpi.toplamTasarrufM3} m³ / ${report.kpi.toplamTasarrufTL} TL`],
              ["Tasarruf Yüzdesi", `%${report.kpi.tasarrufYuzdesi}`],
              ["Ortalama Sensör Online Oranı", `%${report.kpi.onlineOraniOrtalama}`],
            ]
          ),

          heading("Sınıf Bazlı Sıcaklık / Nem / Hissedilen Sıcaklık Özeti"),
          dataTable(
            ["Sınıf", "Kat", "Cephe", "Ort. Sıcaklık", "Ort. Nem", "Ort. Hissedilen", "Okuma Sayısı"],
            report.sicaklikNem.map((x) => [
              x.room.ad,
              x.room.kat,
              x.room.cephe,
              `${x.kpi.ortSicaklik}°C`,
              `%${x.kpi.ortNem}`,
              `${x.kpi.ortHissedilen}°C`,
              x.kpi.okumaSayisi,
            ])
          ),

          heading("Cephe Bazlı Karşılaştırma"),
          dataTable(
            ["Cephe", "Ort. Sıcaklık", "Ort. Hissedilen"],
            report.cepheKarsilastirma.map((c) => [c.cephe, `${c.ortSicaklik}°C`, `${c.ortHissedilen}°C`])
          ),

          heading("Enerji Tüketim / Tasarruf"),
          dataTable(
            ["Tarih", "Tahmini Tüketim (m³)", "Referans (m³)", "Tasarruf (m³)", "Tasarruf (TL)"],
            [
              ...report.enerji
                .slice(-60)
                .map((e) => [e.tarih, e.tahminiTuketimM3, e.referansTuketimM3, e.tasarrufM3, e.tasarrufTL]),
              [
                "TOPLAM",
                report.enerjiKpi.toplamTuketimM3,
                report.enerjiKpi.toplamReferansM3,
                report.enerjiKpi.toplamTasarrufM3,
                report.enerjiKpi.toplamTasarrufTL,
              ],
            ]
          ),

          heading("Alarm / Anomali Özeti"),
          dataTable(
            ["Zaman", "Sınıf", "Tür", "Durum"],
            report.alarmlar.slice(0, 100).map((a) => [fmtDate(a.ts), a.roomId, a.tur, a.durum])
          ),

          heading("Kronik Sorunlu Sınıflar"),
          dataTable(
            ["Sınıf", "Tekrar Sayısı"],
            report.kronikOdalar.map((k) => [k.ad, k.tekrarSayisi])
          ),

          heading("Sensör Sağlık / Bağlantı"),
          dataTable(
            ["Sınıf", "Son Haberleşme", "Online Oranı"],
            report.sensorSagligi.map((s) => [
              s.ad,
              s.sonHaberlesme ? fmtDate(s.sonHaberlesme) : "-",
              `%${s.onlineOrani}`,
            ])
          ),

          new Paragraph({
            spacing: { before: 400 },
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi", italics: true, size: 16 })],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
