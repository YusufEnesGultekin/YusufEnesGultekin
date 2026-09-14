import { useMemo, useState } from "react";
import { useDataStore } from "../store/dataStore";

const TUR_LABEL: Record<string, string> = {
  "ani-dusus": "Ani Düşüş",
  "kronik-sorun": "Kronik Sorun",
  "guven-esigi": "Güven Eşiği Aşımı",
  "sensor-offline": "Sensör Offline",
};

export default function Alarms() {
  const { alarms, rooms, acknowledgeAlarm, closeAlarm, role } = useDataStore();
  const [roomFilter, setRoomFilter] = useState("hepsi");
  const [turFilter, setTurFilter] = useState("hepsi");
  const [durumFilter, setDurumFilter] = useState("hepsi");

  const canAct = role === "yonetici" || role === "bakim";

  const filtered = useMemo(() => {
    return [...alarms]
      .filter((a) => roomFilter === "hepsi" || a.roomId === roomFilter)
      .filter((a) => turFilter === "hepsi" || a.tur === turFilter)
      .filter((a) => durumFilter === "hepsi" || a.durum === durumFilter)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 300);
  }, [alarms, roomFilter, turFilter, durumFilter]);

  return (
    <div>
      <div className="toolbar">
        <select className="input" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
          <option value="hepsi">Tüm Sınıflar</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.ad}
            </option>
          ))}
        </select>
        <select className="input" value={turFilter} onChange={(e) => setTurFilter(e.target.value)}>
          <option value="hepsi">Tüm Türler</option>
          {Object.entries(TUR_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input" value={durumFilter} onChange={(e) => setDurumFilter(e.target.value)}>
          <option value="hepsi">Tüm Durumlar</option>
          <option value="acik">Açık</option>
          <option value="kapandi">Kapandı</option>
          <option value="onaylandi">Onaylandı</option>
        </select>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Sınıf</th>
              <th>Tür</th>
              <th>Mesaj</th>
              <th>Durum</th>
              <th>Onaylayan</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const room = rooms.find((r) => r.id === a.roomId);
              return (
                <tr key={a.id}>
                  <td>{new Date(a.ts).toLocaleString("tr-TR")}</td>
                  <td>{room?.ad ?? a.roomId}</td>
                  <td>{TUR_LABEL[a.tur]}</td>
                  <td style={{ maxWidth: 320 }}>{a.mesaj}</td>
                  <td>
                    <span className={`badge ${a.durum}`}>
                      {a.durum === "acik" ? "Açık" : a.durum === "kapandi" ? "Kapandı" : "Onaylandı"}
                    </span>
                  </td>
                  <td>{a.onaylayan ?? "-"}</td>
                  <td style={{ display: "flex", gap: 6 }}>
                    {a.durum === "acik" && canAct && (
                      <>
                        <button
                          className="btn secondary"
                          onClick={() => acknowledgeAlarm(a.id, "kullanici@sistem")}
                        >
                          Onayla
                        </button>
                        <button className="btn secondary" onClick={() => closeAlarm(a.id)}>
                          Kapat
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-dim)" }}>Filtreye uyan alarm bulunamadı.</p>
        )}
      </div>
    </div>
  );
}
