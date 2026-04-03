import React, { useState, useMemo, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
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

const parseExpression = (str) => {
  // Strip semua karakter selain angka, titik, koma, spasi, +, -
  const cleaned = str.replace(/[^\d+\-.,\s]/g, "").trim();
  if (!cleaned) return null;
  // Tokenize: pisahkan jadi angka dan operator, awali dengan + implisit
  const tokens = cleaned.match(/[+\-]?[\d.,\s]+/g);
  if (!tokens) return null;
  const result = tokens.reduce((sum, token) => {
    const num = Number(token.replace(/[.,\s]/g, ""));
    return isNaN(num) ? sum : sum + num;
  }, 0);
  return result >= 0 ? result : null;
};

const formatWhileTyping = (str) => {
  if (!str) return "";
  // Split by + atau -, tapi pertahankan operatornya sebagai separator
  const parts = str.split(/([+\-])/);
  return parts.map((part) => {
    // Kalau part adalah operator, kembalikan apa adanya
    if (part === "+" || part === "-") return part;
    // Kalau angka: strip non-digit dulu, lalu format
    const digits = part.replace(/\D/g, "");
    if (!digits) return part; // jaga spasi/string kosong
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  }).join("");
};

const afterTaxReturn = (cls) => {
  if (cls.id === "saham") return cls.return * 0.97;
  // Emas: kurangi biaya efektif tahunan 1.5% langsung dari return
  // (mencakup: spread fisik/digital ~1.25%/thn + PPh buyback ~0.30%/thn − buffer)
  if (cls.isGold) return cls.return - 1.5;
  if (cls.taxRate === 0) return cls.return;
  return cls.return * (1 - cls.taxRate);
};

// ─── DATA MIGRATION PIPELINE ──────────────────────────────────────────────────
const CURRENT_SCHEMA_VERSION = 1;

const migrateTemplates = (templates) => {
  return templates.map((t) => {
    let updated = { ...t };

    if (!updated.version || updated.version < 1) {
      updated.monthlyExpense = updated.monthlyExpense ?? 3000000;
      updated.targetMonths = updated.targetMonths ?? 6;
      updated.includeEmergencyInTotal =
        updated.includeEmergencyInTotal ?? false;
      updated.version = 1;
    }

    return updated;
  });
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function WealthTracker() {
  const [assets, setAssets] = useState({
    cash: 0,
    bankDigital: 0,
    rdpu: 0,
    rdo: 0,
    saham: 0,
    sp500: 0,
    usd: 0,
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

  const [rawInputs, setRawInputs] = useState({});
  const [rawContribs, setRawContribs] = useState({});

  const [inflationRate, setInflationRate] = useState(5.0);
  const [showAfterTax, setShowAfterTax] = useState(true);
  const [activeTab, setActiveTab] = useState("input");

  // ── State Option 2: Top Modal ──
  const [activeAssetIds, setActiveAssetIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState({ isOpen: false, title: "", type: null, targetId: null });

  const closeModal = () => setModalAction({ isOpen: false, title: "", type: null, targetId: null });

  const addAsset = (id) => {
    setActiveAssetIds((prev) => prev.includes(id) ? prev : [...prev, id]);
    // Auto-close if all assets are now active
    if (ASSET_CLASSES.filter((c) => !activeAssetIds.includes(c.id)).length <= 1) {
      setIsModalOpen(false);
    }
  };

  const removeAsset = (id) => {
    setActiveAssetIds((prev) => prev.filter((aid) => aid !== id));
    // Reset the asset value and contrib when removed
    setAssets((prev) => ({ ...prev, [id]: 0 }));
    setMonthlyContribs((prev) => ({ ...prev, [id]: 0 }));
  };
  // ── State Custom Templates (LocalStorage) ──
  const [userTemplates, setUserTemplates] = useState(() => {
    try {
      const saved = localStorage.getItem("wealth_templates");
      if (!saved) return [];

      const parsed = JSON.parse(saved);
      const migrated = migrateTemplates(parsed);

      localStorage.setItem("wealth_templates", JSON.stringify(migrated));
      return migrated;
    } catch (e) {
      console.error("Data template rusak, direset ke kosong.");
      return [];
    }
  });
  const [templateNameInput, setTemplateNameInput] = useState("");
  // INJEKSI STATE AKTIF
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  useEffect(() => {
    localStorage.setItem("wealth_templates", JSON.stringify(userTemplates));
  }, [userTemplates]);

  const saveNewTemplate = () => {
    const trimmedName = templateNameInput.trim();
    if (!trimmedName) return alert("Nama Profile wajib diisi.");
    if (userTemplates.length >= 3) return alert("Maksimal 3 profile. Hapus profile lama untuk membuat yang baru.");
    if (
      userTemplates.some(
        (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
      )
    ) {
      return alert("Nama template sudah digunakan.");
    }

    const newTemplate = {
      id: crypto.randomUUID(),
      name: trimmedName,
      assets: { ...assets },
      contribs: { ...monthlyContribs },
      activeIds: [...activeAssetIds],
      fireTarget: fireTarget,
      monthlyExpense: monthlyExpense,
      targetMonths: targetMonths,
      includeEmergencyInTotal: includeEmergencyInTotal,
      version: CURRENT_SCHEMA_VERSION, // INJEKSI VERSI BARU
      updatedAt: new Date().toISOString(),
    };
    setUserTemplates((prev) => [...prev, newTemplate]);
    setTemplateNameInput("");
    setActiveTemplateId(newTemplate.id); // SET AKTIF SAAT CREATE
  };

  const updateExistingTemplate = (id, e) => {
    e.stopPropagation();
    setModalAction({
      isOpen: true,
      title: "Update profile ini dengan angka di layar saat ini?",
      type: "update",
      targetId: id,
    });
  };

  const loadUserTemplate = (t) => {
    setAssets((prev) => ({ ...prev, ...t.assets }));
    setMonthlyContribs((prev) => ({ ...prev, ...(t.contribs || {}) }));
    // Fallback: jika profil lama tidak punya activeIds, derive dari nilai aset > 0
    setActiveAssetIds(
      t.activeIds ||
      Object.keys(t.assets || {}).filter((key) => (t.assets[key] || 0) > 0)
    );
    setFireTarget(t.fireTarget);
    setMonthlyExpense(t.monthlyExpense);
    setTargetMonths(t.targetMonths);
    setIncludeEmergencyInTotal(t.includeEmergencyInTotal);
    setActiveTemplateId(t.id);
  };

  const deleteTemplate = (id, e) => {
    e.stopPropagation();
    setModalAction({
      isOpen: true,
      title: "Hapus profile ini secara permanen? Tindakan ini tidak bisa dibatalkan.",
      type: "delete",
      targetId: id,
    });
  };

  // ── State Dana Darurat ──
  const [monthlyExpense, setMonthlyExpense] = useState(3000000);
  const [targetMonths, setTargetMonths] = useState(6);

  const [includeEmergencyInTotal, setIncludeEmergencyInTotal] = useState(false);

  const handleExpenseInput = (e) => {
    setMonthlyExpense(Number(e.target.value.replace(/\D/g, "")));
  };

  const handleExpenseStep = (dir) => {
    setMonthlyExpense((prev) => Math.max(0, prev + 50000 * dir));
  };

  // Tiering Allocation sesuai kode referensimu
  const t1Months = 1; // 1 month in physical bank
  const t2Months = 2; // 2 months in digital bank
  const t3Months =
    targetMonths - t1Months - t2Months > 0
      ? targetMonths - t1Months - t2Months
      : 0; // Rest in RDPU

  const effectiveAssets = useMemo(() => {
    // Jika tidak diceklis, kembalikan data aset input murni
    if (!includeEmergencyInTotal) return assets;

    // Jika diceklis, gabungkan dengan target dana darurat
    return {
      ...assets,
      cash: (assets.cash || 0) + monthlyExpense * t1Months,
      bankDigital: (assets.bankDigital || 0) + monthlyExpense * t2Months,
      rdpu: (assets.rdpu || 0) + monthlyExpense * t3Months,
    };
  }, [
    assets,
    monthlyExpense,
    t1Months,
    t2Months,
    t3Months,
    includeEmergencyInTotal,
  ]);

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
    const step = cls.isUSD ? 50 : 50000;
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
    const cls = ASSET_CLASSES.find((c) => c.id === id);
    const step = cls.isUSD ? 50 : 50000;
    setMonthlyContribs((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + step * dir),
    }));
  };

  const applyTemplate = (t) => setAssets(t.values);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const totalAssets = useMemo(
    () =>
      Object.entries(effectiveAssets).reduce((sum, [id, val]) => {
        // <-- UBAH DI SINI
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        return sum + (cls.isUSD ? val * USD_RATE : val);
      }, 0),
    [effectiveAssets] // <-- UBAH DI SINI
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
      const raw = effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
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
  }, [effectiveAssets, totalAssets, inflationRate]); // <-- UBAH DI SINI

  // Proyeksi: setiap aset dihitung terpisah (FV dengan kontribusi per aset)
  const chartData = useMemo(() => {
    const inf = inflationRate / 100;
    let infBase = totalAssets;
    const data = [];

    for (let y = 0; y <= PROJECTION_YEARS; y++) {
      let portTotal = 0;
      ASSET_CLASSES.forEach((cls) => {
        const init = cls.isUSD
          ? (effectiveAssets[cls.id] || 0) * USD_RATE // <-- UBAH DI SINI
          : effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
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
        real: Math.round(portTotal / Math.pow(1 + inf, y)),
      });

      infBase *= 1 + inf;
    }
    return data;
  }, [
    effectiveAssets,
    monthlyContribs,
    inflationRate,
    showAfterTax,
    totalAssets,
  ]); // <-- UBAH DI SINI

  const allocData = useMemo(
    () =>
      ASSET_CLASSES.map((cls) => {
        const raw = effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
        const idr = cls.isUSD ? raw * USD_RATE : raw;
        return {
          ...cls,
          idr,
          pct: totalAssets > 0 ? (idr / totalAssets) * 100 : 0,
        };
      }).filter((d) => d.idr > 0),
    [effectiveAssets, totalAssets] // <-- UBAH DI SINI
  );

  const worstCase = useMemo(() => {
    let port = totalAssets;
    ASSET_CLASSES.forEach((cls) => {
      if (cls.isEquity) {
        const idr = cls.isUSD
          ? (effectiveAssets[cls.id] || 0) * USD_RATE // <-- UBAH DI SINI
          : effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
        port += idr * -0.3;
      }
    });
    return Math.round(port);
  }, [effectiveAssets, totalAssets]); // <-- UBAH DI SINI

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
        .glow-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; }
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
        .warn { background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:12px 16px; font-size:13px; color:#dc2626; display:flex; align-items:center; gap:10px; }
        .ok   { background:#f0fdf4; border:1.5px solid #bbf7d0; border-radius:10px; padding:12px 16px; font-size:13px; color:#16a34a; display:flex; align-items:center; gap:10px; }
        .note { background:#eff6ff; border:1.5px solid #bfdbfe; border-radius:10px; padding:12px 14px; font-size:11.5px; color:#1d4ed8; margin-top:10px; line-height:1.65; }
        .pgbar { background:#e2e8f0; border-radius:4px; height:6px; overflow:hidden; margin-top:6px; }
        .disc  { background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:12px; padding:16px; font-size:11px; color:#94a3b8; line-height:1.7; margin-top:20px; }
        .contrib-row { border-top:1px solid #f1f5f9; margin-top:10px; padding-top:10px; }
        .cl { font-size:10px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
        .tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
        .asset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
@media (max-width:640px) { .asset-grid { grid-template-columns:1fr; } }
@media (min-width:641px) and (max-width:1023px) { .asset-grid { grid-template-columns:repeat(2,1fr); } }
.fab { display:none; }
@media (max-width:768px) {
.desktop-only { display: none !important; }
  .fab {
    display:flex;
    padding:8px 16px;
    align-items:center;
    justify-content:center;
    position:fixed;
    bottom:88px;
    right:20px;
    z-index:1000;
    width:auto;
    height:auto;
    border-radius:999px;
    background:linear-gradient(135deg,#2563eb,#4f46e5);
    border:none;
    cursor:pointer;
    font-size:16px;
    font-family: 'DM Sans', sans-serif;
    fontWeight: 700;
    color:#fff;
    transition:transform .15s;
    box-shadow:0 12px 32px rgba(0,0,0,.08);
  }
  .fab:active { transform:scale(0.93); }
  .tab-bar-sticky {
    position:fixed;
bottom:20px; left:16px; right:16px;
    z-index:999;
background:rgba(255, 255, 255, 0.9); /* Sedikit transparan */
    backdrop-filter: blur(12px); /* Efek kaca (Glassmorphism) modern */
    border:1.5px solid rgba(226, 232, 240, 0.8); /* Border tipis keliling */
    border-radius:24px; /* Bentuk kapsul (Pill) */
    display:flex;
    padding:8px;
    gap:4px;
box-shadow:0 12px 32px rgba(0,0,0,.08);
  }
  .tab-bar-sticky .tab { flex:1; text-align:center; font-size:11px; padding:10px 4px; border-radius: 16px; }
  .mobile-bottom-spacer { height:80px; }
}
@media (min-width:769px) { .tab-bar-sticky { display:none !important; } .mobile-bottom-spacer { display:none; } }
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
              Peta Alokasi Hartamu
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
              value: `${showAfterTax ? stats.weightedNet : stats.weightedGross}%`,
              sub: `Gross ${stats.weightedGross}% / Net ${stats.weightedNet}%`,
              color: "#2563eb",
              tip: "Return portofolio setelah dipotong pajak (PPh final). Lebih realistis dari return bruto.",
            },
            {
              label: "Return Riil",
              value: `${stats.realReturn >= 0 ? "+" : ""}${stats.realReturn}%`,
              sub: `vs inflasi ${inflationRate}%/thn`,
              color: stats.realReturn >= 0 ? "#16a34a" : "#dc2626",
              tip: "Return setelah dikurangi inflasi. Angka positif berarti daya beli kamu tumbuh nyata.",
            },
            {
              label: "Equity Exposure",
              value: `${stats.equityPct}%`,
              sub: riskInfo.label,
              color: riskInfo.color,
              tip: "Persentase portofolio di aset berisiko tinggi (saham). Makin tinggi, makin volatil nilainya.",
            },
            {
              label: "Kontribusi/Bln",
              value: formatCompact(totalMonthlyContrib),
              sub: "semua aset digabung",
              color: "#7c3aed",
              tip: "Total uang baru yang kamu setorkan ke semua instrumen setiap bulan.",
            },
            {
              label: "Stress Test (Bear)",
              value: formatCompact(worstCase),
              sub: "Ekuitas −30% crash scenario",
              color: "#d97706",
              tip: "Simulasi crash pasar: semua aset ekuitas turun 30% sekaligus. Ini nilai portofoliomu di skenario terburuk.",
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
                {s.tip
                  ? <Tooltip text={s.tip}>{s.label}</Tooltip>
                  : s.label}
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

        {/* ── PROFILE ALOKASI KAMU (global, selalu tampil) ── */}
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
            Profile Alokasi Kamu
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "nowrap",
              gap: 10,
              alignItems: "stretch",
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {userTemplates.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 12px",
                  gap: 12,
                  cursor: "pointer",
                  border:
                    activeTemplateId === t.id
                      ? "1.5px solid #3b82f6"
                      : "1.5px solid #e2e8f0",
                  backgroundColor:
                    activeTemplateId === t.id ? "#eff6ff" : "#fff",
                  borderRadius: 10,
                  transition: "all 0.2s",
                }}
                onClick={() => loadUserTemplate(t)}
                onMouseOver={(e) => {
                  if (activeTemplateId !== t.id)
                    e.currentTarget.style.borderColor = "#3b82f6";
                }}
                onMouseOut={(e) => {
                  if (activeTemplateId !== t.id)
                    e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 100,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {t.name}
                  </span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {" "}
                    {new Date(t.updatedAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    borderLeft: "1.5px solid #f1f5f9",
                    paddingLeft: 10,
                  }}
                >
                  <button
                    onClick={(e) => updateExistingTemplate(t.id, e)}
                    style={{
                      background: "#f1f5f9",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 6px",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                    title="Timpa template ini"
                  >
                    🔄
                  </button>
                  <button
                    onClick={(e) => deleteTemplate(t.id, e)}
                    style={{
                      background: "#fef2f2",
                      color: "#ef4444",
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 6px",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: "bold",
                    }}
                    title="Hapus"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {userTemplates.length < 3 ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#f8fafc",
                  padding: 6,
                  borderRadius: 10,
                  border: "1.5px dashed #cbd5e1",
                  flexShrink: 0,
                }}
              >
                <input
                  type="text"
                  style={{
                    width: 140,
                    padding: "8px 12px",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                  placeholder="Nama Profile..."
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNewTemplate();
                  }}
                />
                <button
                  className="tab on"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 8,
                    height: "100%",
                  }}
                  onClick={saveNewTemplate}
                >
                  + Add
                </button>
              </div>
            ) : (
              <div
                title="Hapus salah satu profile untuk membuat yang baru"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1.5px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                  userSelect: "none",
                  cursor: "default",
                  letterSpacing: ".02em",
                }}
              >
                <span style={{ fontSize: 14 }}>🔒</span>
                <span>3 / 3</span>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div
          className="desktop-only"
          style={{
            display: "flex", /* KEMBALIKAN INI */
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

            {/* ── OPTION 2: TOP MODAL — Action Header ── */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                {activeAssetIds.length > 0
                  ? `${activeAssetIds.length} instrumen aktif`
                  : "Belum ada instrumen dipilih"}
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={activeAssetIds.length >= ASSET_CLASSES.length}
                className="desktop-only"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: activeAssetIds.length >= ASSET_CLASSES.length ? "not-allowed" : "pointer",
                  background: activeAssetIds.length >= ASSET_CLASSES.length ? "#f1f5f9" : "linear-gradient(135deg,#2563eb,#4f46e5)",
                  color: activeAssetIds.length >= ASSET_CLASSES.length ? "#94a3b8" : "#fff",
                  boxShadow: activeAssetIds.length >= ASSET_CLASSES.length ? "none" : "0 4px 14px rgba(37,99,235,.35)",
                  transition: "all .2s",
                  fontFamily: "'DM Sans',sans-serif",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
                Tambah Instrumen Baru
              </button>
            </div>

            {/* ── EMPTY STATE ── */}
            {activeAssetIds.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 320,
                  background: "linear-gradient(135deg,#f8fafc 0%,#eff6ff 100%)",
                  border: "2px dashed #bfdbfe",
                  borderRadius: 20,
                  padding: "48px 24px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 16 }}>🏦</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#1e3a8a",
                    marginBottom: 8,
                    lineHeight: 1.35,
                  }}
                >
                  Harta yang tak tercatat,
                  <br />
                  <span style={{ color: "#2563eb" }}>adalah harta yang tak terjaga.</span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#94a3b8",
                    marginBottom: 28,
                    maxWidth: 360,
                    lineHeight: 1.6,
                  }}
                >
                  Mulai lacak portofoliomu. Pilih instrumen investasi yang kamu miliki dan simulasikan pertumbuhannya.
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 28px",
                    borderRadius: 999,
                    border: "none",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    background: "linear-gradient(135deg,#2563eb,#4f46e5)",
                    color: "#fff",
                    boxShadow: "0 6px 20px rgba(37,99,235,.40)",
                    fontFamily: "'DM Sans',sans-serif",
                    transition: "transform .15s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>＋</span>
                  Tambah Instrumen Pertamamu
                </button>
              </div>
            ) : (
              /* ── ACTIVE ASSET CARDS GRID ── */
              <div className="asset-grid">
                {ASSET_CLASSES.filter((cls) => activeAssetIds.includes(cls.id)).map((cls) => {
                  const raw = assets[cls.id] || 0;
                  const idr = cls.isUSD ? raw * USD_RATE : raw;
                  const pct =
                    totalAssets > 0 ? ((idr / totalAssets) * 100).toFixed(1) : 0;
                  const netR = afterTaxReturn(cls).toFixed(1);
                  const mc = monthlyContribs[cls.id] || 0;

                  return (
                    <div
                      key={cls.id}
                      className="card"
                      style={{
                        padding: 16,
                        borderTop: `6px solid ${cls.color}`,
                        position: "relative",
                      }}
                    >

                      {/* Header */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ flex: 1, paddingRight: 12 }}>
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
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Sans",
                              fontWeight: 800,
                              fontSize: 16,
                              color: cls.color,
                            }}
                          >
                            {pct}%
                          </span>
                          <button
                            onClick={() => removeAsset(cls.id)}
                            title={`Hapus ${cls.name}`}
                            className="p-1 hover:text-red-500 transition-colors rounded-md"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#94a3b8",
                              lineHeight: 1,
                              fontSize: 20,
                            }}
                          >
                            ✕
                          </button>
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
                          value={rawInputs[cls.id] !== undefined
                            ? rawInputs[cls.id]
                            : raw === 0 ? "" : new Intl.NumberFormat(cls.isUSD ? "en-US" : "id-ID").format(raw)
                          }
                          onChange={(e) => {
                            const formatted = formatWhileTyping(e.target.value);
                            setRawInputs((prev) => ({ ...prev, [cls.id]: formatted }));
                          }}
                          onBlur={(e) => {
                            const result = parseExpression(e.target.value);
                            if (result !== null) {
                              const cls2 = ASSET_CLASSES.find((c) => c.id === cls.id);
                              const max = cls2.isUSD ? 100000 : 1000000000;
                              setAssets((prev) => ({ ...prev, [cls.id]: Math.min(result, max) }));
                            }
                            setRawInputs((prev) => { const n = { ...prev }; delete n[cls.id]; return n; });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.target.blur();
                          }}
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
                            value={rawContribs[cls.id] !== undefined
                              ? rawContribs[cls.id]
                              : mc === 0 ? "" : new Intl.NumberFormat(cls.isUSD ? "en-US" : "id-ID").format(mc)
                            }
                            onChange={(e) => {
                              const formatted = formatWhileTyping(e.target.value);
                              setRawContribs((prev) => ({ ...prev, [cls.id]: formatted }));
                            }}
                            onBlur={(e) => {
                              const result = parseExpression(e.target.value);
                              if (result !== null) {
                                setMonthlyContribs((prev) => ({ ...prev, [cls.id]: Math.min(result, 100000000) }));
                              }
                              setRawContribs((prev) => { const n = { ...prev }; delete n[cls.id]; return n; });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                            }}
                            placeholder="0"
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
            )}

            {/* ── MODAL OVERLAY: KATALOG INSTRUMEN ── */}
            {isModalOpen && (
              <div
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,23,42,0.55)",
                  backdropFilter: "blur(4px)",
                  zIndex: 200,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: "#fff",
                    borderRadius: 20,
                    boxShadow: "0 24px 80px rgba(0,0,0,.22)",
                    width: "100%",
                    maxWidth: 820,
                    maxHeight: "85vh",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  {/* Modal Header */}
                  <div
                    style={{
                      padding: "20px 24px",
                      borderBottom: "1.5px solid #f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          color: "#0f172a",
                          marginBottom: 3,
                        }}
                      >
                        📦 Katalog Instrumen Investasi
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8" }}>
                        Pilih instrumen untuk ditambahkan ke simulasi portofoliomu.
                      </div>
                    </div>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        border: "1.5px solid #e2e8f0",
                        background: "#f8fafc",
                        color: "#64748b",
                        fontSize: 16,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all .15s",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                        e.currentTarget.style.color = "#ef4444";
                        e.currentTarget.style.borderColor = "#fca5a5";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "#f8fafc";
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "#e2e8f0";
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div
                    style={{
                      padding: 20,
                      overflowY: "auto",
                      background: "#f8fafc",
                      flexGrow: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                        gap: 12,
                      }}
                    >
                      {ASSET_CLASSES.filter((cls) => !activeAssetIds.includes(cls.id)).map((cls) => (
                        <div
                          key={cls.id}
                          onClick={() => addAsset(cls.id)}
                          style={{
                            background: "#fff",
                            border: "1.5px solid #e2e8f0",
                            borderTop: `4px solid ${cls.color}`,
                            borderRadius: 14,
                            padding: "14px 16px",
                            cursor: "pointer",
                            transition: "all .18s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = cls.color;
                            e.currentTarget.style.boxShadow = `0 4px 16px ${cls.color}28`;
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = "#e2e8f0";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.borderTopColor = cls.color;
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 6,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: "#0f172a",
                              }}
                            >
                              {cls.name}
                            </div>
                            <div
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: `${cls.color}18`,
                                color: cls.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              +
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#94a3b8",
                              lineHeight: 1.45,
                              marginBottom: 10,
                            }}
                          >
                            {cls.description}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <span
                              className="tag"
                              style={{ background: `${cls.color}14`, color: cls.color }}
                            >
                              {cls.liquidity}
                            </span>
                            <span
                              className="tag"
                              style={{ background: "#f1f5f9", color: "#475569" }}
                            >
                              {cls.risk}
                            </span>
                            <span
                              className="tag"
                              style={{ background: "#f0fdf4", color: "#16a34a" }}
                            >
                              {cls.return}% gross
                            </span>
                          </div>
                        </div>
                      ))}
                      {ASSET_CLASSES.filter((cls) => !activeAssetIds.includes(cls.id)).length === 0 && (
                        <div
                          style={{
                            gridColumn: "1/-1",
                            textAlign: "center",
                            padding: 40,
                            color: "#94a3b8",
                            fontSize: 13,
                          }}
                        >
                          ✅ Semua instrumen sudah aktif di portofoliomu!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                        background: `linear-gradient(to right,#ef4444 ${((inflationRate - 1) / 14) * 100
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
                    Target Kekayaan
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
                      value: "Target",
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

        {/* ══════════════════════════════════════════════
            MODUL DANA DARURAT (DEFENSIF)
        ══════════════════════════════════════════════ */}
        <hr
          style={{
            border: 0,
            borderTop: "1.5px dashed #cbd5e1",
            margin: "32px 0",
          }}
        />

        <div style={{ marginBottom: 24 }}>
          {/* PARENT HEADER: RATA KANAN-KIRI (Flex Space-Between) */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Kalkulator Dana Darurat
            </h2>

            {/* TOGGLE PENGGABUNGAN ASET */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                id="toggleEmergency"
                checked={includeEmergencyInTotal}
                onChange={(e) => setIncludeEmergencyInTotal(e.target.checked)}
                style={{
                  width: 15,
                  height: 15,
                  accentColor: "#6366f1",
                  cursor: "pointer",
                  margin: 0,
                }}
              />
              <label
                htmlFor="toggleEmergency"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#475569",
                  cursor: "pointer",
                  fontFamily: "DM Sans",
                }}
              >
                Gabungkan Target ke Total Aset & Proyeksi
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* BARIS 1: INPUT KALKULATOR (1x3 Span) */}
            <div className="card" style={{ padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
                  gap: 20,
                }}
              >
                {/* Kolom 1: Pengeluaran Bulanan */}
                <div>
                  <div className="cl">Pengeluaran Bulanan</div>
                  <div style={{ position: "relative", marginTop: 4 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        fontSize: 13,
                        fontFamily: "DM Sans",
                      }}
                    >
                      Rp
                    </span>
                    <input
                      type="text"
                      className="ifield"
                      value={
                        monthlyExpense === 0
                          ? ""
                          : new Intl.NumberFormat("id-ID").format(
                            monthlyExpense
                          )
                      }
                      onChange={handleExpenseInput}
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
                        onClick={() => handleExpenseStep(-1)}
                      >
                        −
                      </button>
                      <button
                        className="stepbtn"
                        onClick={() => handleExpenseStep(1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                    Kelipatan Rp 50.000
                  </div>
                </div>

                {/* Kolom 2: Slider Target */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    className="cl"
                    style={{ width: "100%", textAlign: "center" }}
                  >
                    Target Dana Darurat
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      width: "100%",
                      marginTop: 12,
                    }}
                  >
                    <input
                      type="range"
                      min={3}
                      max={12}
                      step={1}
                      value={targetMonths}
                      onChange={(e) => setTargetMonths(Number(e.target.value))}
                      style={{
                        flex: 1,
                        accentColor: "#6366f1",
                        background: `linear-gradient(to right,#6366f1 ${((targetMonths - 3) / 9) * 100
                          }%,#e2e8f0 0%)`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "DM Sans",
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#6366f1",
                        minWidth: 55,
                        textAlign: "right",
                      }}
                    >
                      {targetMonths} Bln
                    </span>
                  </div>
                </div>

                {/* Kolom 3: Total Kebutuhan (Rata Kanan) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    textAlign: "right",
                  }}
                >
                  <div className="cl">Total Kebutuhan</div>
                  <div
                    style={{
                      fontFamily: "DM Sans",
                      fontSize: 26,
                      fontWeight: 800,
                      color: "#0f172a",
                      marginTop: 4,
                    }}
                  >
                    {formatCompact(monthlyExpense * targetMonths)}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                    {formatIDR(monthlyExpense * targetMonths)}
                  </div>
                </div>
              </div>
            </div>

            {/* BARIS 2: TIERING CARDS (Non-editable) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
                gap: 12,
              }}
            >
              {/* Card Lapis 1: Cash/Bank */}
              <div
                className="card"
                style={{ padding: "16px 20px", borderTop: "6px solid #3b82f6" }}
              >
                <div
                  style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}
                >
                  Lapis 1 ({t1Months} Bulan) - Cash / Bank
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: "6px 0",
                  }}
                >
                  {formatIDR(monthlyExpense * t1Months)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Untuk likuiditas instan H-0. Hindari instrumen fluktuatif.
                </div>
              </div>

              {/* Card Lapis 2: Bank Digital */}
              <div
                className="card"
                style={{ padding: "16px 20px", borderTop: "6px solid #06b6d4" }}
              >
                <div
                  style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}
                >
                  Lapis 2 ({t2Months} Bulan) - Bank Digital
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: "6px 0",
                  }}
                >
                  {formatIDR(monthlyExpense * t2Months)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Likuiditas tinggi dengan yield lebih baik dari bank
                  konvensional.
                </div>
              </div>

              {/* Card Lapis 3: RDPU */}
              <div
                className="card"
                style={{ padding: "16px 20px", borderTop: "6px solid #10b981" }}
              >
                <div
                  style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}
                >
                  Lapis 3 ({t3Months} Bulan) - RDPU
                </div>
                <div
                  style={{
                    fontFamily: "DM Sans",
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#0f172a",
                    margin: "6px 0",
                  }}
                >
                  {formatIDR(monthlyExpense * t3Months)}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Pelindung nilai dari inflasi. Pencairan memakan waktu 1-3 hari
                  kerja.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mobile-bottom-spacer" />

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

        {/* ── MOBILE FAB ── */}
        {activeTab === "input" && (
          <button
            className="fab"
            onClick={() => setIsModalOpen(true)}
            disabled={activeAssetIds.length >= ASSET_CLASSES.length}
            title="Tambah Instrumen"
          >
            + Instrumen baru
          </button>
        )}

        {/* ── MOBILE STICKY TAB BAR ── */}
        <div className="tab-bar-sticky">
          {[
            ["input", "⚙️", "Input"],
            ["projection", "📈", "Proyeksi"],
            ["allocation", "🥧", "Alokasi"],
          ].map(([id, icon, lbl]) => (
            <button
              key={id}
              className={`tab ${activeTab === id ? "on" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              {icon} {lbl}
            </button>
          ))}
        </div>

        <Analytics />

        {/* ── CONFIRM DIALOG MODAL ── */}
        {modalAction.isOpen && (
          <div
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(4px)",
              padding: "16px"
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: "#fff",
                borderRadius: "16px",
                boxShadow: "0 24px 50px rgba(0,0,0,0.2)",
                width: "100%",
                maxWidth: "360px",
                padding: "24px",
                textAlign: "center"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>
                {modalAction.type === "delete" ? "🗑️" : "🔄"}
              </div>
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", lineHeight: 1.65, marginBottom: "22px", fontFamily: "'DM Sans',sans-serif" }}>
                {modalAction.title}
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={() => {
                    if (modalAction.type === "delete") {
                      setUserTemplates((prev) => prev.filter((t) => t.id !== modalAction.targetId));
                      if (activeTemplateId === modalAction.targetId) setActiveTemplateId(null);
                    } else if (modalAction.type === "update") {
                      setUserTemplates((prev) =>
                        prev.map((t) => {
                          if (t.id === modalAction.targetId) {
                            return {
                              ...t, assets: { ...assets }, contribs: { ...monthlyContribs },
                              activeIds: [...activeAssetIds], fireTarget, monthlyExpense,
                              targetMonths, includeEmergencyInTotal, updatedAt: new Date().toISOString(),
                            };
                          }
                          return t;
                        })
                      );
                    }
                    closeModal();
                  }}
                  style={{
                    padding: "9px 22px", borderRadius: "8px", border: "none",
                    background: modalAction.type === "delete" ? "#ef4444" : "linear-gradient(135deg,#2563eb,#4f46e5)",
                    color: "#fff", fontWeight: 700, fontSize: "13px",
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
                    boxShadow: modalAction.type === "delete" ? "0 4px 12px rgba(239,68,68,.35)" : "0 4px 12px rgba(37,99,235,.35)"
                  }}
                >
                  {modalAction.type === "delete" ? "🗑️ Hapus" : "🔄 Ya, Update"}
                </button>
                <button
                  onClick={closeModal}
                  style={{
                    padding: "9px 22px", borderRadius: "8px", border: "1.5px solid #e2e8f0",
                    background: "#f1f5f9", color: "#475569", fontWeight: 700, fontSize: "13px",
                    cursor: "pointer", fontFamily: "'DM Sans',sans-serif"
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
