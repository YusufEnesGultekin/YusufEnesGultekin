import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import KpiCard from "../components/KpiCard";
import {
  DEFAULT_BINA_SAYILARI,
  GUNCEL_M3_FIYAT_VARSAYIM_TL,
  REFERENCE_SCHOOL,
  SCALE_LABELS,
  formatCompactNumber,
  runSimulation,
  type SimulationScale,
} from "../lib/simulationEngine";

const SCALES: SimulationScale[] = ["okul", "ilce", "il", "bolge", "turkiye"];

export default function Simulation() {
  const [binaAlaniM2, setBinaAlaniM2] = useState(REFERENCE_SCHOOL.binaAlaniM2);
  const [fazlaIsitmaDerece, setFazlaIsitmaDerece] = useState(REFERENCE_SCHOOL.fazlaIsitmaDerece);
  const [kisSezonuGun, setKisSezonuGun] = useState(REFERENCE_SCHOOL.kisSezonuGun);
  const [harcananSabiti, setHarcananSabiti] = useState(REFERENCE_SCHOOL.harcananSabiti);
  const [m3BirimFiyatTL, setM3BirimFiyatTL] = useState(GUNCEL_M3_FIYAT_VARSAYIM_TL);
  const [sistemBirimMaliyetiTL, setSistemBirimMaliyetiTL] = useState(
    REFERENCE_SCHOOL.sistemBirimMaliyetiTL
  );
  const [seriUretimIndirimi, setSeriUretimIndirimi] = useState(false);
  const [olcek, setOlcek] = useState<SimulationScale>("okul");
  const [binaSayilari, setBinaSayilari] = useState(DEFAULT_BINA_SAYILARI);

  const inputs = {
    binaAlaniM2,
    fazlaIsitmaDerece,
    kisSezonuGun,
    harcananSabiti,
    m3BirimFiyatTL,
    sistemBirimMaliyetiTL,
    seriUretimIndirimi,
    olcek,
    binaSayilari,
  };

  const result = useMemo(() => runSimulation(inputs), [
    binaAlaniM2,
    fazlaIsitmaDerece,
    kisSezonuGun,
    harcananSabiti,
    m3BirimFiyatTL,
    sistemBirimMaliyetiTL,
    seriUretimIndirimi,
    olcek,
    binaSayilari,
  ]);

  const scaleComparison = useMemo(
    () =>
      SCALES.map((s) => {
        const r = runSimulation({ ...inputs, olcek: s });
        return {
          olcek: SCALE_LABELS[s].split(" (")[0],
          tasarrufMilyonTL: Number((r.toplamSezonlukTasarrufTL / 1_000_000).toFixed(2)),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [binaAlaniM2, fazlaIsitmaDerece, kisSezonuGun, harcananSabiti, m3BirimFiyatTL, binaSayilari]
  );

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="section-title">Tasarruf Simülasyonu — Okuldan Türkiye Geneline</div>
        <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Bu hesaplama, projenin dayanağı olan saha ölçümüne (16 derslik + 9 etkinlik
          salonundan oluşan, 3.382 m² ve 4 katlı örnek bir kamu okulu) ve orada türetilen{" "}
          <code>Fazla Harcama (m³) = Harcanan Sabiti × Alan (m²) × Fazla Derece (°C)</code>{" "}
          formülüne dayanır. Tüm değerler aşağıdan güncellenebilir; ölçek seçerek bulguyu
          ilçe, il, bölge veya Türkiye geneline (MEB — 61.011 okul) yansıtabilirsiniz.
        </p>
        <p style={{ fontSize: 12, color: "var(--text-dim)" }}>
          Benzer sonuçlar başka çalışmalarda da bildirilmiştir: İzmir'de bir kamu okulunda
          yapılan ölçümlerde sınıf sıcaklıklarının ISO 7730 sınırlarını aştığı (Çalış G. ve
          Ark., 2017), bir yükseköğretim binasında ise ortalama 25,36 °C ile ~5,36 °C
          fazla ısıtma tespit edildiği (Mıhlayanlar ve Ark., 2017) raporlanmıştır — yani
          fazla ısıtma sorunu bu örnek okula özgü değildir.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title">Girdi Parametreleri</div>
          <div className="form-row">
            <label>Bina Alanı (m²) — referans okul: {REFERENCE_SCHOOL.binaAlaniM2} m²</label>
            <input
              className="input"
              type="number"
              value={binaAlaniM2}
              onChange={(e) => setBinaAlaniM2(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>Fazla Isıtma Miktarı (°C) — referans: {REFERENCE_SCHOOL.fazlaIsitmaDerece}°C</label>
            <input
              className="input"
              type="number"
              value={fazlaIsitmaDerece}
              onChange={(e) => setFazlaIsitmaDerece(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>Kış Sezonu Uzunluğu (gün) — referans: {REFERENCE_SCHOOL.kisSezonuGun} gün</label>
            <input
              className="input"
              type="number"
              value={kisSezonuGun}
              onChange={(e) => setKisSezonuGun(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>Harcanan Sabiti (m³ gaz / m² / °C) — deneysel referans: 0.00095</label>
            <input
              className="input"
              type="number"
              step={0.00001}
              value={harcananSabiti}
              onChange={(e) => setHarcananSabiti(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>
              Doğalgaz m³ Birim Fiyatı (TL) — 2026 güncel varsayım (BOTAŞ toptan sanayi/ticarethane
              referansı ~15 TL/Sm³ + dağıtım/vergi)
            </label>
            <input
              className="input"
              type="number"
              value={m3BirimFiyatTL}
              onChange={(e) => setM3BirimFiyatTL(Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>Sistem Birim Maliyeti (TL/okul) — referans: {REFERENCE_SCHOOL.sistemBirimMaliyetiTL.toLocaleString("tr-TR")} TL</label>
            <input
              className="input"
              type="number"
              value={sistemBirimMaliyetiTL}
              onChange={(e) => setSistemBirimMaliyetiTL(Number(e.target.value))}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginTop: 4 }}>
            <input
              type="checkbox"
              checked={seriUretimIndirimi}
              onChange={(e) => setSeriUretimIndirimi(e.target.checked)}
            />
            Seri üretim indirimi uygula (rapor önerisi: maliyet ~yarıya iner)
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title">Ölçek Seçimi</div>
            <div className="toolbar" style={{ marginBottom: 8 }}>
              {SCALES.map((s) => (
                <button key={s} className={`chip ${olcek === s ? "active" : ""}`} onClick={() => setOlcek(s)}>
                  {SCALE_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="form-row">
              <label>{SCALE_LABELS[olcek]} için okul/bina sayısı</label>
              <input
                className="input"
                type="number"
                value={binaSayilari[olcek]}
                onChange={(e) =>
                  setBinaSayilari({ ...binaSayilari, [olcek]: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KpiCard label="Günlük Fazla Gaz (1 Bina)" value={`${result.gunlukFazlaGazM3} m³`} />
            <KpiCard label="Sezonluk Fazla Gaz (1 Bina)" value={`${result.sezonlukFazlaGazM3} m³`} />
            <KpiCard label="Sezonluk Tasarruf (1 Bina)" value={`${result.sezonlukTasarrufTL.toLocaleString("tr-TR")} TL`} />
            <KpiCard label="Seçili Ölçekteki Bina Sayısı" value={result.binaSayisi.toLocaleString("tr-TR")} />
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="section-title">{SCALE_LABELS[olcek]} — Toplam Sonuç</div>
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            <KpiCard
              label="Toplam Sezonluk Gaz Tasarrufu"
              value={`${formatCompactNumber(result.toplamSezonlukGazM3)} m³`}
              sub={`${result.toplamSezonlukGazM3.toLocaleString("tr-TR")} m³`}
              color="#2dd4bf"
            />
            <KpiCard
              label="Toplam Sezonluk TL Tasarrufu"
              value={`${formatCompactNumber(result.toplamSezonlukTasarrufTL)} TL`}
              sub={`${result.toplamSezonlukTasarrufTL.toLocaleString("tr-TR")} TL`}
              color="#22c55e"
            />
            <KpiCard
              label="Toplam Sistem Maliyeti"
              value={`${formatCompactNumber(result.toplamSistemMaliyetiTL)} TL`}
              sub={`${result.toplamSistemMaliyetiTL.toLocaleString("tr-TR")} TL`}
              color="#eab308"
            />
            <KpiCard
              label="Amortisman Süresi"
              value={result.amortismanAy !== null ? `${result.amortismanAy} ay` : "-"}
              color="#3b82f6"
            />
          </div>
        </div>

        <div className="card">
          <div className="section-title">Ölçeklere Göre Yıllık Tasarruf Karşılaştırması (Milyon TL)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={scaleComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3b48" />
              <XAxis dataKey="olcek" tick={{ fontSize: 10 }} stroke="#93a4b3" />
              <YAxis stroke="#93a4b3" />
              <Tooltip contentStyle={{ background: "#16212c", border: "1px solid #2a3b48" }} />
              <Bar dataKey="tasarrufMilyonTL" name="Tasarruf (Milyon TL)" fill="#2dd4bf" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Referans Okul Bilgileri (Proje Raporundan)</div>
        <table>
          <tbody>
            <tr>
              <td>Bina Alanı</td>
              <td>{REFERENCE_SCHOOL.binaAlaniM2} m²</td>
            </tr>
            <tr>
              <td>Kat Sayısı</td>
              <td>{REFERENCE_SCHOOL.katSayisi}</td>
            </tr>
            <tr>
              <td>Eğitim Ortamı Sayısı (16 derslik + 9 etkinlik salonu)</td>
              <td>{REFERENCE_SCHOOL.egitimOrtamiSayisi}</td>
            </tr>
            <tr>
              <td>Öğrenci Sayısı</td>
              <td>{REFERENCE_SCHOOL.ogrenciSayisi}</td>
            </tr>
            <tr>
              <td>Personel Sayısı</td>
              <td>{REFERENCE_SCHOOL.personelSayisi}</td>
            </tr>
            <tr>
              <td>Tespit Edilen Fazla Isıtma</td>
              <td>{REFERENCE_SCHOOL.fazlaIsitmaDerece} °C</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
