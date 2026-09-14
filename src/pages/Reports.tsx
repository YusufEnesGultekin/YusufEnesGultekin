import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDataStore } from "../store/dataStore";
import DateRangePicker from "../components/DateRangePicker";
import KpiCard from "../components/KpiCard";
import { buildReport } from "../lib/reportEngine";
import { exportReportToExcel } from "../lib/excelExport";
import { exportReportToPdf } from "../lib/pdfExport";

const TABS = [
  { key: "genel", label: "Genel Rapor" },
  { key: "sicaklik", label: "Sıcaklık/Nem/Hissedilen" },
  { key: "enerji", label: "Enerji Tüketim/Tasarruf" },
  { key: "alarm", label: "Alarm/Anomali" },
  { key: "kombi", label: "Kombi Setpoint Geçmişi" },
  { key: "sensor", label: "Sensör Sağlığı" },
] as const;

const PIE_COLORS = ["#3b82f6", "#2dd4bf", "#eab308", "#ef4444", "#a78bfa", "#f97316"];

export default function Reports() {
  const { rooms, readings, boilerHistory, alarms, energyRecords, thresholds, getDateRange, role } =
    useDataStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("genel");
  const range = getDateRange();

  const report = useMemo(
    () =>
      buildReport(
        range,
        rooms,
        readings,
        boilerHistory,
        alarms,
        energyRecords,
        thresholds.kronikTekrarSayisi
      ),
    [range, rooms, readings, boilerHistory, alarms, energyRecords, thresholds]
  );

  const heatmapData = useMemo(() => {
    // gün x sınıf yoğunluk özeti (ortalama sıcaklık)
    const byDayRoom: Record<string, Record<string, number[]>> = {};
    report.sicaklikNem.forEach(({ room }) => {
      readings
        .filter((r) => r.roomId === room.id && r.ts >= range.start && r.ts <= range.end)
        .forEach((r) => {
          const day = new Date(r.ts).toISOString().slice(0, 10);
          byDayRoom[day] = byDayRoom[day] ?? {};
          byDayRoom[day][room.id] = byDayRoom[day][room.id] ?? [];
          byDayRoom[day][room.id].push(r.sicaklik);
        });
    });
    const days = Object.keys(byDayRoom).sort().slice(-14);
    return { days, byDayRoom };
  }, [readings, range, report.sicaklikNem]);

  function heatColor(v: number) {
    // 15 -> mavi, 25 -> kırmızı
    const t = Math.min(1, Math.max(0, (v - 15) / 10));
    const r = Math.round(59 + t * (239 - 59));
    const g = Math.round(130 + t * (68 - 130));
    const b = Math.round(246 + t * (68 - 246));
    return `rgb(${r},${g},${b})`;
  }

  return (
    <div>
      <DateRangePicker />

      <div className="toolbar">
        {TABS.map((t) => (
          <button key={t.key} className={`chip ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <button className="btn" onClick={() => exportReportToExcel(report, `genel-rapor-${range.label}.xlsx`)}>
          Excel Olarak İndir (Tüm Sekmeler)
        </button>
        <button className="btn secondary" onClick={() => exportReportToPdf(report, `genel-rapor-${range.label}.pdf`)}>
          PDF Olarak İndir
        </button>
        {role === "salt-okuyucu" && (
          <span style={{ fontSize: 12, color: "var(--text-dim)", alignSelf: "center" }}>
            Salt okuyucu: yalnızca indirme yapılabilir.
          </span>
        )}
      </div>

      {tab === "genel" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Ort. Hissedilen Sıcaklık" value={`${report.kpi.ortHissedilen} °C`} />
            <KpiCard label="Aktif Alarm Sayısı" value={String(report.kpi.aktifAlarmSayisi)} />
            <KpiCard label="Toplam Tasarruf" value={`${report.kpi.toplamTasarrufM3} m³`} sub={`${report.kpi.toplamTasarrufTL} TL`} />
            <KpiCard label="Tasarruf Yüzdesi" value={`%${report.kpi.tasarrufYuzdesi}`} />
            <KpiCard label="Ort. Sensör Online Oranı" value={`%${report.kpi.onlineOraniOrtalama}`} />
          </div>
          <div className="grid-2">
            <div className="card">
              <div className="section-title">Cephe Bazlı Sıcaklık Karşılaştırması</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={report.cepheKarsilastirma}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3b48" />
                  <XAxis dataKey="cephe" stroke="#93a4b3" />
                  <YAxis stroke="#93a4b3" />
                  <Tooltip contentStyle={{ background: "#16212c", border: "1px solid #2a3b48" }} />
                  <Bar dataKey="ortSicaklik" name="Ort. Sıcaklık (°C)" fill="#3b82f6" />
                  <Bar dataKey="ortHissedilen" name="Ort. Hissedilen (°C)" fill="#2dd4bf" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="section-title">Alarm Türü Dağılımı</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={Object.entries(report.alarmKpi.turDagilimi).map(([k, v]) => ({ name: k, value: v }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {Object.keys(report.alarmKpi.turDagilimi).map((k, i) => (
                      <Cell key={k} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {tab === "sicaklik" && (
        <div className="card">
          <div className="section-title">Sınıf Bazlı Sıcaklık/Nem/Hissedilen Özeti</div>
          <table>
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Kat</th>
                <th>Cephe</th>
                <th>Ort. Sıcaklık</th>
                <th>Ort. Nem</th>
                <th>Ort. Hissedilen</th>
                <th>Okuma Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {report.sicaklikNem.map((x) => (
                <tr key={x.room.id}>
                  <td>{x.room.ad}</td>
                  <td>{x.room.kat}</td>
                  <td>{x.room.cephe}</td>
                  <td>{x.kpi.ortSicaklik} °C</td>
                  <td>%{x.kpi.ortNem}</td>
                  <td>{x.kpi.ortHissedilen} °C</td>
                  <td>{x.kpi.okumaSayisi}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="section-title" style={{ marginTop: 20 }}>
            Isı Haritası — Kat/Sınıf Bazında Zaman İçinde Sıcaklık (Son 14 Gün)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Sınıf</th>
                  {heatmapData.days.map((d) => (
                    <th key={d}>{d.slice(5)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id}>
                    <td>{room.ad}</td>
                    {heatmapData.days.map((d) => {
                      const vals = heatmapData.byDayRoom[d]?.[room.id];
                      const avg = vals && vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                      return (
                        <td
                          key={d}
                          style={{
                            background: avg !== null ? heatColor(avg) : "transparent",
                            color: "#fff",
                            textAlign: "center",
                            fontSize: 11,
                          }}
                        >
                          {avg !== null ? avg.toFixed(1) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "enerji" && (
        <>
          <div className="kpi-grid">
            <KpiCard label="Toplam Tüketim" value={`${report.enerjiKpi.toplamTuketimM3} m³`} />
            <KpiCard label="Referans Tüketim" value={`${report.enerjiKpi.toplamReferansM3} m³`} />
            <KpiCard label="Toplam Tasarruf" value={`${report.enerjiKpi.toplamTasarrufM3} m³`} sub={`${report.enerjiKpi.toplamTasarrufTL} TL`} />
            <KpiCard label="Tasarruf Yüzdesi" value={`%${report.enerjiKpi.tasarrufYuzdesi}`} />
          </div>
          <div className="card">
            <div className="section-title">Kümülatif Enerji Tasarrufu</div>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={report.enerji.reduce<{ tarih: string; kumulatif: number }[]>((acc, e) => {
                  const prev = acc[acc.length - 1]?.kumulatif ?? 0;
                  acc.push({ tarih: e.tarih.slice(5), kumulatif: Number((prev + e.tasarrufM3).toFixed(1)) });
                  return acc;
                }, [])}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3b48" />
                <XAxis dataKey="tarih" tick={{ fontSize: 10 }} minTickGap={30} stroke="#93a4b3" />
                <YAxis stroke="#93a4b3" />
                <Tooltip contentStyle={{ background: "#16212c", border: "1px solid #2a3b48" }} />
                <Area type="monotone" dataKey="kumulatif" name="Kümülatif Tasarruf (m³)" stroke="#2dd4bf" fill="#2dd4bf33" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {tab === "alarm" && (
        <div className="card">
          <div className="section-title">Alarm/Anomali Listesi ({report.alarmlar.length})</div>
          <table>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Sınıf</th>
                <th>Tür</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {report.alarmlar.slice(0, 200).map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.ts).toLocaleString("tr-TR")}</td>
                  <td>{rooms.find((r) => r.id === a.roomId)?.ad ?? a.roomId}</td>
                  <td>{a.tur}</td>
                  <td>{a.durum}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="section-title" style={{ marginTop: 20 }}>
            Kronik Sorunlu Sınıflar
          </div>
          <table>
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Tekrar Sayısı</th>
              </tr>
            </thead>
            <tbody>
              {report.kronikOdalar.map((k) => (
                <tr key={k.roomId}>
                  <td>{k.ad}</td>
                  <td>{k.tekrarSayisi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "kombi" && (
        <div className="card">
          <div className="section-title">Kombi Setpoint Geçmişi ({report.kombiGecmisi.length} kayıt)</div>
          <table>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Setpoint</th>
                <th>Durum</th>
                <th>Sebep</th>
              </tr>
            </thead>
            <tbody>
              {report.kombiGecmisi.slice(-200).map((b, i) => (
                <tr key={i}>
                  <td>{new Date(b.ts).toLocaleString("tr-TR")}</td>
                  <td>{b.setpoint} °C</td>
                  <td>{b.acikMi ? "Açık" : "Kapalı"}</td>
                  <td>{b.sebep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "sensor" && (
        <div className="card">
          <div className="section-title">Sensör Sağlık / Bağlantı Raporu</div>
          <table>
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Son Haberleşme</th>
                <th>Online Oranı</th>
              </tr>
            </thead>
            <tbody>
              {report.sensorSagligi.map((s) => (
                <tr key={s.roomId}>
                  <td>{s.ad}</td>
                  <td>{s.sonHaberlesme ? new Date(s.sonHaberlesme).toLocaleString("tr-TR") : "-"}</td>
                  <td>%{s.onlineOrani}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
