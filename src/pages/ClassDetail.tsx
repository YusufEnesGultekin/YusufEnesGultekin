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
import { filterReadings } from "../lib/calculations";
import { computeRoomKpi } from "../lib/calculations";
import KpiCard from "../components/KpiCard";

export default function ClassDetail() {
  const { rooms, readings, getDateRange } = useDataStore();
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? "");
  const range = getDateRange();

  const room = rooms.find((r) => r.id === roomId);

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

  const kpi = useMemo(
    () => computeRoomKpi(filterReadings(readings, range), roomId),
    [readings, range, roomId]
  );

  return (
    <div>
      <div className="toolbar">
        <select className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.ad}
            </option>
          ))}
        </select>
      </div>
      <DateRangePicker />

      {room && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">{room.ad}</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
            {room.kat} · Cephe: {room.cephe.toUpperCase()} · Sensör: {room.sensorTipi} ·
            Modbus Slave ID: {room.modbusSlaveId} · {room.kritikNokta ? "Kritik Nokta" : "Standart Nokta"}
          </div>
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
    </div>
  );
}
