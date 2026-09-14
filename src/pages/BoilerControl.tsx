import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDataStore } from "../store/dataStore";
import DateRangePicker from "../components/DateRangePicker";
import { filterBoiler } from "../lib/calculations";
import KpiCard from "../components/KpiCard";

export default function BoilerControl() {
  const {
    boilerHistory,
    overrides,
    getDateRange,
    applyOverride,
    role,
    emergencyStop,
    toggleEmergencyStop,
    systemMode,
  } = useDataStore();
  const range = getDateRange();
  const [setpointInput, setSetpointInput] = useState("55");
  const [note, setNote] = useState("");
  const [confirmingStop, setConfirmingStop] = useState(false);

  const canOverride = role === "yonetici";

  const latest = [...boilerHistory].sort((a, b) => b.ts - a.ts)[0];

  const chartData = useMemo(() => {
    const filtered = filterBoiler(boilerHistory, range).sort((a, b) => a.ts - b.ts);
    return filtered.map((b) => ({
      zaman: new Date(b.ts).toLocaleString("tr-TR", { month: "short", day: "2-digit", hour: "2-digit" }),
      setpoint: b.setpoint,
    }));
  }, [boilerHistory, range]);

  function handleOverride() {
    const val = Number(setpointInput);
    if (Number.isNaN(val) || val < 30 || val > 80) return;
    applyOverride(val, "yonetici@sistem", note || undefined);
    setNote("");
  }

  return (
    <div>
      <div className="kpi-grid">
        <KpiCard label="Güncel Setpoint" value={`${latest?.setpoint ?? "-"} °C`} />
        <KpiCard
          label="Kombi Durumu"
          value={latest?.acikMi ? "Açık" : "Kapalı"}
          color={latest?.acikMi ? "#22c55e" : "#93a4b3"}
        />
        <KpiCard label="Kontrol Modu" value={systemMode === "manuel" ? "Manuel Override" : "Otomatik"} />
        <KpiCard label="Son Karar Sebebi" value={latest?.sebep === "manuel-override" ? "Manuel Override" : "Otomatik"} />
      </div>

      <DateRangePicker />

      <div className="grid-2">
        <div className="card">
          <div className="section-title">Setpoint Geçmişi</div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3b48" />
              <XAxis dataKey="zaman" tick={{ fontSize: 10 }} minTickGap={40} stroke="#93a4b3" />
              <YAxis stroke="#93a4b3" domain={[30, 80]} />
              <Tooltip contentStyle={{ background: "#16212c", border: "1px solid #2a3b48" }} />
              <Line type="stepAfter" dataKey="setpoint" name="Setpoint (°C)" stroke="#2dd4bf" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title">Manuel Override Paneli</div>
            {!canOverride && (
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Bu işlem için Yönetici rolü gereklidir.
              </p>
            )}
            <div className="form-row">
              <label>Manuel Setpoint (°C)</label>
              <input
                className="input"
                type="number"
                value={setpointInput}
                onChange={(e) => setSetpointInput(e.target.value)}
                disabled={!canOverride || emergencyStop}
              />
            </div>
            <div className="form-row">
              <label>Not (opsiyonel)</label>
              <input
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={!canOverride || emergencyStop}
              />
            </div>
            <button className="btn" disabled={!canOverride || emergencyStop} onClick={handleOverride}>
              Override Uygula
            </button>
          </div>

          <div className="card">
            <div className="section-title" style={{ color: "var(--danger)" }}>
              Acil Durdur
            </div>
            <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
              Tüm otomasyonu durdurup sistemi tam manuel moda alır. Sadece Yönetici kullanabilir.
            </p>
            {!confirmingStop ? (
              <button
                className="btn danger"
                disabled={!canOverride}
                onClick={() => setConfirmingStop(true)}
              >
                {emergencyStop ? "Acil Durdurmayı Kaldır" : "Acil Durdur"}
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn danger"
                  onClick={() => {
                    toggleEmergencyStop("yonetici@sistem");
                    setConfirmingStop(false);
                  }}
                >
                  Onayla — {emergencyStop ? "Kaldır" : "Durdur"}
                </button>
                <button className="btn secondary" onClick={() => setConfirmingStop(false)}>
                  Vazgeç
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Override / Setpoint Değişiklik Geçmişi</div>
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Kullanıcı</th>
              <th>Setpoint</th>
              <th>Not</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: "var(--text-dim)" }}>
                  Henüz manuel override kaydı yok.
                </td>
              </tr>
            )}
            {overrides.map((o) => (
              <tr key={o.id}>
                <td>{new Date(o.ts).toLocaleString("tr-TR")}</td>
                <td>{o.kullanici}</td>
                <td>{o.setpoint} °C</td>
                <td>{o.not ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
