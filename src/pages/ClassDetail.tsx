import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDataStore } from "../store/dataStore";
import DateRangePicker from "../components/DateRangePicker";
import { filterReadings, computeRoomKpi } from "../lib/calculations";
import { sortRooms } from "../lib/sort";
import { getLastReading, getRoomStatus } from "../lib/roomStatus";
import KpiCard from "../components/KpiCard";

const STATUS_DOT: Record<string, string> = { normal: "🟢", uyari: "🟡", alarm: "🔴" };
const STATUS_LABEL: Record<string, string> = {
  normal: "Normal",
  uyari: "Uyarı — takip edilmeli",
  alarm: "Alarm — müdahale gerekebilir",
};

const PAGE_SIZE = 25;

export default function ClassDetail() {
  const { rooms, readings, alarms, thresholds, getDateRange } = useDataStore();
  const sortedRooms = useMemo(() => sortRooms(rooms, "ad"), [rooms]);
  const [roomId, setRoomId] = useState(sortedRooms[0]?.id ?? "");
  const [page, setPage] = useState(0);
  const range = getDateRange();

  const room = rooms.find((r) => r.id === roomId);

  const roomStatuses = useMemo(
    () => rooms.map((r) => ({ room: r, status: getRoomStatus(r, readings, alarms, thresholds) })),
    [rooms, readings, alarms, thresholds]
  );
  const statusByRoomId = useMemo(() => {
    const map = new Map<string, string>();
    roomStatuses.forEach((r) => map.set(r.room.id, r.status));
    return map;
  }, [roomStatuses]);
  const problemRooms = useMemo(
    () => sortRooms(roomStatuses.filter((r) => r.status !== "normal").map((r) => r.room), "ad"),
    [roomStatuses]
  );
  const currentStatus = statusByRoomId.get(roomId) ?? "normal";
  const lastReading = useMemo(() => getLastReading(readings, roomId), [readings, roomId]);
  const roomAlarms = useMemo(
    () =>
      alarms
        .filter((a) => a.roomId === roomId && a.durum === "acik")
        .sort((a, b) => b.ts - a.ts),
    [alarms, roomId]
  );

  const chartData = useMemo(() => {
    const filtered = filterReadings(readings, range).filter((r) => r.roomId === roomId);
    const sorted = [...filtered].sort((a, b) => a.ts - b.ts);
    // downsample if too many points
    const step = Math.max(1, Math.floor(sorted.length / 400));
    return sorted
      .filter((_, i) => i % step === 0)
      .map((r) => ({
        zaman: new Date(r.ts).toLocaleString("tr-TR", { month: "short", day: "2-digit", hour: "2-digit" }),
        sicaklik: r.sicaklik,
        nem: r.nem,
        hissedilen: r.hissedilenSicaklik,
      }));
  }, [readings, range, roomId]);

  const rawRows = useMemo(() => {
    return [...filterReadings(readings, range).filter((r) => r.roomId === roomId)].sort(
      (a, b) => b.ts - a.ts
    );
  }, [readings, range, roomId]);

  const pageCount = Math.max(1, Math.ceil(rawRows.length / PAGE_SIZE));
  const pagedRows = rawRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const kpi = useMemo(
    () => computeRoomKpi(filterReadings(readings, range), roomId),
    [readings, range, roomId]
  );

  function selectRoom(id: string) {
    setRoomId(id);
    setPage(0);
  }

  return (
    <div>
      {problemRooms.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: "var(--warn)" }}>
          <div className="section-title" style={{ color: "var(--warn)" }}>
            Değerleri Sıkıntılı Olan Sınıflar ({problemRooms.length})
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            {problemRooms.map((r) => {
              const status = statusByRoomId.get(r.id) ?? "normal";
              return (
                <button key={r.id} className={`chip ${roomId === r.id ? "active" : ""}`} onClick={() => selectRoom(r.id)}>
                  {STATUS_DOT[status]} {r.ad}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="toolbar">
        <select className="input" value={roomId} onChange={(e) => selectRoom(e.target.value)}>
          {sortedRooms.map((r) => (
            <option key={r.id} value={r.id}>
              {STATUS_DOT[statusByRoomId.get(r.id) ?? "normal"]} {r.ad}
            </option>
          ))}
        </select>
      </div>
      <DateRangePicker />

      {room && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderColor: currentStatus !== "normal" ? "var(--warn)" : undefined,
          }}
        >
          <div className="section-title">{room.ad}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {room.kat} · Cephe: {room.cephe.toUpperCase()} · Sensör: {room.sensorTipi} ·
            Modbus Slave ID: {room.modbusSlaveId} · {room.kritikNokta ? "Kritik Nokta" : "Standart Nokta"}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`pill ${currentStatus === "normal" ? "ok" : currentStatus === "uyari" ? "warn" : "danger"}`}>
              {STATUS_DOT[currentStatus]} {STATUS_LABEL[currentStatus]}
            </span>
          </div>

          {currentStatus !== "normal" && lastReading && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid var(--danger)",
              }}
            >
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                OLMASI GEREKEN (HEDEF ARALIK)
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                {thresholds.hedefMinSicaklik}°C – {thresholds.hedefMaxSicaklik}°C
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>
                ÖLÇÜLEN (SON OKUMA — {new Date(lastReading.ts).toLocaleString("tr-TR")})
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: "var(--danger)" }}>
                {lastReading.online
                  ? `${lastReading.hissedilenSicaklik.toFixed(1)}°C`
                  : "Sensör Offline — veri gelmiyor"}
                {lastReading.online && (
                  <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8, color: "var(--text-dim)" }}>
                    (hedeften{" "}
                    {lastReading.hissedilenSicaklik > thresholds.hedefMaxSicaklik
                      ? `+${(lastReading.hissedilenSicaklik - thresholds.hedefMaxSicaklik).toFixed(1)}°C fazla`
                      : `${(lastReading.hissedilenSicaklik - thresholds.hedefMinSicaklik).toFixed(1)}°C eksik`}
                    )
                  </span>
                )}
              </div>
              {roomAlarms.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  {roomAlarms.map((a) => (
                    <div key={a.id} style={{ marginBottom: 4 }}>
                      <span className="badge acik" style={{ marginRight: 6 }}>
                        {a.tur}
                      </span>
                      {a.mesaj}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="kpi-grid">
        <KpiCard label="Ort. Sıcaklık" value={`${kpi.ortSicaklik} °C`} />
        <KpiCard label="Ort. Nem" value={`%${kpi.ortNem}`} />
        <KpiCard label="Ort. Hissedilen Sıcaklık" value={`${kpi.ortHissedilen} °C`} />
        <KpiCard label="Okuma Sayısı" value={String(kpi.okumaSayisi)} />
      </div>

      <div className="card">
        <div className="section-title">Sıcaklık / Nem / Hissedilen Sıcaklık Trendi</div>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3b48" />
            <XAxis dataKey="zaman" tick={{ fontSize: 10 }} minTickGap={40} stroke="#93a4b3" />
            <YAxis stroke="#93a4b3" />
            <Tooltip contentStyle={{ background: "#16212c", border: "1px solid #2a3b48" }} />
            <Legend />
            <Line type="monotone" dataKey="sicaklik" name="Sıcaklık (°C)" stroke="#3b82f6" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="nem" name="Nem (%)" stroke="#a78bfa" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="hissedilen" name="Hissedilen Sıcaklık (°C)" stroke="#2dd4bf" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          Tüm Ölçüm Kayıtları ({rawRows.length} kayıt — seçilen tarih aralığı)
        </div>
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Sıcaklık</th>
              <th>Nem</th>
              <th>Hissedilen</th>
              <th>Hava Kalitesi</th>
              <th>Bağlantı</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((r) => (
              <tr key={r.ts}>
                <td>{new Date(r.ts).toLocaleString("tr-TR")}</td>
                <td>{r.sicaklik.toFixed(2)} °C</td>
                <td>%{r.nem.toFixed(1)}</td>
                <td>{r.hissedilenSicaklik.toFixed(2)} °C</td>
                <td>{r.havaKaliteIndeksi ?? "-"}</td>
                <td>{r.online ? "Online" : "Offline"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="toolbar" style={{ justifyContent: "center", marginTop: 12, marginBottom: 0 }}>
          <button className="btn secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ← Önceki
          </button>
          <span style={{ alignSelf: "center", fontSize: 12.5, color: "var(--text-dim)" }}>
            Sayfa {page + 1} / {pageCount}
          </span>
          <button
            className="btn secondary"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  );
}
