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
import InputTab from "./components/InputTab";
import ProjectionTab from "./components/ProjectionTab";
import AllocationTab from "./components/AllocationTab";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const USD_RATE = 16900;

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const tokens = {
  colors: {
    surface: {
      app: '#F8FAFC',
      card: '#FFFFFF',
      input: '#F1F5F9',
      active: '#E2E8F0',
    },
    overlay: 'rgba(15, 23, 42, 0.6)',
    border: {
      subtle: '#E2E8F0',
      input: '#CBD5E1',
      active: '#0F172A',
    },
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      tertiary: '#94A3B8',
    },
    semantic: {
      success: '#10B981',
      danger: '#EF4444',
      warning: '#F59E0B',
      brand: '#0F172A',
      successBg: '#F0FDF4',
      dangerBg: '#FEF2F2',
      successBorder: '#BBF7D0',
      dangerBorder: '#FECACA',
    },
    dataViz: {
      cash: '#14B8A6',
      digitalBank: '#0EA5E9',
      rdpu: '#8B5CF6',
      bonds: '#6366F1',
      localStocks: '#F43F5E',
      sp500: '#3B82F6',
      usd: '#10B981',
      gold: '#EAB308',
      rdSaham: '#fb7185',
    },
  },
  shadows: {
    soft: "0 4px 12px rgba(15, 23, 42, 0.08)",
    medium: "0 8px 24px rgba(15, 23, 42, 0.12)",
    strong: "0 12px 32px rgba(15, 23, 42, 0.18)",
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: { fontSize: '48px', fontWeight: 700, lineHeight: '1.1', letterSpacing: '-0.02em' },
    h1: { fontSize: '32px', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em' },
    h2: { fontSize: '24px', fontWeight: 600, lineHeight: '1.3', letterSpacing: '0' },
    eyebrow: { fontSize: '12px', fontWeight: 700, lineHeight: '1.4', letterSpacing: '0.05em', textTransform: 'uppercase' },
    bodyRegular: { fontSize: '16px', fontWeight: 400, lineHeight: '1.5', letterSpacing: '0' },
    bodyBold: { fontSize: '16px', fontWeight: 600, lineHeight: '1.5', letterSpacing: '0' },
    interactive: { fontSize: '14px', fontWeight: 600, lineHeight: '1.2', letterSpacing: '0' },
  },
};

const ASSET_CLASSES = [
  {
    id: "cash",
    name: "Cash / Bank",
    return: 1.0,
    color: tokens.colors.dataViz.cash,
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
    color: tokens.colors.dataViz.digitalBank,
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
    color: tokens.colors.dataViz.rdpu,
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
    color: tokens.colors.dataViz.bonds,
    isEquity: false,
    isUSD: false,
    taxRate: 0.1,
    liquidity: "T+2",
    risk: "Rendah–Sedang",
    description: "Reksa dana obligasi. Return lebih tinggi, sedikit fluktuasi.",
  },
  {
    id: "rdSaham",
    name: "Reksadana Saham",
    return: 11.0,
    color: tokens.colors.dataViz.rdSaham,
    isEquity: true,
    isUSD: false,
    taxRate: 0,
    liquidity: "T+3",
    risk: "Tinggi",
    description:
      "Kumpulan saham pilihan yang dikelola oleh Manajer Investasi profesional. Diversifikasi tinggi, potensi return jangka panjang.",
  },
  {
    id: "saham",
    name: "Saham IDX",
    return: 12.0,
    color: tokens.colors.dataViz.localStocks,
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
    color: tokens.colors.dataViz.sp500,
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
    color: tokens.colors.dataViz.usd,
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
    color: tokens.colors.dataViz.gold,
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
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(1)}M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(1)}Jt`;
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
};

const parseExpression = (str) => {
  // Strip semua karakter selain angka, titik, koma, spasi, +, -
  const cleaned = str.replace(/[^\d+\-.,\s]/g, "").trim();
  if (!cleaned) return null;
  // Tokenize: pisahkan jadi angka dan operator, awali dengan + implisit
  const tokenMatches = cleaned.match(/[+\-]?[\d.,\s]+/g);
  if (!tokenMatches) return null;
  const result = tokenMatches.reduce((sum, token) => {
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
    rdSaham: 0,
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
    rdSaham: 0,
  });

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
    if (!trimmedName) return alert("Nama Profil wajib diisi.");
    if (userTemplates.length >= 3) return alert("Maksimal 3 profil. Hapus profil lama untuk membuat yang baru.");
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
      title: "Update profil ini dengan angka di layar saat ini?",
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
      title: "Hapus profil ini secara permanen? Tindakan ini tidak bisa dibatalkan.",
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
      realReturn: parseFloat(((showAfterTax ? net : gross) - inflationRate).toFixed(2)),
    };
  }, [effectiveAssets, totalAssets, inflationRate, showAfterTax]); // <-- UBAH DI SINI

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
    if (eq < 20) return { label: "Sangat Konservatif", color: tokens.colors.semantic.brand };
    if (eq < 40) return { label: "Konservatif", color: tokens.colors.semantic.success };
    if (eq < 60) return { label: "Moderat", color: tokens.colors.semantic.warning };
    if (eq < 80) return { label: "Agresif", color: "#f97316" };
    return { label: "Sangat Agresif", color: tokens.colors.semantic.danger };
  };
  const riskInfo = getRiskInfo(stats.equityPct);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: tokens.typography.fontFamily,
        minHeight: "100vh",
        background: tokens.colors.surface.app,
        color: tokens.colors.text.primary,
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing:border-box; }
        body, html { margin: 0; padding: 0; background: #f8fafc; overflow-x: hidden; }
        button, input, select, textarea { font-family: inherit; }
        :root {
          --color-surface-app: ${tokens.colors.surface.app};
          --color-surface-card: ${tokens.colors.surface.card};
          --color-surface-input: ${tokens.colors.surface.input};
          --color-border-subtle: ${tokens.colors.border.subtle};
          --color-border-input: ${tokens.colors.border.input};
          --color-border-active: ${tokens.colors.border.active};
          --color-text-primary: ${tokens.colors.text.primary};
          --color-text-secondary: ${tokens.colors.text.secondary};
          --color-text-tertiary: ${tokens.colors.text.tertiary};
          --color-brand: ${tokens.colors.semantic.brand};
          --color-success: ${tokens.colors.semantic.success};
          --color-danger: ${tokens.colors.semantic.danger};
          --font-family: ${tokens.typography.fontFamily};
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:var(--color-border-input); border-radius:4px; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:15px; height:15px; border-radius:50%; cursor:pointer; border:2.5px solid var(--color-surface-card); background:var(--color-surface-card); box-shadow:0 1px 4px rgba(0,0,0,.18); }
        input[type=range]::-moz-range-thumb { width:15px; height:15px; border-radius:50%; cursor:pointer; border:2.5px solid var(--color-surface-card); background:var(--color-surface-card); box-shadow:0 1px 4px rgba(0,0,0,.18); }
        .card  { background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); border-radius:16px; overflow: hidden; }
        .card2 { background:var(--color-surface-input); border:1.5px solid var(--color-border-subtle); border-radius:12px; }
        .glow-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; }
        .stat  { background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); border-radius:10px; padding:14px 16px; flex-shrink:0; min-width:148px; }
        .ifield { width:100%; background:var(--color-surface-input); border:1.5px solid var(--color-border-subtle); border-radius:8px; padding:9px 80px 9px 34px; color:var(--color-text-primary); font-family:var(--font-family); font-size:13px; font-weight:600; outline:none; transition:border-color .2s, background .2s; }
        .ifield:focus { border-color:var(--color-border-active); background:var(--color-surface-card); }
        .ifield-sm { width:100%; background:var(--color-surface-input); border:1.5px solid var(--color-border-subtle); border-radius:8px; padding:7px 60px 7px 30px; color:var(--color-text-primary); font-family:var(--font-family); font-size:12px; font-weight:600; outline:none; transition:border-color .2s, background .2s; }
        .stepbtn { width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); color:var(--color-text-secondary); border-radius:6px; cursor:pointer; font-size:15px; transition:all .15s; }
        .stepbtn:hover { background:var(--color-border-subtle); color:var(--color-text-primary); border-color:var(--color-border-input); }
        .stepbtn-sm { width:22px; height:22px; display:flex; align-items:center; justify-content:center; background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); color:var(--color-text-secondary); border-radius:5px; cursor:pointer; font-size:13px; transition:all .15s; }
        .stepbtn-sm:hover { background:var(--color-border-subtle); color:var(--color-text-primary); }
        .tab { padding:8px 18px; border-radius:8px; cursor:pointer; font-size:13px; font-weight:600; border:none; transition:all .2s; background:transparent; color:var(--color-text-tertiary); font-family:var(--font-family); }
        .tab:hover { color:var(--color-text-secondary); }
        .tab.on { background:var(--color-brand); color: var(--color-surface-card); box-shadow:0 4px 12px rgba(15,23,42,.15); }
        .tmplbtn { padding:11px 14px; border-radius:10px; border:1.5px solid var(--color-border-subtle); background:var(--color-surface-card); color:var(--color-text-secondary); cursor:pointer; transition:all .2s; text-align:left; width:100%; }
        .tmplbtn:hover { border-color:var(--color-border-active); color: var(--color-brand); background: var(--color-surface-active); }
        .warn { background: ${tokens.colors.semantic.dangerBg}; border:1.5px solid ${tokens.colors.semantic.dangerBorder}; border-radius:10px; padding:12px 16px; font-size:13px; color:var(--color-danger); display:flex; align-items:center; gap:10px; }
        .ok   { background: ${tokens.colors.semantic.successBg}; border:1.5px solid ${tokens.colors.semantic.successBorder}; border-radius:10px; padding:12px 16px; font-size:13px; color:var(--color-success); display:flex; align-items:center; gap:10px; }
        .note { background: ${tokens.colors.surface.active}; border:1.5px solid ${tokens.colors.border.subtle}; border-radius:10px; padding:12px 14px; font-size:11.5px; color: ${tokens.colors.text.secondary}; margin-top:10px; line-height:1.65; }
        .pgbar { background:var(--color-border-subtle); border-radius:4px; height:6px; overflow:hidden; margin-top:6px; }
        .disc  { background:var(--color-surface-app); border:1.5px solid var(--color-border-subtle); border-radius:12px; padding:16px; font-size:11px; color:var(--color-text-tertiary); line-height:1.7; margin-top:20px; margin-bottom:120px; }
        .contrib-row { border-top:1px solid var(--color-surface-input); margin-top:10px; padding-top:10px; }
        .cl { font-size:10px; font-weight:700; color:var(--color-text-tertiary); text-transform:uppercase; letter-spacing:.07em; margin-bottom:5px; }
        .tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; }
        .asset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
/* Android Chrome Ultimate Kill-Switch */
        .recharts-responsive-container,
        .recharts-wrapper, 
        .recharts-surface {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        .recharts-responsive-container:focus,
        .recharts-responsive-container:active,
        .recharts-responsive-container:focus-within,
        .recharts-responsive-container:focus-visible,
        .recharts-wrapper:focus, 
        .recharts-wrapper:active, 
        .recharts-wrapper:focus-within, 
        .recharts-wrapper:focus-visible,
        .recharts-surface:focus,
        .recharts-surface:active,
        .recharts-surface:focus-within,
        .recharts-surface:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
          /* ── Stat scroll strip ── */
        .stat-strip { display:flex; flex-direction:row; gap:8px; overflow-x:auto; margin: 0 -16px 12px -16px; padding: 0 16px 8px 16px; scrollbar-width: none; -ms-overflow-style: none; }
        .stat-strip::-webkit-scrollbar { display:none; }
        /* ── Profile row (naked) ── */
        .profile-row { display:flex; flex-wrap:nowrap; gap:8px; overflow-x:auto; margin: 0 -16px; padding: 0 16px 8px 16px; scrollbar-width: none; -ms-overflow-style: none; }
        .profile-row::-webkit-scrollbar { display:none; }
        /* ── iOS-style toggle ── */
        .ios-toggle-wrap { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
        .ios-track { position:relative; width:38px; height:22px; border-radius:11px; transition:background .25s; flex-shrink:0; }
        .ios-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:${tokens.colors.surface.card}; box-shadow:0 1px 4px rgba(0,0,0,.22); transition:transform .25s; }
@media (max-width:640px) { .asset-grid { grid-template-columns:1fr; } }
@media (min-width:641px) and (max-width:1023px) { .asset-grid { grid-template-columns:repeat(2,1fr); } }
.fab { display:none; }
@media (max-width:768px) {
  .header-title { font-size:24px !important; }
  .header-sub { font-size:12px !important; }
  .desktop-only { display: none !important; }
  .fab {
    display:flex;
    padding:10px 24px 12px;
    align-items:center;
    justify-content:center;
    position:fixed;
    bottom:80px;
    right:20px;
    z-index:1000;
    width:auto;
    height:auto;
    border-radius:12px;
    background: var(--color-brand);
    border: none;
    cursor:pointer;
    font-size:14px;
    font-family: var(--font-family);
    font-weight: 800;
    color: var(--color-surface-card);
    transition:transform .15s;
    box-shadow: ${tokens.shadows.medium};
  }
  .fab:active { transform:scale(0.93); }
  .tab-bar-sticky {
    position:fixed;
    bottom:8px; left:16px; right:16px;
    z-index:999;
    background: var(--color-surface-card);
    backdrop-filter: blur(12px);
    border: 1.5px solid ${tokens.colors.border.subtle};
    border-radius: 20px;
    display:flex;
    padding:8px;
    gap:4px;
    box-shadow: ${tokens.shadows.medium};
  }
  .tab-bar-sticky .tab { 
    flex:1; 
    text-align:center; 
    font-size:14px;
    font-weight: 800;
    padding:12px 4px;
    border-radius: 12px; 
  }
  .mobile-bottom-spacer { height:4px; }
}
@media (min-width:769px) { .tab-bar-sticky { display:none !important; } .mobile-bottom-spacer { display:none; } }
      `}</style>

      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 20 }}>
          <h1
            className="header-title"
            style={{
              fontSize: 32,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.01em",
              color: tokens.colors.text.primary,
            }}
          >
            Jejak Harta
          </h1>
          <p
            className="header-sub"
            style={{
              fontSize: 16,
              color: tokens.colors.text.tertiary,
              marginTop: 5,
              marginBottom: 0,
            }}
          >
            Return riil · Pajak · Kontribusi per aset · Stress test
          </p>
        </div>

        {/* ── GLOBAL DASHBOARD CONTROLLER ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {/* LEFT: Real Return status + After-Tax toggle */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Real Return status pill */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                background: stats.realReturn >= 0 ? tokens.colors.semantic.successBg : tokens.colors.semantic.dangerBg,
                border: `1.5px solid ${stats.realReturn >= 0 ? tokens.colors.semantic.successBorder : tokens.colors.semantic.dangerBorder}`,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: stats.realReturn >= 0 ? tokens.colors.semantic.success : tokens.colors.semantic.danger,
                }}
              >
                {stats.realReturn >= 0 ? "+" : ""}{stats.realReturn}% vs inflasi {inflationRate}%/thn
              </span>
            </div>
            {/* After-Tax iOS toggle */}
            <label className="ios-toggle-wrap">
              <div
                className="ios-track"
                style={{ background: showAfterTax ? tokens.colors.semantic.brand : tokens.colors.border.input }}
                onClick={() => setShowAfterTax((v) => !v)}
              >
                <div
                  className="ios-thumb"
                  style={{ transform: showAfterTax ? "translateX(16px)" : "translateX(0)" }}
                />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colors.text.secondary, cursor: "pointer" }}
                onClick={() => setShowAfterTax((v) => !v)}
              >
                After-tax
              </span>
            </label>
          </div>
          {/* RIGHT: Total Aset */}
          <div style={{ textAlign: "right" }}>
            <div style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.tertiary, marginBottom: 4 }}>
              Total Aset
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: tokens.typography.fontFamily,
                color: tokens.colors.text.primary,
              }}
            >
              {formatCompact(totalAssets)}
            </div>
            <div style={{ fontSize: 11, color: tokens.colors.text.secondary, marginTop: 2 }}>
              {formatIDR(totalAssets)}
            </div>
          </div>
        </div>

        {/* ── SUMMARY STATS — horizontal scroll strip ── */}
        <div className="stat-strip">
          {[
            {
              label: showAfterTax ? "Return After-Tax" : "Return Bruto",
              value: `${showAfterTax ? stats.weightedNet : stats.weightedGross}%`,
              sub: `Gross ${stats.weightedGross}% / Net ${stats.weightedNet}%`,
              color: tokens.colors.semantic.success,
              tip: "Return portofolio setelah dipotong pajak (PPh final). Lebih realistis dari return bruto.",
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
              color: tokens.colors.dataViz.rdpu,
              tip: "Total uang baru yang kamu setorkan ke semua instrumen setiap bulan.",
            },
            {
              label: "Worst Case",
              value: formatCompact(worstCase - totalAssets),
              sub: `Portofolio jadi ${formatCompact(worstCase)}`,
              color: tokens.colors.semantic.danger,
              tip: "Simulasi crash pasar: semua aset ekuitas turun 30% sekaligus. Ini potensi nilai kerugian (dalam minus) dan nilai akhir portofoliomu.",
            },
          ].map((s, i) => (
            <div key={i} className="stat">
              <div
                style={{
                  ...tokens.typography.eyebrow,
                  fontSize: 10,
                  color: tokens.colors.text.tertiary,
                  marginBottom: 5,
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {s.label}
                  {s.tip && (
                    <span
                      title={s.tip}
                      style={{ cursor: "help", display: "inline-flex" }}
                      onClick={(e) => {
                        if (window.innerWidth <= 768) {
                          e.stopPropagation();
                          setModalAction({
                            isOpen: true,
                            title: `${s.label}:\n${s.tip}`,
                            type: "info"
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 14, height: 14 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                      </svg>
                    </span>
                  )}
                </span>
              </div>
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  fontFamily: tokens.typography.fontFamily,
                  color: s.color,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 3 }}>
                {s.sub}
              </div>
            </div>
          ))}
        </div>

        {/* ── PROFIL ALOKASI KAMU (naked, selalu tampil) ── */}
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              ...tokens.typography.eyebrow,
              fontSize: 11,
              color: tokens.colors.text.tertiary,
              marginBottom: 12,
            }}
          >
            Profil Alokasi Kamu
          </div>
          <div className="profile-row">
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
                      ? `1.5px solid ${tokens.colors.border.active}`
                      : `1.5px solid ${tokens.colors.border.subtle}`,
                  backgroundColor:
                    activeTemplateId === t.id ? tokens.colors.surface.card : tokens.colors.surface.card,
                  borderRadius: 10,
                  transition: "all 0.2s",
                }}
                onClick={() => loadUserTemplate(t)}
                onMouseOver={(e) => {
                  if (activeTemplateId !== t.id)
                    e.currentTarget.style.borderColor = tokens.colors.border.active;
                }}
                onMouseOut={(e) => {
                  if (activeTemplateId !== t.id)
                    e.currentTarget.style.borderColor = tokens.colors.border.subtle;
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 80,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: tokens.colors.text.primary,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={t.name}
                  >
                    {t.name}
                  </span>
                  <span style={{ fontSize: 10, color: tokens.colors.text.tertiary }}>
                    {new Date(t.updatedAt).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    borderLeft: `1.5px solid ${tokens.colors.surface.input}`,
                    paddingLeft: 10,
                  }}
                >
                  <button
                    onClick={(e) => updateExistingTemplate(t.id, e)}
                    style={{
                      background: tokens.colors.surface.input,
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Timpa template ini"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16, color: tokens.colors.text.secondary }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => deleteTemplate(t.id, e)}
                    style={{
                      background: tokens.colors.semantic.dangerBg,
                      color: tokens.colors.semantic.danger,
                      border: "none",
                      borderRadius: 6,
                      padding: "4px 6px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Hapus"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
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
                  background: tokens.colors.surface.app,
                  padding: 6,
                  borderRadius: 10,
                  border: `1.5px dashed ${tokens.colors.border.input}`,
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
                    color: tokens.colors.text.primary,
                  }}
                  placeholder="Nama Profil..."
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
                title="Hapus salah satu profil untuk membuat yang baru"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1.5px solid ${tokens.colors.border.subtle}`,
                  background: tokens.colors.surface.app,
                  color: tokens.colors.text.tertiary,
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
            display: "flex",
            gap: 4,
            marginBottom: 12,
            background: tokens.colors.surface.input,
            border: `1.5px solid ${tokens.colors.border.subtle}`,
            borderRadius: 10,
            padding: 4,
            width: "fit-content",
          }}
        >
          {[
            ["input", "Input Aset"],
            ["projection", "Proyeksi"],
            ["allocation", "Alokasi"],
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
          <InputTab
            tokens={tokens}
            ASSET_CLASSES={ASSET_CLASSES}
            USD_RATE={USD_RATE}
            activeAssetIds={activeAssetIds}
            assets={assets}
            setAssets={setAssets}
            monthlyContribs={monthlyContribs}
            setMonthlyContribs={setMonthlyContribs}
            totalAssets={totalAssets}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            monthlyExpense={monthlyExpense}
            setMonthlyExpense={setMonthlyExpense}
            targetMonths={targetMonths}
            setTargetMonths={setTargetMonths}
            includeEmergencyInTotal={includeEmergencyInTotal}
            setIncludeEmergencyInTotal={setIncludeEmergencyInTotal}
            userTemplates={userTemplates}
            activeTemplateId={activeTemplateId}
            saveNewTemplate={saveNewTemplate}
            formatIDR={formatIDR}
            formatCompact={formatCompact}
            parseExpression={parseExpression}
            formatWhileTyping={formatWhileTyping}
            afterTaxReturn={afterTaxReturn}
            addAsset={addAsset}
            removeAsset={removeAsset}
            handleStep={handleStep}
            handleContribStep={handleContribStep}
            handleExpenseStep={handleExpenseStep}
          />
        )}

        {/* ══════════════════════════════════════════════
            TAB: PROYEKSI
        ══════════════════════════════════════════════ */}
        {activeTab === "projection" && (
          <ProjectionTab
            tokens={tokens}
            inflationRate={inflationRate}
            setInflationRate={setInflationRate}
            totalMonthlyContrib={totalMonthlyContrib}
            fireTarget={fireTarget}
            setFireTarget={setFireTarget}
            chartData={chartData}
            formatIDR={formatIDR}
            formatCompact={formatCompact}
          />
        )}

        {/* ══════════════════════════════════════════════
            TAB: ALOKASI
        ══════════════════════════════════════════════ */}
        {activeTab === "allocation" && (
          <AllocationTab
            tokens={tokens}
            allocData={allocData}
            monthlyContribs={monthlyContribs}
            formatCompact={formatCompact}
            afterTaxReturn={afterTaxReturn}
          />
        )}

        {/* ══════════════════════════════════════════════
            MODUL DANA DARURAT (DEFENSIF)
        ══════════════════════════════════════════════ */}


        <div className="mobile-bottom-spacer" />

        {/* ── DISCLAIMER ── */}
        <div className="disc">
          <strong>⚠️ Disclaimer:</strong> Seluruh perhitungan bersifat simulasi
          edukatif berdasarkan data historis dan tidak menjamin hasil investasi di
          masa depan. Angka return yang digunakan merupakan estimasi rata-rata
          yang sudah disesuaikan dengan pajak (untuk After-tax) dan inflasi.
          Selalu lakukan riset mandiri atau konsultasikan dengan penasihat
          keuangan profesional sebelum mengambil keputusan investasi.
        </div>

        {/* ── MOBILE FAB ── */}


        {/* ── MOBILE STICKY TAB BAR ── */}
        <div className="tab-bar-sticky" style={{ background: tokens.colors.surface.card, borderTop: `1.5px solid ${tokens.colors.border.subtle}` }}>
          {[
            ["input", "", "Input"],
            ["projection", "", "Proyeksi"],
            ["allocation", "", "Alokasi"],
          ].map(([id, icon, lbl]) => (
            <button
              key={id}
              className={`tab ${activeTab === id ? "on" : ""}`}
              onClick={() => setActiveTab(id)}
              style={{ color: activeTab === id ? "#fff" : tokens.colors.text.tertiary }}
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
              backgroundColor: tokens.colors.overlay,
              backdropFilter: "blur(4px)",
              padding: "16px"
            }}
            onClick={closeModal}
          >
            <div
              style={{
                backgroundColor: tokens.colors.surface.card,
                borderRadius: "16px",
                boxShadow: "0 24px 50px rgba(0,0,0,0.2)",
                width: "100%",
                maxWidth: "360px",
                padding: "16px",
                textAlign: "center"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ fontSize: "14px", fontWeight: 500, color: tokens.colors.text.primary, lineHeight: 1.65, marginBottom: "22px", fontFamily: tokens.typography.fontFamily }}>
                {modalAction.title}
              </p>
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                {modalAction.type === "info" ? (
                  <button
                    onClick={closeModal}
                    style={{
                      width: "100%",
                      padding: "14px 0", borderRadius: "10px", border: "none",
                      background: tokens.colors.semantic.brand, color: "#FFFFFF", fontWeight: 700, fontSize: "14px",
                      cursor: "pointer", fontFamily: tokens.typography.fontFamily
                    }}
                  >
                    Tutup
                  </button>
                ) : (
                  <>
                    <button
                      onClick={closeModal}
                      style={{
                        flex: 1,
                        padding: "12px 0", borderRadius: "8px", border: `1.5px solid ${tokens.colors.border.subtle}`,
                        background: tokens.colors.surface.input, color: tokens.colors.text.secondary, fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", fontFamily: tokens.typography.fontFamily
                      }}
                    >
                      Batal
                    </button>
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
                        flex: 1,
                        padding: "12px 0", borderRadius: "8px", border: "none",
                        background: modalAction.type === "delete" ? tokens.colors.semantic.danger : tokens.colors.semantic.brand,
                        color: "#FFFFFF", fontWeight: 700, fontSize: "14px",
                        cursor: "pointer", fontFamily: tokens.typography.fontFamily
                      }}
                    >
                      {modalAction.type === "delete" ? "Hapus" : "Ya, Update"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
