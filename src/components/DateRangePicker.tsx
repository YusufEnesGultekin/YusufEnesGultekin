import { useDataStore } from "../store/dataStore";
import type { DateRangePreset } from "../lib/types";

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "bugun", label: "Bugün" },
  { key: "son7gun", label: "Son 7 Gün" },
  { key: "son30gun", label: "Son 30 Gün" },
  { key: "buay", label: "Bu Ay" },
  { key: "gecenay", label: "Geçen Ay" },
  { key: "busezon", label: "Bu Sezon (Ekim-Mart)" },
  { key: "buyil", label: "Bu Yıl" },
  { key: "tumzamanlar", label: "Tüm Zamanlar" },
];

function toInputDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export default function DateRangePicker() {
  const { datePreset, setDatePreset, setCustomRange, getDateRange, customRange } =
    useDataStore();
  const range = getDateRange();

  return (
    <div className="date-range-bar">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          className={`chip ${datePreset === p.key ? "active" : ""}`}
          onClick={() => setDatePreset(p.key)}
        >
          {p.label}
        </button>
      ))}
      <span style={{ color: "var(--text-dim)", fontSize: 12 }}>|</span>
      <input
        type="date"
        className="input"
        value={toInputDate(customRange?.start ?? range.start)}
        onChange={(e) =>
          setCustomRange(
            new Date(e.target.value).getTime(),
            customRange?.end ?? range.end
          )
        }
      />
      <span style={{ color: "var(--text-dim)" }}>–</span>
      <input
        type="date"
        className="input"
        value={toInputDate(customRange?.end ?? range.end)}
        onChange={(e) =>
          setCustomRange(
            customRange?.start ?? range.start,
            new Date(e.target.value).getTime()
          )
        }
      />
      <span
        className={`chip ${datePreset === "ozel" ? "active" : ""}`}
        style={{ cursor: "default" }}
      >
        Özel Aralık
      </span>
      <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-dim)" }}>
        {new Date(range.start).toLocaleDateString("tr-TR")} –{" "}
        {new Date(range.end).toLocaleDateString("tr-TR")}
      </span>
    </div>
  );
}
