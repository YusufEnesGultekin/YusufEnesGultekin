import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useDataStore } from "../store/dataStore";
import KpiCard from "../components/KpiCard";
import { getLastReading, getRoomStatus } from "../lib/roomStatus";
import { average, round } from "../lib/calculations";

const STATUS_COLOR: Record<string, string> = {
  normal: "#22c55e",
  uyari: "#eab308",
  alarm: "#ef4444",
};

export default function Overview() {
  const { rooms, readings, alarms, thresholds, systemMode, emergencyStop } =
    useDataStore();

  const roomStatuses = useMemo(
    () => rooms.map((r) => ({ room: r, status: getRoomStatus(r, readings, alarms, thresholds) })),
    [rooms, readings, alarms, thresholds]
  );

  const activeAlarms = alarms.filter((a) => a.durum === "acik");

  const statusDist = useMemo(() => {
    const counts: Record<string, number> = { normal: 0, uyari: 0, alarm: 0 };
    roomStatuses.forEach((r) => (counts[r.status] += 1));
    return Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
  }, [roomStatuses]);

  const currentAvgFelt = useMemo(() => {
    const lasts = rooms
      .map((r) => getLastReading(readings, r.id))
      .filter((r): r is NonNullable<typeof r> => !!r && r.online);
    return round(average(lasts.map((r) => r.hissedilenSicaklik)), 1);
  }, [rooms, readings]);

  const gaugeData = [
    {
      name: "hissedilen",
      value: Math.min(100, Math.max(0, ((currentAvgFelt - 10) / 20) * 100)),
      fill: currentAvgFelt < thresholds.hedefMinSicaklik ? "#3b82f6" :
        currentAvgFelt > thresholds.hedefMaxSicaklik ? "#ef4444" : "#22c55e",
    },
  ];

  const floors = [...new Set(rooms.map((r) => r.kat))];

  return (
    <div>
      <div className="kpi-grid">
        <KpiCard label="Aktif Alarm Sayısı" value={String(activeAlarms.length)} color={activeAlarms.length > 0 ? "#ef4444" : "#22c55e"} />
        <KpiCard
          label="Sistem Modu"
          value={emergencyStop ? "ACİL DURDUR" : systemMode === "otomatik" ? "Otomatik" : systemMode === "manuel" ? "Manuel" : "Pasif/Güvenli"}
          color={systemMode === "otomatik" && !emergencyStop ? "#22c55e" : "#eab308"}
        />
        <KpiCard label="Ort. Hissedilen Sıcaklık (Anlık)" value={`${currentAvgFelt} °C`} sub={`Hedef: ${thresholds.hedefMinSicaklik}-${thresholds.hedefMaxSicaklik} °C`} />
        <KpiCard label="Toplam Nokta" value={String(rooms.length)} sub={`${rooms.filter((r) => r.kritikNokta).length} kritik nokta`} />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="section-title">Bina Kat/Sınıf Planı — Canlı Durum</div>
          {floors.map((floor) => (
            <div key={floor} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>{floor}</div>
              <div className="floor-plan-grid">
                {roomStatuses
                  .filter((r) => r.room.kat === floor)
                  .map(({ room, status }) => {
                    const last = getLastReading(readings, room.id);
                    return (
                      <div key={room.id} className={`room-tile status-${status}`}>
                        <div className="room-name">{room.ad}</div>
                        <div className="room-meta">
                          {room.cephe.toUpperCase()} · {room.sensorTipi}
                          {room.kritikNokta ? " · KRİTİK" : ""}
                        </div>
                        <div className="room-temp">
                          {last ? `${last.hissedilenSicaklik.toFixed(1)}°C` : "-"}
                        </div>
                        <div className="room-meta">{last?.online ? "Online" : "Offline"}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title">Sınıf Durum Dağılımı</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70}>
                  {statusDist.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLOR[s.name]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div className="section-title">Anlık Ortalama Hissedilen Sıcaklık Göstergesi</div>
            <ResponsiveContainer width="100%" height={180}>
              <RadialBarChart
                innerRadius="70%"
                outerRadius="100%"
                data={gaugeData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar background dataKey="value" cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", fontSize: 22, fontWeight: 700 }}>
              {currentAvgFelt} °C
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
