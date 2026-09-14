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
import { filterBoiler, predictRoomTemp } from "../lib/calculations";
import { computeHissedilen } from "../lib/mockData";
import { getLastReading } from "../lib/roomStatus";
import { sortRooms } from "../lib/sort";
import KpiCard from "../components/KpiCard";

export default function BoilerControl() {
  const {
    rooms,
    readings,
    boilerHistory,
    overrides,
    getDateRange,
    applyOverride,
    role,
    emergencyStop,
    toggleEmergencyStop,
    systemMode,
    thresholds,
  } = useDataStore();
  const range = getDateRange();
  const latest = [...boilerHistory].sort((a, b) => b.ts - a.ts)[0];
  const [setpointInput, setSetpointInput] = useState(String(latest?.setpoint ?? 55));
  const [note, setNote] = useState("");
  const [confirmingStop, setConfirmingStop] = useState(false);

  const canOverride = role === "yonetici";

  const chartData = useMemo(() => {
    const filtered = filterBoiler(boilerHistory, range).sort((a, b) => a.ts - b.ts);
    return filtered.map((b) => ({
      zaman: new Date(b.ts).toLocaleString("tr-TR", { month: "short", day: "2-digit", hour: "2-digit" }),
      setpoint: b.setpoint,
    }));
  }, [boilerHistory, range]);

  const trialSetpoint = Number(setpointInput);
  const currentSetpoint = latest?.setpoint ?? 55;

  const prediction = useMemo(() => {
    if (Number.isNaN(trialSetpoint)) return [];
    return sortRooms(rooms, "ad").map((room) => {
      const last = getLastReading(readings, room.id);
      const guncelSicaklik = last?.sicaklik ?? 21;
      const guncelHissedilen = last?.hissedilenSicaklik ?? 21;
      const ongorulenSicaklik = predictRoomTemp(guncelSicaklik, currentSetpoint, trialSetpoint);
      const ongorulenHissedilen = Number(
        computeHissedilen(ongorulenSicaklik, last?.nem ?? 45).toFixed(2)
      );
      const hedefIcinde =
        ongorulenHissedilen >= thresholds.hedefMinSicaklik &&
        ongorulenHissedilen <= thresholds.hedefMaxSicaklik;
      return {
        room,
        guncelHissedilen,
        ongorulenSicaklik,
        ongorulenHissedilen,
        fark: Number((ongorulenHissedilen - guncelHissedilen).toFixed(2)),
        hedefIcinde,
      };
    });
  }, [rooms, readings, trialSetpoint, currentSetpoint, thresholds]);

  const ortOngorulenHissedilen = prediction.length
    ? Number(
        (prediction.reduce((s, p) => s + p.ongorulenHissedilen, 0) / prediction.length).toFixed(2)
      )
    : 0;

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
            <div className="section-title">Manuel Override / Öngörü Simülasyonu</div>
            <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: -6 }}>
              Aşağıya deneyeceğiniz setpoint değerini girin — sağdaki/alttaki tabloda tüm
              sınıfların bu değerde kaç dereceye geleceğinin öngörüsünü canlı görürsünüz.
              Sonucu beğenirseniz "Override Uygula" ile gerçekten devreye alabilirsiniz.
            </p>
            {!canOverride && (
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>
                Override uygulamak için Yönetici rolü gereklidir; öngörüyü herkes görebilir.
              </p>
            )}
            <div className="form-row">
              <label>Denenecek / Manuel Setpoint (°C)</label>
              <input
                className="input"
                type="range"
                min={35}
                max={70}
                step={0.5}
                value={Number.isNaN(trialSetpoint) ? currentSetpoint : trialSetpoint}
                onChange={(e) => setSetpointInput(e.target.value)}
              />
              <input
                className="input"
                type="number"
                value={setpointInput}
                onChange={(e) => setSetpointInput(e.target.value)}
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
            <div className="section-title">Öngörülen Ortalama Hissedilen Sıcaklık</div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>{ortOngorulenHissedilen} °C</div>
            <div style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
              Hedef aralık: {thresholds.hedefMinSicaklik}-{thresholds.hedefMaxSicaklik} °C ·
              Setpoint {currentSetpoint}°C → {Number.isNaN(trialSetpoint) ? currentSetpoint : trialSetpoint}°C
              olarak denendi
            </div>
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
        <div className="section-title">
          Setpoint {Number.isNaN(trialSetpoint) ? currentSetpoint : trialSetpoint}°C Olursa —
          Sınıf Bazlı Öngörü
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Cephe</th>
                <th>Güncel Hissedilen</th>
                <th>Öngörülen Sıcaklık</th>
                <th>Öngörülen Hissedilen</th>
                <th>Fark</th>
                <th>Hedef Aralıkta mı</th>
              </tr>
            </thead>
            <tbody>
              {prediction.map((p) => (
                <tr key={p.room.id}>
                  <td>{p.room.ad}</td>
                  <td>{p.room.cephe.toUpperCase()}</td>
                  <td>{p.guncelHissedilen.toFixed(1)} °C</td>
                  <td>{p.ongorulenSicaklik.toFixed(1)} °C</td>
                  <td style={{ fontWeight: 700 }}>{p.ongorulenHissedilen.toFixed(1)} °C</td>
                  <td style={{ color: p.fark > 0 ? "#ef4444" : p.fark < 0 ? "#3b82f6" : "var(--text-dim)" }}>
                    {p.fark > 0 ? "+" : ""}
                    {p.fark} °C
                  </td>
                  <td>
                    <span className={`pill ${p.hedefIcinde ? "ok" : "warn"}`}>
                      {p.hedefIcinde ? "Evet" : "Hayır"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
