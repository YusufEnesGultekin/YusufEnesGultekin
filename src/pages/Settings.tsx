import { useMemo, useState } from "react";
import { useDataStore } from "../store/dataStore";
import type { Cephe, SensorType } from "../lib/types";
import { sortRooms, type RoomSortKey } from "../lib/sort";

const FLOOR_OPTIONS = ["Zemin Kat", "1. Kat", "2. Kat", "3. Kat"];

export default function Settings() {
  const {
    rooms,
    updateRoom,
    addRoom,
    removeRoom,
    thresholds,
    updateThresholds,
    schedule,
    holidays,
    m3BirimFiyat,
  } = useDataStore();
  const [localThresholds, setLocalThresholds] = useState(thresholds);
  const [sortKey, setSortKey] = useState<"ad" | "kat" | "cephe">("ad");
  const [newRoom, setNewRoom] = useState({
    ad: "",
    kat: FLOOR_OPTIONS[0],
    cephe: "kuzey" as Cephe,
    sensorTipi: "SAS-TH" as SensorType,
    kritikNokta: false,
  });

  const sortedRooms = useMemo(() => sortRooms(rooms, sortKey as RoomSortKey), [rooms, sortKey]);

  function handleAddRoom() {
    if (!newRoom.ad.trim()) return;
    addRoom({ ...newRoom, floorId: newRoom.kat, ad: newRoom.ad.trim() });
    setNewRoom({ ...newRoom, ad: "" });
  }

  return (
    <div>
      <div className="grid-2">
        <div className="card">
          <div className="section-title">
            Sınıf / Nokta Yönetimi — Cephe Yönü Etiketleme ({rooms.length} nokta)
          </div>
          <div className="toolbar">
            <span style={{ fontSize: 12.5, color: "var(--text-dim)", alignSelf: "center" }}>
              Sırala:
            </span>
            <button className={`chip ${sortKey === "ad" ? "active" : ""}`} onClick={() => setSortKey("ad")}>
              İsme Göre (A-Z)
            </button>
            <button className={`chip ${sortKey === "kat" ? "active" : ""}`} onClick={() => setSortKey("kat")}>
              Kata Göre
            </button>
            <button className={`chip ${sortKey === "cephe" ? "active" : ""}`} onClick={() => setSortKey("cephe")}>
              Cepheye Göre
            </button>
          </div>
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Sınıf</th>
                  <th>Kat</th>
                  <th>Cephe</th>
                  <th>Sensör Tipi</th>
                  <th>Slave ID</th>
                  <th>Kritik</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRooms.map((r) => (
                  <tr key={r.id}>
                    <td>{r.ad}</td>
                    <td>{r.kat}</td>
                    <td>
                      <select
                        className="input"
                        value={r.cephe}
                        onChange={(e) => updateRoom(r.id, { cephe: e.target.value as Cephe })}
                      >
                        <option value="kuzey">Kuzey</option>
                        <option value="guney">Güney</option>
                        <option value="dogu">Doğu</option>
                        <option value="bati">Batı</option>
                      </select>
                    </td>
                    <td>{r.sensorTipi}</td>
                    <td>{r.modbusSlaveId}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.kritikNokta}
                        onChange={(e) => updateRoom(r.id, { kritikNokta: e.target.checked })}
                      />
                    </td>
                    <td>
                      <button className="btn secondary" onClick={() => removeRoom(r.id)}>
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-title" style={{ marginTop: 20 }}>
            Yeni Sınıf / Nokta Ekle
          </div>
          <div className="toolbar">
            <input
              className="input"
              placeholder="Sınıf adı (örn. 9-A Sınıfı)"
              value={newRoom.ad}
              onChange={(e) => setNewRoom({ ...newRoom, ad: e.target.value })}
            />
            <select
              className="input"
              value={newRoom.kat}
              onChange={(e) => setNewRoom({ ...newRoom, kat: e.target.value })}
            >
              {FLOOR_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={newRoom.cephe}
              onChange={(e) => setNewRoom({ ...newRoom, cephe: e.target.value as Cephe })}
            >
              <option value="kuzey">Kuzey</option>
              <option value="guney">Güney</option>
              <option value="dogu">Doğu</option>
              <option value="bati">Batı</option>
            </select>
            <select
              className="input"
              value={newRoom.sensorTipi}
              onChange={(e) => setNewRoom({ ...newRoom, sensorTipi: e.target.value as SensorType })}
            >
              <option value="SAS-TH">SAS-TH</option>
              <option value="SAS-IAQ">SAS-IAQ</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={newRoom.kritikNokta}
                onChange={(e) => setNewRoom({ ...newRoom, kritikNokta: e.target.checked })}
              />
              Kritik Nokta
            </label>
            <button className="btn" onClick={handleAddRoom}>
              Ekle
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="section-title">Eşik Değerleri</div>
            <div className="form-row">
              <label>Ani Düşüş Eşiği (°C)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.aniDususDerece}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, aniDususDerece: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Güven Eşiği Sapma (°C)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.guvenEsigiSapma}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, guvenEsigiSapma: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Hedef Min. Sıcaklık (°C)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.hedefMinSicaklik}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, hedefMinSicaklik: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Hedef Max. Sıcaklık (°C)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.hedefMaxSicaklik}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, hedefMaxSicaklik: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Setpoint Maks. Değişim (°C)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.setpointMaxDegisim}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, setpointMaxDegisim: Number(e.target.value) })
                }
              />
            </div>
            <div className="form-row">
              <label>Setpoint Min. Bekleme (dk)</label>
              <input
                className="input"
                type="number"
                value={localThresholds.setpointMinBekleme}
                onChange={(e) =>
                  setLocalThresholds({ ...localThresholds, setpointMinBekleme: Number(e.target.value) })
                }
              />
            </div>
            <button className="btn" onClick={() => updateThresholds(localThresholds)}>
              Kaydet
            </button>
          </div>

          <div className="card">
            <div className="section-title">m³ Birim Fiyatı</div>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{m3BirimFiyat.toFixed(2)} TL</p>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="section-title">Ders Programı — Teneffüs Saatleri (Hafta İçi)</div>
          <table>
            <thead>
              <tr>
                <th>Teneffüs</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
              </tr>
            </thead>
            <tbody>
              {schedule[0]?.teneffusSaatleri.map((t, i) => (
                <tr key={i}>
                  <td>Teneffüs {i + 1}</td>
                  <td>{t.baslangic}</td>
                  <td>{t.bitis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="section-title">Tatil Takvimi</div>
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Açıklama</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h.tarih}>
                  <td>{h.tarih}</td>
                  <td>{h.ad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
