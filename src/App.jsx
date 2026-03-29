import React, { useState, useMemo } from "react";
import {
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const USD_RATE = 16900;

const ASSET_CLASSES = [
  {
    id: "cash",
    name: "Cash / Bank",
    return: 1.0,
    color: "#3b82f6",
    isEquity: false,
    isUSD: false,
    taxRate: 0.2,
    liquidity: "T+0",
    risk: "Sangat Rendah",
    description:
      "Uang fisik atau tabungan bank biasa. Likuid penuh, bunga rendah.",
  },
  {
    id: "bankDigital",
    name: "Bank Digital",
    return: 4.0,
    color: "#06b6d4",
    isEquity: false,
    isUSD: false,
    taxRate: 0.2,
    liquidity: "T+0",
    risk: "Sangat Rendah",
    description:
      "Tabungan bank digital (Blu, Jago, dst). Bunga lebih tinggi, LPS terjamin.",
  },
  {
    id: "rdpu",
    name: "Reksadana Pasar Uang",
    return: 5.1,
    color: "#10b981",
    isEquity: false,
    isUSD: false,
    taxRate: 0.1,
    liquidity: "T+1",
    risk: "Rendah",
    description: "Reksa dana pasar uang. Stabil, cocok untuk dana darurat.",
  },
  {
    id: "rdo",
    name: "Reksadana Obligasi",
    return: 6.5,
    color: "#6366f1",
    isEquity: false,
    isUSD: false,
    taxRate: 0.1,
    liquidity: "T+2",
    risk: "Rendah–Sedang",
    description: "Reksa dana obligasi. Return lebih tinggi, sedikit fluktuasi.",
  },
  {
    id: "saham",
    name: "Saham IDX",
    return: 12.0,
    color: "#f59e0b",
    isEquity: true,
    isUSD: false,
    taxRate: 0.001,
    liquidity: "T+2",
    risk: "Tinggi",
    description:
      "Saham IDX via LTS. Potensi return tinggi dengan volatilitas signifikan.",
  },
  {
    id: "sp500",
    name: "S&P 500 (VOO)",
    return: 10.5,
    color: "#8b5cf6",
    isEquity: true,
    isUSD: false,
    taxRate: 0.1,
    liquidity: "T+2",
    risk: "Tinggi",
    description:
      "Indeks saham AS. Return historis ~10% USD/tahun + estimasi apresiasi kurs IDR.",
  },
  {
    id: "usd",
    name: "Valas USD",
    return: 3.5,
    color: "#059669",
    isEquity: false,
    isUSD: true,
    taxRate: 0,
    liquidity: "T+0",
    risk: "Sedang",
    description:
      "Simpanan USD. Return dari apresiasi kurs IDR/USD historis ~3–4%/tahun.",
  },
  {
    id: "gold",
    name: "Emas / Gold",
    return: 9.0,
    // Biaya efektif emas (angka tengah fisik & digital):
    // - Spread fisik Antam ~9%, digital ~3.5% → rata-rata ~6.25% → /5thn hold = ~1.25%/thn
    // - PPh buyback 1.5% (ber-NPWP) → /5thn = ~0.30%/thn
    // - Biaya penyimpanan/admin digital ~0.10%/thn
    // Total biaya efektif tahunan: ~1.65% → dibulatkan 1.5% (taxRate ~0.167 dari return 9%)
    // Implementasi: afterTaxReturn mengurangi langsung 1.5% dari return
    color: "#eab308",
    isEquity: false,
    isUSD: false,
    taxRate: 0, // dihandle khusus di afterTaxReturn (bukan persentase dari return)
    isGold: true, // flag khusus untuk logika biaya emas
    liquidity: "T+1", // digital T+1, fisik bisa lebih lama
    risk: "Sedang",
    description:
      "Emas fisik/digital (Antam, Pegadaian, dll). Return ~9%/thn IDR. Sudah dipotong biaya efektif ~1.5%/thn (spread + PPh buyback + admin).",
  },
];

const PROJECTION_YEARS = 10;

const TEMPLATES = [
  {
    id: "mysnapshot",
    label: "📸 Setup Saya",
    desc: "Tingkat risiko & return user",
    values: {
      cash: 2000000,
      bankDigital: 10430000,
      rdpu: 12500000,
      rdo: 30000000,
      saham: 10000000,
      sp500: 30000000,
      usd: 300,
      gold: 0,
    },
  },
  {
    id: "conservative",
    label: "🛡️ Konservatif",
    desc: "Prioritas keamanan & likuiditas",
    values: {
      cash: 40000000,
      bankDigital: 30000000,
      rdpu: 20000000,
      rdo: 10000000,
      saham: 0,
      sp500: 0,
      usd: 0,
      gold: 0,
    },
  },
  {
    id: "moderate",
    label: "⚖️ Moderat",
    desc: "Keseimbangan risiko & return",
    values: {
      cash: 15000000,
      bankDigital: 10000000,
      rdpu: 15000000,
      rdo: 20000000,
      saham: 15000000,
      sp500: 25000000,
      usd: 0,
      gold: 0,
    },
  },
  {
    id: "aggressive",
    label: "🔥 Agresif",
    desc: "Maksimalkan pertumbuhan jangka panjang",
    values: {
      cash: 5000000,
      bankDigital: 5000000,
      rdpu: 0,
      rdo: 10000000,
      saham: 35000000,
      sp500: 45000000,
      usd: 0,
      gold: 0,
    },
  },
  {
    id: "global",
    label: "🌐 Global Hedge",
    desc: "Diversifikasi mata uang & geografi",
    values: {
      cash: 10000000,
      bankDigital: 10000000,
      rdpu: 10000000,
      rdo: 20000000,
      saham: 10000000,
      sp500: 30000000,
      usd: 591,
      gold: 0,
    },
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatIDR = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const formatCompact = (v) => {
  if (v >= 1e12) return `Rp ${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `Rp ${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp ${(v / 1e6).toFixed(0)}Jt`;
  return `Rp ${Math.round(v)}`;
};

const afterTaxReturn = (cls) => {
  if (cls.id === "saham") return cls.return * 0.97;
  // Emas: kurangi biaya efektif tahunan 1.5% langsung dari return
  // (mencakup: spread fisik/digital ~1.25%/thn + PPh buyback ~0.30%/thn − buffer)
  if (cls.isGold) return cls.return - 1.5;
  if (cls.taxRate === 0) return cls.return;
  return cls.return * (1 - cls.taxRate);
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function WealthTracker() {
  const [assets, setAssets] = useState({
    cash: 2000000,
    bankDigital: 10430000,
    rdpu: 12500000,
    rdo: 30000000,
    saham: 10000000,
    sp500: 30000000,
    usd: 300,
    gold: 0,
  });

  const [fireTarget, setFireTarget] = useState(1000000000); // Default 5 Miliar

  // Per-aset kontribusi bulanan (gambar B — diisi di kartu masing-masing)
  const [monthlyContribs, setMonthlyContribs] = useState({
    cash: 0,
    bankDigital: 0,
    rdpu: 0,
    rdo: 0,
    saham: 0,
    sp500: 0,
    usd: 0,
    gold: 0,
  });

  const [inflationRate, setInflationRate] = useState(5.0);
  const [showAfterTax, setShowAfterTax] = useState(true);
  const [activeTab, setActiveTab] = useState("input");

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleInput = (id, e) => {
    const cls = ASSET_CLASSES.find((c) => c.id === id);
    const max = cls.isUSD ? 100000 : 1000000000;
    setAssets((prev) => ({
      ...prev,
      [id]: Math.min(Number(e.target.value.replace(/\D/g, "")), max),
    }));
  };

  const handleStep = (id, dir) => {
    const cls = ASSET_CLASSES.find((c) => c.id === id);
    const step = cls.isUSD ? 100 : 1000000;
    const max = cls.isUSD ? 100000 : 1000000000;
    setAssets((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min((prev[id] || 0) + step * dir, max)),
    }));
  };

  const handleContribInput = (id, e) => {
    setMonthlyContribs((prev) => ({
      ...prev,
      [id]: Math.min(Number(e.target.value.replace(/\D/g, "")), 100000000),
    }));
  };

  const handleContribStep = (id, dir) => {
    const step = id === "usd" ? 10 : 100000;
    setMonthlyContribs((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + step * dir),
    }));
  };

  const applyTemplate = (t) => setAssets(t.values);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const totalAssets = useMemo(
    () =>
      Object.entries(assets).reduce((sum, [id, val]) => {
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        return sum + (cls.isUSD ? val * USD_RATE : val);
      }, 0),
    [assets]
  );

  const totalMonthlyContrib = useMemo(
    () =>
      Object.entries(monthlyContribs).reduce((sum, [id, val]) => {
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        return sum + (cls.isUSD ? val * USD_RATE : val);
      }, 0),
    [monthlyContribs]
  );

  const stats = useMemo(() => {
    if (totalAssets === 0)
      return { weightedGross: 0, weightedNet: 0, equityPct: 0, realReturn: 0 };
    let gross = 0,
      net = 0,
      equity = 0;
    ASSET_CLASSES.forEach((cls) => {
      const raw = assets[cls.id] || 0;
      const idr = cls.isUSD ? raw * USD_RATE : raw;
      const w = idr / totalAssets;
      gross += w * cls.return;
      net += w * afterTaxReturn(cls);
      if (cls.isEquity) equity += w * 100;
    });
    return {
      weightedGross: parseFloat(gross.toFixed(2)),
      weightedNet: parseFloat(net.toFixed(2)),
      equityPct: parseFloat(equity.toFixed(1)),
      realReturn: parseFloat((net - inflationRate).toFixed(2)),
    };
  }, [assets, totalAssets, inflationRate]);

  // Proyeksi: setiap aset dihitung terpisah (FV dengan kontribusi per aset)
  const chartData = useMemo(() => {
    const inf = inflationRate / 100;
    let infBase = totalAssets;
    const data = [];

    for (let y = 0; y <= PROJECTION_YEARS; y++) {
      let portTotal = 0;
      ASSET_CLASSES.forEach((cls) => {
        const init = cls.isUSD
          ? (assets[cls.id] || 0) * USD_RATE
          : assets[cls.id] || 0;
        const mc = cls.isUSD
          ? (monthlyContribs[cls.id] || 0) * USD_RATE
          : monthlyContribs[cls.id] || 0;
        const r = (showAfterTax ? afterTaxReturn(cls) : cls.return) / 100;
        const fvInit = init * Math.pow(1 + r, y);
        const fvMC =
          r > 0 ? (mc * 12 * (Math.pow(1 + r, y) - 1)) / r : mc * 12 * y;
        portTotal += fvInit + fvMC;
      });

      data.push({
        year: `Thn ${y}`,
        portfolio: Math.round(portTotal),
        inflation: Math.round(infBase),
        // Nilai Riil = daya beli nominal dalam "uang hari ini"
        real: Math.round(portTotal / Math.pow(1 + inf, y)),
      });

      infBase *= 1 + inf;
    }
    return data;
  }, [assets, monthlyContribs, inflationRate, showAfterTax, totalAssets]);

  const allocData = useMemo(
    () =>
      ASSET_CLASSES.map((cls) => {
        const raw = assets[cls.id] || 0;
        const idr = cls.isUSD ? raw * USD_RATE : raw;
        return {
          ...cls,
          idr,
          pct: totalAssets > 0 ? (idr / totalAssets) * 100 : 0,
        };
      }).filter((d) => d.idr > 0),
    [assets, totalAssets]
  );

  const worstCase = useMemo(() => {
    let port = totalAssets;
    ASSET_CLASSES.forEach((cls) => {
      if (cls.isEquity) {
        const idr = cls.isUSD
          ? (assets[cls.id] || 0) * USD_RATE
          : assets[cls.id] || 0;
        port += idr * -0.3;
      }
    });
    return Math.round(port);
  }, [assets, totalAssets]);

  const getRiskInfo = (eq) => {
    if (eq < 20) return { label: "Sangat Konservatif", color: "#3b82f6" };
    if (eq < 40) return { label: "Konservatif", color: "#10b981" };
    if (eq < 60) return { label: "Moderat", color: "#f59e0b" };
    if (eq < 80) return { label: "Agresif", color: "#f97316" };
    return { label: "Sangat Agresif", color: "#ef4444" };
  };
  const riskInfo = getRiskInfo(stats.equityPct);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: "'DM Sans','Segoe UI',sans-serif",
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:4px; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:15px; height:15px; border-radius:50%; cursor:pointer; border:2.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,.18); }
        .card  { background:#ffffff; border:1.5px solid #e2e8f0; border-radius:16px; overflow: hidden; }
        .card2 { background:#f1f5f9; border:1.5px solid #e2e8f0; border-radius:12px; }
        .stat  { background:#ffffff; border:1.5px solid #e2e8f0; border-radius:10px; padding:14px 16px; }
        .ifield { width:100%; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:9px 80px 9px 34px; color:#0f172a; font-family:'DM Sans',monospace; font-size:13px; font-weight:600; outline:none; transition:border-color .2s, background .2s; }
        .ifield:focus { border-color:#3b82f6; background:#fff; }
        .ifield-sm { width:100%; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:7px 60px 7px 30px; color:#0f172a; font-family:'DM Sans',monospace; font-size:12px; font-weight:600; outline:none; transition:border-color .2s, background .2s; }
        .ifield-sm:focus { border-color:#6366f1; background:#fff; }
        .stepbtn { width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border:1.5px solid #e2e8f0; color:#64748b; border-radius:6px; cursor:pointer; font-size:15px; transition:all .15s; }
        .stepbtn:hover { background:#e2e8f0; color:#0f172a; border-color:#cbd5e1; }
        .stepbtn-sm { width:22px; height:22px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; border:1.5px solid #e2e8f0; color:#64748b; border-radius:5px; cursor:pointer; font-size:13px; transition:all .15s; }
        .stepbtn-sm:hover { background:#e2e8f0; color:#0f172a; }
        .tab { padding:8px 18px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; border:none; transition:all .2s; background:transparent; color:#94a3b8; }
        .tab:hover { color:#475569; }
        .tab.on { background:#2563eb; color:#fff; box-shadow:0 2px 8px rgba(37,99,235,.22); }
        .tmplbtn { padding:11px 14px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; color:#475569; cursor:pointer; transition:all .2s; text-align:left; width:100%; }
        .tmplbtn:hover { border-color:#3b82f6; color:#1e40af; background:#eff6ff; }
        .glow-bar { position:absolute; top:0; left:0; right:0; height:4px; border-radius:16px 16px 0 0; }
        .warn { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:12px 16px; font-size:13px; color:#dc2626; display:flex; align-items:center; gap:10px; }
        .ok   { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:12px 16px; font-size:13px; color:#16a34a; display:flex; align-items:center; gap:10px; }
        .note { background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:12px 14px; font-size:11.5px; color:#1d4ed8; margin-top:10px; line-height:1.65; }
        .pgbar { background:#e2e8f0; border-radius:4px; height:6px; overflow:hidden; margin-top:6px; }
        .disc  { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; font-size:11px; color:#94a3b8; line-height:1.7; margin-top:20px; }
        .contrib-row { border-top:1px solid #f1f5f9; margin-top:10px; padding-top:10px; }
        .cl { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
        .tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* ── HEADER ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: ".15em",
                color: "#2563eb",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ● JEJAK HARTA V1.0
            </div>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 800,
                margin: 0,
                color: "#0f172a",
              }}
            >
              Peta Alokasi Aset Likuid
            </h1>
            <p
              style={{
                fontSize: 13,
                color: "#94a3b8",
                marginTop: 5,
                marginBottom: 0,
              }}
            >
              Return riil · Pajak · Kontribusi per aset · Stress test
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
              Total Aset (IDR)
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "DM Sans",
                color: "#16a34a",
              }}
            >
              {formatCompact(totalAssets)}
            </div>
            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>
              {formatIDR(totalAssets)}
            </div>
          </div>
        </div>

        {/* ── SUMMARY STATS ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))",
            gap: 10,
            marginBottom: 16,
          }}
        >
          {[
            {
              label: showAfterTax ? "Return After-Tax" : "Return Bruto",
              value: `${
                showAfterTax ? stats.weightedNet : stats.weightedGross
              }%`,
              sub: `Gross ${stats.weightedGross}% / Net ${stats.weightedNet}%`,
              color: "#2563eb",
            },
            {
              label: "Return Riil",
              value: `${stats.realReturn >= 0 ? "+" : ""}${stats.realReturn}%`,
              sub: `vs inflasi ${inflationRate}%/thn`,
              color: stats.realReturn >= 0 ? "#16a34a" : "#dc2626",
            },
            {
              label: "Equity Exposure",
              value: `${stats.equityPct}%`,
              sub: riskInfo.label,
              color: riskInfo.color,
            },
            {
              label: "Kontribusi/Bln",
              value: formatCompact(totalMonthlyContrib),
              sub: "semua aset digabung",
              color: "#7c3aed",
            },
            {
              label: "Stress Test (Bear)",
              value: formatCompact(worstCase),
              sub: "Ekuitas −30% crash scenario",
              color: "#d97706",
            },
          ].map((s, i) => (
            <div key={i} className="stat">
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                  marginBottom: 5,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  fontFamily: "DM Sans",
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── ALERT ── */}
        {totalAssets > 0 &&
          (stats.realReturn < 0 ? (
            <div className="warn" style={{ marginBottom: 14 }}>
              ⚠️ Return riil negatif ({stats.realReturn}%). Kekayaan Anda
              menyusut secara riil terhadap inflasi.
            </div>
          ) : (
            <div className="ok" style={{ marginBottom: 14 }}>
              ✅ Return riil positif (+{stats.realReturn}%). Kekayaan Anda
              tumbuh melampaui inflasi {inflationRate}%/tahun.
            </div>
          ))}

        {/* ── TABS ── */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 18,
            background: "#f1f5f9",
            border: "1.5px solid #e2e8f0",
            borderRadius: 10,
            padding: 4,
            width: "fit-content",
          }}
        >
          {[
            ["input", "⚙️ Input Aset"],
            ["projection", "📈 Proyeksi"],
            ["allocation", "🥧 Alokasi"],
          ].map(([id, lbl]) => (
            <button
              key={id}
              className={`tab ${activeTab === id ? "on" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════
            TAB: INPUT ASET
        ══════════════════════════════════════════════ */}
        {activeTab === "input" && (
          <div>
            {/* Templates */}
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 10,
                }}
              >
                Template Cepat
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 8,
                }}
              >
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className="tmplbtn"
                    onClick={() => applyTemplate(t)}
                  >
                    <div
                      style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}
                    >
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {t.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle after-tax */}
            <div className="note" style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={showAfterTax}
                  onChange={(e) => setShowAfterTax(e.target.checked)}
                />
                <strong>Proyeksi dengan return after-tax</strong>{" "}
                (rekomendasi:aktif) &nbsp;·&nbsp; PPh: Deposito/RD 20% · RD
                Obligasi 10% · Saham ~3%
              </label>
            </div>

            {/* Asset Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))",
                gap: 12,
              }}
            >
              {ASSET_CLASSES.map((cls) => {
                const raw = assets[cls.id] || 0;
                const idr = cls.isUSD ? raw * USD_RATE : raw;
                const pct =
                  totalAssets > 0 ? ((idr / totalAssets) * 100).toFixed(1) : 0;
                const netR = afterTaxReturn(cls).toFixed(1);
                const max = cls.isUSD ? 100000 : 1000000000;
                const step = cls.isUSD ? 100 : 1000000;
                const mc = monthlyContribs[cls.id] || 0;
                const contribMax = cls.isUSD ? 1000 : 10000000;
                const contribStep = cls.isUSD ? 10 : 50000;

                return (
                  <div
                    key={cls.id}
                    className="card"
                    style={{ padding: 16, position: "relative" }}
                  >
                    <div
                      className="glow-bar"
                      style={{ background: cls.color }}
                    />

                    {/* Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14,
                            color: "#0f172a",
                          }}
                        >
                          {cls.name}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            marginTop: 2,
                            lineHeight: 1.4,
                          }}
                        >
                          {cls.description}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "DM Sans",
                          fontWeight: 800,
                          fontSize: 16,
                          color: cls.color,
                          marginLeft: 8,
                        }}
                      >
                        {pct}%
                      </div>
                    </div>

                    {/* Tags */}
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginBottom: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className="tag"
                        style={{
                          background: `${cls.color}18`,
                          color: cls.color,
                        }}
                      >
                        Likuid: {cls.liquidity}
                      </span>
                      <span
                        className="tag"
                        style={{ background: "#f1f5f9", color: "#64748b" }}
                      >
                        Risiko: {cls.risk}
                      </span>
                    </div>

                    {/* ── NILAI ASET ── */}
                    <div className="cl">Nilai Aset</div>
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#94a3b8",
                          fontSize: 12,
                          fontFamily: "DM Sans",
                        }}
                      >
                        {cls.isUSD ? "$" : "Rp"}
                      </span>
                      <input
                        type="text"
                        className="ifield"
                        value={
                          raw === 0
                            ? ""
                            : new Intl.NumberFormat(
                                cls.isUSD ? "en-US" : "id-ID"
                              ).format(raw)
                        }
                        onChange={(e) => handleInput(cls.id, e)}
                        placeholder="0"
                      />
                      <div
                        style={{
                          position: "absolute",
                          right: 6,
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "flex",
                          gap: 4,
                        }}
                      >
                        <button
                          className="stepbtn"
                          onClick={() => handleStep(cls.id, -1)}
                        >
                          −
                        </button>
                        <button
                          className="stepbtn"
                          onClick={() => handleStep(cls.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Slider */}
                    <input
                      type="range"
                      min={0}
                      max={max}
                      step={step}
                      value={raw}
                      onChange={(e) =>
                        setAssets((prev) => ({
                          ...prev,
                          [cls.id]: Number(e.target.value),
                        }))
                      }
                      style={{
                        width: "100%",
                        accentColor: cls.color,
                        background: `linear-gradient(to right,${cls.color} ${
                          (raw / max) * 100
                        }%,#e2e8f0 0%)`,
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 9,
                        color: "#cbd5e1",
                        marginTop: 3,
                        fontFamily: "DM Sans",
                      }}
                    >
                      <span>0</span>
                      <span>{cls.isUSD ? "$100K" : "1M"}</span>
                    </div>

                    {/* ── KONTRIBUSI BULANAN ── */}
                    <div className="contrib-row">
                      <div className="cl" style={{ color: "#6366f1" }}>
                        + Kontribusi Rutin / Bulan
                      </div>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#94a3b8",
                            fontSize: 11,
                            fontFamily: "DM Sans",
                          }}
                        >
                          {cls.isUSD ? "$" : "Rp"}
                        </span>
                        <input
                          type="text"
                          className="ifield-sm"
                          value={
                            mc === 0
                              ? ""
                              : new Intl.NumberFormat(
                                  cls.isUSD ? "en-US" : "id-ID"
                                ).format(mc)
                          }
                          onChange={(e) => handleContribInput(cls.id, e)}
                          placeholder="0 (opsional)"
                        />
                        <div
                          style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            display: "flex",
                            gap: 3,
                          }}
                        >
                          <button
                            className="stepbtn-sm"
                            onClick={() => handleContribStep(cls.id, -1)}
                          >
                            −
                          </button>
                          <button
                            className="stepbtn-sm"
                            onClick={() => handleContribStep(cls.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {/* ---> TAMBAHKAN KODE SLIDER DI BAWAH INI <--- */}
                      <input
                        type="range"
                        min={0}
                        max={contribMax}
                        step={contribStep}
                        value={mc}
                        onChange={(e) =>
                          setMonthlyContribs((prev) => ({
                            ...prev,
                            [cls.id]: Number(e.target.value),
                          }))
                        }
                        style={{
                          width: "100%",
                          marginTop: 12, // Memberi jarak dari input text di atasnya
                          accentColor: cls.color,
                          background: `linear-gradient(to right,${cls.color} ${
                            (mc / contribMax) * 100
                          }%,#e2e8f0 0%)`,
                        }}
                      />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          color: "#cbd5e1",
                          marginTop: 3,
                          fontFamily: "DM Sans",
                        }}
                      >
                        <span>0</span>
                        <span>{cls.isUSD ? "$1K" : "10 Jt"}</span>
                      </div>
                      {/* ---> BATAS KODE SLIDER <--- */}
                    </div>

                    {/* Return info */}
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 6,
                        fontSize: 11,
                        borderTop: "1px solid #f1f5f9",
                        paddingTop: 8,
                      }}
                    >
                      <span>
                        <span style={{ color: "#94a3b8" }}>Gross: </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "DM Sans",
                            color: "#475569",
                          }}
                        >
                          {cls.return}%
                        </span>
                      </span>
                      <span>
                        <span style={{ color: "#94a3b8" }}>After-Tax: </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: "DM Sans",
                            color: "#16a34a",
                          }}
                        >
                          {netR}%
                        </span>
                      </span>
                      {cls.isUSD && idr > 0 && (
                        <span>
                          <span style={{ color: "#94a3b8" }}>≈ </span>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: "DM Sans",
                              color: "#d97706",
                            }}
                          >
                            {formatCompact(idr)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: PROYEKSI
        ══════════════════════════════════════════════ */}
        {activeTab === "projection" && (
          <div>
            {/* Settings */}
            <div className="card" style={{ padding: 16, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: ".1em",
                  marginBottom: 12,
                }}
              >
                Asumsi Proyeksi
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                  gap: 16,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Inflasi (% / tahun)
                  </label>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={0.5}
                      value={inflationRate}
                      onChange={(e) =>
                        setInflationRate(parseFloat(e.target.value))
                      }
                      style={{
                        flex: 1,
                        accentColor: "#ef4444",
                        background: `linear-gradient(to right,#ef4444 ${
                          ((inflationRate - 1) / 14) * 100
                        }%,#e2e8f0 0%)`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "DM Sans",
                        fontWeight: 800,
                        fontSize: 16,
                        color: "#ef4444",
                        minWidth: 42,
                      }}
                    >
                      {inflationRate}%
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    Historis Indonesia: 2–8%/tahun
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Kontribusi Bulanan Total
                  </label>
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#7c3aed",
                    }}
                  >
                    {formatCompact(totalMonthlyContrib)}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    Isi di tab "Input Aset" → tiap kartu aset. Proyeksi dihitung
                    per aset.
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Mode Return
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#475569",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showAfterTax}
                      onChange={(e) => setShowAfterTax(e.target.checked)}
                    />
                    After-tax (rekomendasi: aktif)
                  </label>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    Non-aktif = proyeksi menggunakan return bruto sebelum pajak
                  </div>
                </div>
                {/* ---> LETAKKAN KODE DI SINI, SEBAGAI ELEMEN KE-4 <--- */}
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Target Kekayaan (FIRE)
                  </label>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <input
                      type="text"
                      className="ifield-sm"
                      style={{ paddingLeft: 10, paddingRight: 10 }}
                      value={new Intl.NumberFormat("id-ID").format(fireTarget)}
                      onChange={(e) =>
                        setFireTarget(Number(e.target.value.replace(/\D/g, "")))
                      }
                    />
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    Garis acuan saat proyeksi menyentuh target.
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Proyeksi 10 Tahun
                  </h2>
                  <p
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                      margin: "4px 0 0",
                    }}
                  >
                    Nominal · Nilai Riil · Garis Inflasi
                  </p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="lg_portfolio"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#16a34a"
                        stopOpacity={0.15}
                      />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f1f5f9"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="year"
                    stroke="#cbd5e1"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={formatCompact}
                    stroke="#cbd5e1"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dx={-5}
                  />
                  <Tooltip
                    formatter={(v, name) => [formatIDR(v), name]}
                    contentStyle={{
                      background: "#fff",
                      border: "1.5px solid #e2e8f0",
                      borderRadius: 10,
                      color: "#0f172a",
                      fontSize: 13,
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="portfolio"
                    name="Portofolio Nominal"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#lg_portfolio)"
                  />
                  <Line
                    type="monotone"
                    dataKey="real"
                    name="Nilai Riil (Daya Beli)"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="inflation"
                    name="Garis Inflasi"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <ReferenceLine
                    y={fireTarget}
                    label={{
                      position: "top",
                      value: "Target FIRE",
                      fill: "#8b5cf6",
                      fontSize: 11,
                      fontWeight: "bold",
                    }}
                    stroke="#8b5cf6"
                    strokeDasharray="3 3"
                  />
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legenda penjelasan */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  {
                    color: "#16a34a",
                    label: "Portofolio Nominal",
                    desc: "Nilai rupiah portofolio di masa depan (belum dikoreksi inflasi).",
                  },
                  {
                    color: "#2563eb",
                    label: "Nilai Riil (Daya Beli)",
                    desc: 'Setara "uang sekarang". Ini yang benar-benar bisa kamu beli di masa depan.',
                  },
                  {
                    color: "#ef4444",
                    label: "Garis Inflasi",
                    desc: "Jika aset cuma mengikuti inflasi — tidak tumbuh, tidak menyusut secara riil.",
                  },
                ].map((g, i) => (
                  <div
                    key={i}
                    className="card2"
                    style={{ padding: "10px 12px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: g.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: g.color,
                        }}
                      >
                        {g.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#64748b",
                        lineHeight: 1.5,
                      }}
                    >
                      {g.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Year 10 summary */}
              {chartData.length > 0 &&
                (() => {
                  const last = chartData[chartData.length - 1];
                  return (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3,1fr)",
                        gap: 10,
                        marginTop: 12,
                      }}
                    >
                      {[
                        {
                          label: "Nominal (Thn 10)",
                          value: formatCompact(last.portfolio),
                          color: "#16a34a",
                        },
                        {
                          label: "Nilai Riil (Thn 10)",
                          value: formatCompact(last.real),
                          color: "#2563eb",
                        },
                        {
                          label: "Garis Inflasi (Thn 10)",
                          value: formatCompact(last.inflation),
                          color: "#ef4444",
                        },
                      ].map((s, i) => (
                        <div
                          key={i}
                          className="card2"
                          style={{ padding: "10px 14px" }}
                        >
                          <div
                            style={{
                              fontSize: 10,
                              color: "#94a3b8",
                              marginBottom: 4,
                            }}
                          >
                            {s.label}
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 15,
                              fontWeight: 800,
                              color: s.color,
                            }}
                          >
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>

            <div className="note">
              💡{" "}
              <strong>
                Kenapa "Nilai Riil" selalu lebih rendah dari nominal?
              </strong>
              <br />
              Karena inflasi menggerus daya beli uang seiring waktu. Contoh:
              portofolio nominal Rp 300Jt di tahun ke-10, dengan inflasi 5%/thn,
              setara hanya <em>~Rp 184Jt uang hari ini</em>. "Nilai Riil" itulah
              angka yang jujur — apakah kamu benar-benar menang melawan inflasi
              atau tidak?
              <br />
              <strong>Nilai Riil di atas Garis Inflasi</strong> = kamu
              benar-benar kaya secara riil. ✅
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: ALOKASI
        ══════════════════════════════════════════════ */}
        {activeTab === "allocation" && (
          <div>
            <div className="card" style={{ padding: 20 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  margin: "0 0 16px",
                  color: "#0f172a",
                }}
              >
                Distribusi Aset
              </h2>

              {allocData.length === 0 ? (
                <div
                  style={{ color: "#94a3b8", fontSize: 14, padding: "20px 0" }}
                >
                  Belum ada aset yang diinput.
                </div>
              ) : (
                [...allocData]
                  .sort((a, b) => b.pct - a.pct)
                  .map((d) => (
                    <div key={d.id} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 5,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: d.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#0f172a",
                            }}
                          >
                            {d.name}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 12,
                              color: "#94a3b8",
                            }}
                          >
                            {formatCompact(d.idr)}
                          </span>
                          <span
                            style={{
                              fontFamily: "DM Sans",
                              fontSize: 14,
                              fontWeight: 800,
                              color: d.color,
                              minWidth: 44,
                              textAlign: "right",
                            }}
                          >
                            {d.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="pgbar">
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 4,
                            background: d.color,
                            width: `${d.pct}%`,
                            transition: "width .4s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          marginTop: 4,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          Gross: {d.return}% → Net:{" "}
                          {afterTaxReturn(d).toFixed(1)}%
                        </span>
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>
                          Likuid: {d.liquidity} · {d.risk}
                        </span>
                        {(monthlyContribs[d.id] || 0) > 0 && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#7c3aed",
                              fontWeight: 700,
                              background: "#f5f3ff",
                              padding: "1px 7px",
                              borderRadius: 20,
                            }}
                          >
                            +
                            {d.isUSD
                              ? `$${new Intl.NumberFormat("en-US").format(
                                  monthlyContribs[d.id]
                                )}`
                              : formatCompact(monthlyContribs[d.id] || 0)}
                            /bln
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}

              {/* Breakdown */}
              <div
                style={{
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 16,
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 10,
                }}
              >
                {[
                  {
                    label: "Aset Defensif",
                    value: allocData
                      .filter((d) => !d.isEquity)
                      .reduce((s, d) => s + d.pct, 0),
                    color: "#2563eb",
                  },
                  {
                    label: "Aset Ekuitas",
                    value: allocData
                      .filter((d) => d.isEquity)
                      .reduce((s, d) => s + d.pct, 0),
                    color: "#f59e0b",
                  },
                  {
                    label: "Aset IDR",
                    value: allocData
                      .filter((d) => !d.isUSD)
                      .reduce((s, d) => s + d.pct, 0),
                    color: "#10b981",
                  },
                  {
                    label: "Aset USD",
                    value: allocData
                      .filter((d) => d.isUSD)
                      .reduce((s, d) => s + d.pct, 0),
                    color: "#059669",
                  },
                ].map((s, i) => (
                  <div key={i} className="stat">
                    <div
                      style={{
                        fontSize: 10,
                        color: "#94a3b8",
                        marginBottom: 4,
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 18,
                        fontWeight: 800,
                        color: s.color,
                      }}
                    >
                      {s.value.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DISCLAIMER ── */}
        <div className="disc">
          <strong>⚠️ Disclaimer:</strong> Kalkulator ini bersifat edukatif dan
          tidak merupakan saran investasi. Asumsi return bersifat historis dan
          tidak menjamin hasil masa depan. Return S&P 500 menggunakan rata-rata
          historis jangka panjang (~10.5%/thn dalam USD, sudah termasuk estimasi
          apresiasi kurs IDR). <strong>Emas:</strong> return bruto ~9%/thn
          (historis IDR), biaya efektif ~1.5%/thn sudah diperhitungkan dalam
          after-tax (mencakup spread fisik/digital 3.5–9% → ~1.25%/thn asumsi
          hold 5thn, + PPh buyback 1.5% ber-NPWP → ~0.3%/thn, + admin ~0.1%/thn;
          angka tengah fisik & digital). Konsultasikan keputusan investasi Anda
          dengan penasihat keuangan berlisensi.
        </div>
      </div>
    </div>
  );
}
