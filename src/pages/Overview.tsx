import { useMemo, useState } from "react";
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
import { sortRooms, type RoomSortKey } from "../lib/sort";

const STATUS_COLOR: Record<string, string> = {
  normal: "#22c55e",
  uyari: "#eab308",
  alarm: "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  normal: "Normal",
  uyari: "Uyarı",
  alarm: "Alarm",
};

const SORT_OPTIONS: { key: RoomSortKey; label: string }[] = [
  { key: "ad", label: "İsme Göre (A-Z)" },
  { key: "kat", label: "Kata Göre" },
  { key: "cephe", label: "Cepheye Göre" },
  { key: "sicaklik", label: "Sıcaklığa Göre" },
  { key: "hissedilen", label: "Hissedilen Sıcaklığa Göre" },
  { key: "nem", label: "Neme Göre" },
];

export default function Overview() {
  const { rooms, readings, alarms, thresholds, systemMode, emergencyStop } =
    useDataStore();
  const [sortKey, setSortKey] = useState<RoomSortKey>("ad");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [groupByFloor, setGroupByFloor] = useState(true);

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

  const filteredRooms = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    const base = term
      ? rooms.filter((r) => r.ad.toLocaleLowerCase("tr").includes(term))
      : rooms;
    return sortRooms(base, sortKey, sortDir, readings);
  }, [rooms, search, sortKey, sortDir, readings]);

  const floors = [...new Set(sortRooms(rooms, "kat").map((r) => r.kat))];

  const statusByRoomId = useMemo(() => {
    const map = new Map<string, string>();
    roomStatuses.forEach((r) => map.set(r.room.id, r.status));
    return map;
  }, [roomStatuses]);

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
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <button className={`chip ${groupByFloor ? "active" : ""}`} onClick={() => setGroupByFloor(true)}>
              Kata Göre Grupla
            </button>
            <button className={`chip ${!groupByFloor ? "active" : ""}`} onClick={() => setGroupByFloor(false)}>
              Tek Liste
            </button>
          </div>
          {groupByFloor ? (
            floors.map((floor) => (
              <div key={floor} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>{floor}</div>
                <div className="floor-plan-grid">
                  {sortRooms(
                    roomStatuses.filter((r) => r.room.kat === floor).map((r) => r.room),
                    sortKey,
                    sortDir,
                    readings
                  ).map((room) => {
                    const status = statusByRoomId.get(room.id) ?? "normal";
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
            ))
          ) : (
            <div className="floor-plan-grid">
              {filteredRooms.map((room) => {
                const status = statusByRoomId.get(room.id) ?? "normal";
                const last = getLastReading(readings, room.id);
                return (
                  <div key={room.id} className={`room-tile status-${status}`}>
                    <div className="room-name">{room.ad}</div>
                    <div className="room-meta">
                      {room.kat} · {room.cephe.toUpperCase()}
                    </div>
                    <div className="room-temp">
                      {last ? `${last.hissedilenSicaklik.toFixed(1)}°C` : "-"}
                    </div>
                    <div className="room-meta">{last?.online ? "Online" : "Offline"}</div>
                  </div>
                );
              })}
            </div>
          )}
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="section-title">Tüm Sınıflar — Detaylı Liste ({filteredRooms.length} nokta)</div>
        <div className="toolbar">
          <input
            className="input"
            placeholder="Sınıf ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 200 }}
          />
          <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value as RoomSortKey)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="chip" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
            {sortDir === "asc" ? "Artan ↑" : "Azalan ↓"}
          </button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Sınıf</th>
                <th>Kat</th>
                <th>Cephe</th>
                <th>Sensör</th>
                <th>Slave ID</th>
                <th>Sıcaklık</th>
                <th>Nem</th>
                <th>Hissedilen</th>
                <th>Hava Kalitesi</th>
                <th>Durum</th>
                <th>Bağlantı</th>
                <th>Son Güncelleme</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
                const last = getLastReading(readings, room.id);
                const status = statusByRoomId.get(room.id) ?? "normal";
                return (
                  <tr key={room.id}>
                    <td>
                      {room.ad}
                      {room.kritikNokta && <span className="badge acik" style={{ marginLeft: 6 }}>KRİTİK</span>}
                    </td>
                    <td>{room.kat}</td>
                    <td>{room.cephe.toUpperCase()}</td>
                    <td>{room.sensorTipi}</td>
                    <td>{room.modbusSlaveId}</td>
                    <td>{last ? `${last.sicaklik.toFixed(1)} °C` : "-"}</td>
                    <td>{last ? `%${last.nem.toFixed(0)}` : "-"}</td>
                    <td>{last ? `${last.hissedilenSicaklik.toFixed(1)} °C` : "-"}</td>
                    <td>{last?.havaKaliteIndeksi ?? "-"}</td>
                    <td>
                      <span className={`pill ${status === "normal" ? "ok" : status === "uyari" ? "warn" : "danger"}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td>{last?.online ? "Online" : "Offline"}</td>
                    <td>{last ? new Date(last.ts).toLocaleString("tr-TR") : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
