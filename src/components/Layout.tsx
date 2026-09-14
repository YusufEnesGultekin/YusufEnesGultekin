import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { useDataStore } from "../store/dataStore";

const NAV = [
  { to: "/", label: "Genel Bakış", roles: ["yonetici", "bakim", "salt-okuyucu"] },
  { to: "/sinif", label: "Sınıf Detay", roles: ["yonetici", "bakim", "salt-okuyucu"] },
  { to: "/kombi", label: "Kombi Kontrol Paneli", roles: ["yonetici", "bakim"] },
  { to: "/alarmlar", label: "Alarm / Bildirim Merkezi", roles: ["yonetici", "bakim"] },
  { to: "/raporlar", label: "Raporlar", roles: ["yonetici", "bakim", "salt-okuyucu"] },
  { to: "/simulasyon", label: "Simülasyon", roles: ["yonetici", "bakim", "salt-okuyucu"] },
  { to: "/ayarlar", label: "Ayarlar", roles: ["yonetici"] },
];

export default function Layout() {
  const { role, setRole, systemMode, emergencyStop, connectionOk, lastUpdate, tick } =
    useDataStore();

  useEffect(() => {
    const id = setInterval(() => tick(), 45_000);
    return () => clearInterval(id);
  }, [tick]);

  const staleMs = Date.now() - lastUpdate;
  const isStale = staleMs > 90_000;

  const modeInfo = useMemo(() => {
    if (emergencyStop) return { text: "ACİL DURDUR — TAM MANUEL", cls: "danger" };
    if (systemMode === "manuel") return { text: "Manuel Override Aktif", cls: "warn" };
    if (systemMode === "pasif-guvenli")
      return { text: "Pasif / Güvenli Mod (Güven Eşiği Aşıldı)", cls: "warn" };
    return { text: "Normal Otomatik Kontrol", cls: "ok" };
  }, [systemMode, emergencyStop]);

  const visibleNav = NAV.filter((n) => n.roles.includes(role));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>İzleme Sistemi</span>
          <h1>Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi</h1>
        </div>
        {visibleNav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            {n.label}
          </NavLink>
        ))}
        <div style={{ marginTop: "auto", padding: "12px 16px" }}>
          <div className="form-row">
            <label>Kullanıcı Rolü (demo)</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="yonetici">Yönetici</option>
              <option value="bakim">Bakım Personeli</option>
              <option value="salt-okuyucu">Salt Okuyucu</option>
            </select>
          </div>
        </div>
      </aside>
      <div className="main-area">
        <div className="topbar">
          <h2>Kamu Binalarında Enerji Verimliliğini İzleme ve Müdahale Sistemi</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className={`pill ${modeInfo.cls}`}>
              <span className="dot" /> {modeInfo.text}
            </span>
            <span className={`pill ${connectionOk ? "ok" : "danger"}`}>
              <span className="dot" /> {connectionOk ? "Bağlantı Normal" : "Bağlantı Sorunu"}
            </span>
          </div>
        </div>
        <div className="content">
          {isStale && (
            <div className="stale-banner">
              Son bilinen veri gösteriliyor — canlı bağlantı{" "}
              {Math.round(staleMs / 1000)} saniyedir güncellenmedi.
            </div>
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}
