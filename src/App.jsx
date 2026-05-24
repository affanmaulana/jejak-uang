import React, { useState, useMemo, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AnimatePresence, motion } from "framer-motion";
import InputTab from "./components/InputTab";
import ProjectionTab from "./components/ProjectionTab";
import KalkulatorPensiun from "./components/KalkulatorPensiun";
import Container from "./components/Container";
import PageTransition from "./components/PageTransition";

// New modularized imports
import { DEFAULT_USD_RATE, PROJECTION_YEARS, ASSET_CLASSES } from "./constants/assets";
import { tokens } from "./theme/tokens";
import { 
  formatIDR, 
  formatCompact, 
  parseExpression, 
  formatWhileTyping, 
  afterTaxReturn 
} from "./utils/formatters";

// Styles
import "./styles/tokens.css";

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
  const [customUSDRate, setCustomUSDRate] = useState(DEFAULT_USD_RATE);
  const [assetCurrencyPrefs, setAssetCurrencyPrefs] = useState({});
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

  const [customReturnOverrides, setCustomReturnOverrides] = useState({});
  const [customDrawdowns, setCustomDrawdowns] = useState({});

  const [inflationRate, setInflationRate] = useState(5.0);
  const [showAfterTax, setShowAfterTax] = useState(true);
  const [activeTab, setActiveTab] = useState("input");

  // Reset scroll to top when changing tabs (deferred to ensure DOM has updated)
  useEffect(() => {
    const handleScrollReset = () => {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };
    
    // Defer execution until the browser has finished rendering/updating
    const frameId = requestAnimationFrame(() => {
      handleScrollReset();
      setTimeout(handleScrollReset, 0);
    });

    return () => cancelAnimationFrame(frameId);
  }, [activeTab]);

  // ── State Option 2: Top Modal ──
  const [activeAssetIds, setActiveAssetIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState({ isOpen: false, title: "", type: null, targetId: null });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileMenuClosing, setIsMobileMenuClosing] = useState(false);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, isClosing: false }]);
    
    // Start closing animation after 2.5s
    setTimeout(() => {
      setToasts((prev) => prev.map(t => t.id === id ? { ...t, isClosing: true } : t));
    }, 2500);

    // Remove from DOM after 3s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleToggleMobileMenu = () => {
    if (isMobileMenuOpen) {
      setIsMobileMenuClosing(true);
      setTimeout(() => {
        setIsMobileMenuOpen(false);
        setIsMobileMenuClosing(false);
      }, 250);
    } else {
      setIsMobileMenuOpen(true);
    }
  };

  const closeModal = () => setModalAction({ isOpen: false, title: "", type: null, targetId: null });

  // ── BODY SCROLL LOCK ──
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || modalAction.isOpen || isMobileMenuOpen;
    const scrollBarWidth = window.innerWidth - document.body.clientWidth;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarWidth}px`;
      document.body.style.overscrollBehavior = "none";
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
      document.body.style.overscrollBehavior = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
      document.body.style.overscrollBehavior = "unset";
    };
  }, [isModalOpen, modalAction.isOpen]);


  const addAsset = (id) => {
    const cls = ASSET_CLASSES.find((c) => c.id === id);
    if (!activeAssetIds.includes(id)) {
      setActiveAssetIds((prev) => [...prev, id]);
      showToast(`${cls.name} berhasil ditambahkan!`);
    }
    // Auto-close if all assets are now active
    if (ASSET_CLASSES.filter((c) => !activeAssetIds.includes(c.id)).length <= 1) {
      setIsModalOpen(false);
    }
  };

  const removeAsset = (id) => {
    setActiveAssetIds((prev) => prev.filter((aid) => aid !== id));
    // Reset the asset value, contrib, and overrides when removed
    setAssets((prev) => ({ ...prev, [id]: 0 }));
    setMonthlyContribs((prev) => ({ ...prev, [id]: 0 }));
    setCustomReturnOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCustomDrawdowns((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

    // Ganti alert() dengan pemanggilan modalAction tipe "info"
    if (!trimmedName) {
      setModalAction({ isOpen: true, title: "Nama Profil wajib diisi.", type: "info" });
      return;
    }

    if (userTemplates.length >= 3) {
      setModalAction({ isOpen: true, title: "Maksimal 3 profil. Hapus profil lama untuk membuat yang baru.", type: "info" });
      return;
    }

    if (userTemplates.some((t) => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      setModalAction({ isOpen: true, title: "Nama template sudah digunakan.", type: "info" });
      return;
    }

    const newTemplate = {
      id: crypto.randomUUID(),
      name: trimmedName,
      assets: { ...assets },
      contribs: { ...monthlyContribs },
      customReturns: { ...customReturnOverrides },
      customDrawdowns: { ...customDrawdowns },
      activeIds: [...activeAssetIds],
      customUSDRate: customUSDRate,
      assetCurrencyPrefs: { ...assetCurrencyPrefs },
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
    setCustomReturnOverrides(t.customReturns || {});
    setCustomDrawdowns(t.customDrawdowns || {});
    // Fallback: jika profil lama tidak punya activeIds, derive dari nilai aset > 0
    setActiveAssetIds(
      t.activeIds ||
      Object.keys(t.assets || {}).filter((key) => (t.assets[key] || 0) > 0)
    );
    setFireTarget(t.fireTarget);
    setMonthlyExpense(t.monthlyExpense);
    setTargetMonths(t.targetMonths);
    setIncludeEmergencyInTotal(t.includeEmergencyInTotal);
    setCustomUSDRate(t.customUSDRate ?? DEFAULT_USD_RATE);
    setAssetCurrencyPrefs(t.assetCurrencyPrefs ?? {});
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
        const pref = assetCurrencyPrefs[id] || (cls.isUSD ? 'USD' : 'IDR');
        return sum + (pref === 'USD' ? val * customUSDRate : val);
      }, 0),
    [effectiveAssets, customUSDRate, assetCurrencyPrefs] // <-- UBAH DI SINI
  );

  const totalMonthlyContrib = useMemo(
    () =>
      Object.entries(monthlyContribs).reduce((sum, [id, val]) => {
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        const pref = assetCurrencyPrefs[id] || (cls.isUSD ? 'USD' : 'IDR');
        return sum + (pref === 'USD' ? val * customUSDRate : val);
      }, 0),
    [monthlyContribs, customUSDRate, assetCurrencyPrefs]
  );

  const stats = useMemo(() => {
    if (totalAssets === 0)
      return { weightedGross: 0, weightedNet: 0, equityPct: 0, realReturn: 0 };
    let gross = 0,
      net = 0,
      equity = 0;
    ASSET_CLASSES.forEach((cls) => {
      const raw = effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
      const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
      const idr = pref === 'USD' ? raw * customUSDRate : raw;
      const w = idr / totalAssets;
      const r = customReturnOverrides[cls.id] !== undefined ? customReturnOverrides[cls.id] : cls.return;
      gross += w * r;
      net += w * afterTaxReturn(cls, r);
      if (cls.isEquity) equity += w * 100;
    });
    return {
      weightedGross: parseFloat(gross.toFixed(2)),
      weightedNet: parseFloat(net.toFixed(2)),
      equityPct: parseFloat(equity.toFixed(1)),
      realReturn: parseFloat(((showAfterTax ? net : gross) - inflationRate).toFixed(2)),
    };
  }, [effectiveAssets, totalAssets, inflationRate, showAfterTax, customReturnOverrides, customUSDRate, assetCurrencyPrefs]); // <-- UBAH DI SINI

  // Proyeksi: setiap aset dihitung terpisah (FV dengan kontribusi per aset)
  const chartData = useMemo(() => {
    const inf = inflationRate / 100;
    let infBase = totalAssets;
    const data = [];

    for (let y = 0; y <= PROJECTION_YEARS; y++) {
      let portTotal = 0;
      ASSET_CLASSES.forEach((cls) => {
        const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
        const init = pref === 'USD'
          ? (effectiveAssets[cls.id] || 0) * customUSDRate // <-- UBAH DI SINI
          : effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
        const mc = pref === 'USD'
          ? (monthlyContribs[cls.id] || 0) * customUSDRate
          : monthlyContribs[cls.id] || 0;
        const baseR = customReturnOverrides[cls.id] !== undefined ? customReturnOverrides[cls.id] : cls.return;
        const r = (showAfterTax ? afterTaxReturn(cls, baseR) : baseR) / 100;
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
    customUSDRate,
    assetCurrencyPrefs,
    customReturnOverrides
  ]); // <-- UBAH DI SINI

  const allocData = useMemo(
    () =>
      ASSET_CLASSES.map((cls) => {
        const raw = effectiveAssets[cls.id] || 0; // <-- UBAH DI SINI
        const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
        const idr = pref === 'USD' ? raw * customUSDRate : raw;
        return {
          ...cls,
          idr,
          pct: totalAssets > 0 ? (idr / totalAssets) * 100 : 0,
        };
      }).filter((d) => d.idr > 0),
    [effectiveAssets, totalAssets, customUSDRate, assetCurrencyPrefs] // <-- UBAH DI SINI
  );

  const worstCase = useMemo(() => {
    let port = totalAssets;
    ASSET_CLASSES.forEach((cls) => {
      const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
      const idr = pref === 'USD'
        ? (effectiveAssets[cls.id] || 0) * customUSDRate
        : effectiveAssets[cls.id] || 0;

      if (idr > 0) {
        // Gunakan custom drawdown jika ada, jika tidak gunakan default per instrumen
        const drawdown = customDrawdowns[cls.id] !== undefined
          ? customDrawdowns[cls.id]
          : (cls.defaultDrawdown || 0);

        port += idr * -(drawdown / 100);
      }
    });
    return Math.round(port);
  }, [effectiveAssets, totalAssets, customDrawdowns, customUSDRate, assetCurrencyPrefs]);

  const getRiskInfo = (eq) => {
    if (eq < 20) return { label: "Sangat Konservatif", color: "var(--color-semantic-brand)" };
    if (eq < 40) return { label: "Konservatif", color: "var(--color-semantic-success)" };
    if (eq < 60) return { label: "Moderat", color: "var(--color-semantic-warning)" };
    if (eq < 80) return { label: "Agresif", color: "var(--color-viz-sp500)" };
    return { label: "Sangat Agresif", color: "var(--color-semantic-danger)" };
  };
  const riskInfo = getRiskInfo(stats.equityPct);

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        fontFamily: tokens.typography.fontFamily,
        minHeight: "100vh",
        background: "var(--color-surface-app)",
        color: "var(--color-text-primary)",
        padding: "24px 16px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body, html { margin: 0; padding: 0; background: var(--color-surface-app); overflow-x: hidden; width: 100%; height: 100%; }
        * { box-sizing: border-box; }
        button, input, select, textarea { font-family: inherit; }
        :root {
          --color-brand: var(--color-semantic-brand);
          --color-success: var(--color-semantic-success);
          --color-danger: var(--color-semantic-danger);
          --font-family: ${tokens.typography.fontFamily};
        }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:var(--color-border-input); border-radius:4px; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:4px; outline:none; cursor:pointer; background:var(--color-border-subtle); }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; cursor:pointer; border:2px solid var(--color-surface-card); background:var(--color-brand); box-shadow:var(--shadow-md); transition:transform .1s ease, background-color .1s ease; }
        input[type=range]::-moz-range-thumb { width:18px; height:18px; border-radius:50%; cursor:pointer; border:2px solid var(--color-surface-card); background:var(--color-brand); box-shadow:var(--shadow-md); transition:transform .1s ease, background-color .1s ease; }
        input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.15); background: var(--color-text-secondary); }
        input[type=range]::-moz-range-thumb:hover { transform: scale(1.15); background: var(--color-text-secondary); }
        input[type=range]::-webkit-slider-thumb:active { transform: scale(0.92); }
        input[type=range]::-moz-range-thumb:active { transform: scale(0.92); }
        .card  { background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); border-radius:16px; overflow: hidden; box-shadow: var(--shadow-sm); }
        .card2 { background:var(--color-surface-input); border:1.5px solid var(--color-border-subtle); border-radius:12px; }
        .glow-bar { position: absolute; top: 0; left: 0; right: 0; height: 6px; }
        .stat  { background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); border-radius:10px; padding:14px 16px; flex-shrink:0; min-width:148px; box-shadow: var(--shadow-sm); }
        .ifield, .ifield-sm, .ifield-lg { 
            width:100%; 
            background:var(--color-surface-input); 
            border:1.5px solid var(--color-border-subtle); 
            border-radius:12px; 
            color:var(--color-text-primary); 
            font-family:var(--font-family); 
            outline:none; 
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
        }
        .ifield:focus, .ifield-sm:focus, .ifield-lg:focus { 
            border-color:var(--color-border-active); 
            background:var(--color-surface-card); 
            box-shadow: var(--shadow-glow);
        }
        .ifield-lg { padding: 14px 16px 14px 44px; font-size: var(--text-h3-size); font-weight: var(--text-h3-weight); }
        .ifield    { padding: 12px 16px 12px 42px; font-size: var(--text-subtitle-size); font-weight: var(--text-subtitle-weight); height: 48px; }
        .ifield-sm { padding: 9px 12px; font-size: var(--text-body-size); font-weight: var(--text-caption-weight); border-radius: 8px; }
        .stepbtn { width:26px; height:26px; display:flex; align-items:center; justify-content:center; background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); color:var(--color-text-secondary); border-radius:6px; cursor:pointer; font-size:var(--text-body-size); transition:all .15s; }
        .stepbtn:hover { background:var(--color-border-subtle); color:var(--color-text-primary); border-color:var(--color-border-input); }
        .stepbtn-sm { width:22px; height:22px; display:flex; align-items:center; justify-content:center; background:var(--color-surface-card); border:1.5px solid var(--color-border-subtle); color:var(--color-text-secondary); border-radius:5px; cursor:pointer; font-size:var(--text-caption-size); transition:all .15s; }
        .stepbtn-sm:hover { background:var(--color-border-subtle); color:var(--color-text-primary); }
        .tab { padding:8px 18px; border-radius:8px; cursor:pointer; font-size:var(--text-body-size); font-weight:var(--text-caption-weight); border:none; transition:all .2s; background:transparent; color:var(--color-text-tertiary); font-family:var(--font-family); }
        .tab:hover { color:var(--color-text-secondary); }
        .tab.on { background:var(--color-brand); color: var(--color-surface-card); box-shadow:var(--shadow-md); }
        .tmplbtn { padding:11px 14px; border-radius:10px; border:1.5px solid var(--color-border-subtle); background:var(--color-surface-card); color:var(--color-text-secondary); cursor:pointer; transition:all .2s; text-align:left; width:100%; box-shadow: var(--shadow-sm); }
        .tmplbtn:hover { border-color:var(--color-border-active); color: var(--color-brand); background: var(--color-surface-active); }
        .warn { background: var(--color-semantic-danger-bg); border:1.5px solid var(--color-semantic-danger-border); border-radius:10px; padding:12px 16px; font-size:var(--text-body-size); color:var(--color-danger); display:flex; align-items:center; gap:10px; }
        .ok   { background: var(--color-semantic-success-bg); border:1.5px solid var(--color-semantic-success-border); border-radius:10px; padding:12px 16px; font-size:var(--text-body-size); color:var(--color-success); display:flex; align-items:center; gap:10px; }
        .note { background: var(--color-surface-active); border:1.5px solid var(--color-border-subtle); border-radius:10px; padding:12px 14px; font-size:var(--text-caption-size); color: var(--color-text-secondary); margin-top:10px; line-height:var(--text-caption-line-height); }
        .pgbar { background:var(--color-border-subtle); border-radius:4px; height:6px; overflow:hidden; margin-top:6px; }
        .disc  { background:var(--color-surface-app); border:1.5px solid var(--color-border-subtle); border-radius:12px; padding:16px; font-size:var(--text-caption-size); color:var(--color-text-tertiary); line-height:1.7; margin-bottom:120px; }
        .contrib-row { border-top:1px solid var(--color-surface-input); margin-top:10px; padding-top:10px; }
        .cl { font-size:var(--text-eyebrow-size); font-weight:var(--text-eyebrow-weight); color:var(--color-text-tertiary); text-transform:var(--text-eyebrow-transform); letter-spacing:var(--text-eyebrow-letter-spacing); margin-bottom:5px; }
        .tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:var(--text-eyebrow-size); font-weight:var(--text-eyebrow-weight); letter-spacing:var(--text-eyebrow-letter-spacing); text-transform:var(--text-eyebrow-transform); }
        .asset-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
/* Android Chrome Ultimate Kill-Switch */
        .recharts-responsive-container,
        .recharts-wrapper, 
.recharts-surface {
  -webkit-tap-highlight-color: transparent;
  outline: none;
  user-select: none;
}
  .recharts-tooltip-wrapper {
  transition: transform 0.1s ease-out !important;
  pointer-events: none; /* Agar tidak menghalangi scroll */
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
        .stat-strip { display:flex; flex-direction:row; gap:8px; overflow-x:auto; margin: -4px -16px 8px -16px; padding: 4px 16px 8px 16px; scrollbar-width: none; -ms-overflow-style: none; }
        .stat-strip::-webkit-scrollbar { display:none; }
        /* ── Profile row (naked) ── */
        .profile-row { display:flex; flex-wrap:nowrap; gap:8px; overflow-x:auto; margin: -4px -16px 0 -16px; padding: 4px 16px 8px 16px; scrollbar-width: none; -ms-overflow-style: none; }
        .profile-row::-webkit-scrollbar { display:none; }
        /* ── iOS-style toggle ── */
        .ios-toggle-wrap { display:flex; align-items:center; gap:8px; cursor:pointer; user-select:none; }
        .ios-track { position:relative; width:38px; height:22px; border-radius:11px; transition:background .25s; flex-shrink:0; }
        .ios-thumb { position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:var(--color-surface-card); box-shadow:var(--shadow-sm); transition:transform .25s; }
@media (max-width:640px) { .asset-grid { grid-template-columns:1fr; } }
@media (min-width:641px) and (max-width:1023px) { .asset-grid { grid-template-columns:repeat(2,1fr); } }
.fab { display:none; }
  .tab-bar-sticky {
    position:fixed;
    z-index:999;
    background: var(--color-surface-card);
    backdrop-filter: blur(12px);
    border: 1.5px solid var(--color-border-subtle);
    border-radius: 20px;
    display:flex;
    padding:8px;
    gap:4px;
    box-shadow: ${tokens.shadows.medium};
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tab-bar-sticky .tab { 
    flex:1; 
    text-align:center; 
    font-size:var(--text-body-bold-size);
    font-weight: var(--text-body-bold-weight);
    padding:12px 4px;
    border-radius: 12px; 
  }
  .tab-bar-sticky .tab:not(.on):hover {
    background: var(--color-surface-active);
    color: var(--color-text-primary);
  }

@media (max-width:768px) {
  .header-title { font-size:var(--text-h2-size) !important; }
  .header-sub { font-size:var(--text-caption-size) !important; }
  .desktop-only { display: none !important; }
  .fab {
    display:flex;
    padding:14px 24px 16px;
    align-items:center;
    justify-content:center;
    position:fixed;
    bottom:80px;
    right:20px;
    z-index:998;
    width:auto;
    height:auto;
    border-radius:12px;
    background: var(--color-brand);
    border: none;
    cursor:pointer;
    font-size:var(--text-body-bold-size);
    font-family: var(--font-family);
    font-weight: var(--text-body-bold-weight);
    color: var(--color-surface-card);
    transition:transform .15s;
    box-shadow: ${tokens.shadows.medium};
  }
  .fab:active { transform:scale(0.93); }
  .tab-bar-sticky {
    bottom:12px; left:16px; right:16px;
    padding:4px;
    border-radius: 16px;
  }
  .mobile-bottom-spacer { height:12px; }
  .mobile-menu-popup {
    animation: mobileMenuSlideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
  .mobile-menu-popup.closing {
    animation: mobileMenuSlideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
}
@keyframes mobileMenuSlideUp {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes mobileMenuSlideDown {
  from { opacity: 1; transform: translateY(0) scale(1); }
  to { opacity: 0; transform: translateY(12px) scale(0.96); }
}
@keyframes mobileMenuFade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mobileMenuFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.mobile-menu-overlay {
  animation: mobileMenuFade 0.3s ease forwards;
}
.mobile-menu-overlay.closing {
  animation: mobileMenuFadeOut 0.25s ease forwards;
}

/* Toast Container & Animation */
.toast-container {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001;
  display: flex;
  flex-direction: column-reverse;
  gap: 10px;
  width: auto;
  pointer-events: none;
}

@keyframes toastIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
@keyframes toastOut {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-20px); opacity: 0; }
}

.toast {
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--color-white);
  padding: 14px 20px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: var(--shadow-strong);
  font-size: var(--text-body-size);
  font-weight: var(--text-subtitle-weight);
  display: flex;
  align-items: center;
  gap: 10px;
  animation: toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  white-space: nowrap;
  pointer-events: auto;
}
.toast.closing {
  animation: toastOut 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@media (max-width: 768px) {
  .toast-container {
    width: calc(100% - 32px);
    bottom: 90px;
  }
  .toast {
    width: 100%;
    box-sizing: border-box;
    white-space: normal;
    text-align: left;
  }
}
@media (min-width:769px) { 
  .mobile-only { display: none !important; }
  .tab-bar-sticky {
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 980px;
  }
  .tab-bar-sticky .tab { max-width: 120px; }
  .mobile-bottom-spacer { height: 12px; } 
}
      `}</style>

      <Container style={{ padding: 0 }}>
        {/* ── HEADER ── */}
        <div style={{ marginBottom: 20 }}>
          <h1
            className="header-title"
            style={{
              fontSize: "var(--text-h1-size)",
              fontWeight: "var(--text-h1-weight)",
              margin: 0,
              letterSpacing: "var(--text-h1-letter-spacing)",
              color: "var(--color-text-primary)",
            }}
          >
            Jejak Harta
          </h1>
          <p
            className="header-sub"
            style={{
              fontSize: "var(--text-subtitle-size)",
              color: "var(--color-text-tertiary)",
              marginTop: 5,
              marginBottom: 0,
            }}
          >
            Return riil · Pajak · Kontribusi per aset · Stress test
          </p>
        </div>

        {activeTab !== "trial_invest" && (
          <>
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
                    background: stats.realReturn >= 0 ? "var(--color-semantic-success-bg)" : "var(--color-semantic-danger-bg)",
                    border: `1.5px solid ${stats.realReturn >= 0 ? "var(--color-semantic-success-border)" : "var(--color-semantic-danger-border)"}`,
                    width: "fit-content",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--text-body-size)",
                      fontWeight: "var(--text-subtitle-weight)",
                      color: stats.realReturn >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                    }}
                  >
                    {stats.realReturn >= 0 ? "+" : ""}{stats.realReturn}% vs inflasi {inflationRate}%/thn
                  </span>
                </div>
                {/* After-Tax iOS toggle */}
                <label className="ios-toggle-wrap">
                  <div
                    className="ios-track"
                    style={{ background: showAfterTax ? "var(--color-semantic-brand)" : "var(--color-border-input)" }}
                    onClick={() => setShowAfterTax((v) => !v)}
                  >
                    <div
                      className="ios-thumb"
                      style={{ transform: showAfterTax ? "translateX(16px)" : "translateX(0)" }}
                    />
                  </div>
                  <span style={{ fontSize: "var(--text-caption-size)", fontWeight: "var(--text-caption-weight)", color: "var(--color-text-secondary)", cursor: "pointer" }}
                    onClick={() => setShowAfterTax((v) => !v)}
                  >
                    After-tax
                  </span>
                </label>
              </div>
              {/* RIGHT: Total Aset */}
              <div style={{ textAlign: "right" }}>
                <div style={{ ...tokens.typography.eyebrow, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
                  Total Aset
                </div>
                <div
                  style={{
                    fontSize: "var(--text-h2-size)",
                    fontWeight: "var(--text-h1-weight)",
                    fontFamily: tokens.typography.fontFamily,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {formatCompact(totalAssets)}
                </div>
                <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-secondary)", marginTop: 2 }}>
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
                  color: "var(--color-semantic-success)",
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
                  color: "var(--color-viz-rdpu)",
                  tip: "Total uang baru yang kamu setorkan ke semua instrumen setiap bulan.",
                },
                {
                  label: "Market Crash",
                  value: formatCompact(worstCase - totalAssets),
                  sub: `Aset jadi ${formatCompact(worstCase)} (${totalAssets > 0 ? ((worstCase / totalAssets - 1) * 100).toFixed(1) : 0}%)`,
                  color: "var(--color-semantic-danger)",
                  tip: "Simulasi saat aset mengalami worst drawdown sekaligus. Ini potensi nilai kerugian (dalam minus) dan nilai akhir portofoliomu.",
                },
              ].map((s, i) => (
                <div key={i} className="stat">
                  <div
                    style={{
                      ...tokens.typography.eyebrow,
                      fontSize: "var(--text-eyebrow-size)",
                      color: "var(--color-text-tertiary)",
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
                      fontSize: "var(--text-h3-size)",
                      fontWeight: "var(--text-h1-weight)",
                      fontFamily: tokens.typography.fontFamily,
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginTop: 3 }}>
                    {s.sub}
                  </div>
                </div>
              ))}
            </div>

            {/* ── PROFIL ALOKASI KAMU (naked, selalu tampil) ── */}
            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  ...tokens.typography.eyebrow,
                  fontSize: "var(--text-eyebrow-size)",
                  color: "var(--color-text-tertiary)",
                  marginBottom: 12,
                }}
              >
                Simpan Profil Alokasi
              </div>
              <div className="profile-row">
                {userTemplates.map((t) => (
                  <motion.div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      gap: 12,
                      cursor: "pointer",
                      border:
                        activeTemplateId === t.id
                          ? `1.5px solid var(--color-border-active)`
                          : `1.5px solid var(--color-border-subtle)`,
                      backgroundColor: "var(--color-surface-card)",
                      borderRadius: 10,
                    }}
                    whileHover={{
                      borderColor: "var(--color-border-active)",
                      boxShadow: "var(--shadow-glow, 0 4px 12px rgba(0,0,0,0.05))"
                    }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => loadUserTemplate(t)}
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
                          fontSize: "var(--text-body-size)",
                          fontWeight: "var(--text-subtitle-weight)",
                          color: "var(--color-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={t.name}
                      >
                        {t.name}
                      </span>
                      <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>
                        {new Date(t.updatedAt).toLocaleDateString("id-ID")}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        borderLeft: `1.5px solid var(--color-surface-input)`,
                        paddingLeft: 10,
                      }}
                    >
                      <motion.button
                        onClick={(e) => updateExistingTemplate(t.id, e)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          background: "var(--color-surface-input)",
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
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16, color: "var(--color-text-secondary)" }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                      </motion.button>
                      <motion.button
                        onClick={(e) => deleteTemplate(t.id, e)}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        style={{
                          background: "var(--color-semantic-danger-bg)",
                          color: "var(--color-semantic-danger)",
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
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                {userTemplates.length < 3 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--color-surface-app)",
                      padding: 6,
                      borderRadius: 10,
                      border: `1.5px dashed var(--color-border-input)`,
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
                        fontSize: "var(--text-caption-size)",
                        fontWeight: "var(--text-caption-weight)",
                        color: "var(--color-text-primary)",
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
                      Save
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
                      border: `1.5px solid var(--color-border-subtle)`,
                      background: "var(--color-surface-app)",
                      color: "var(--color-text-tertiary)",
                      fontSize: "var(--text-caption-size)",
                      fontWeight: "var(--text-caption-weight)",
                      flexShrink: 0,
                      userSelect: "none",
                      cursor: "default",
                      letterSpacing: ".02em",
                    }}
                  >
                    <span style={{ fontSize: "var(--text-body-size)" }}>🔒</span>
                    <span>3 / 3</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── TABS ── */}
        {/* Removed static desktop tabs in favor of floating dock */}

        {/* ══════════════════════════════════════════════
            TAB: INPUT ASET
        ══════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {/* ══════════════════════════════════════════════
              TAB: INPUT ASET
          ══════════════════════════════════════════════ */}
          {activeTab === "input" && (
            <PageTransition key="input">
              <InputTab
                tokens={tokens}
                ASSET_CLASSES={ASSET_CLASSES}
                customUSDRate={customUSDRate}
                setCustomUSDRate={setCustomUSDRate}
                assetCurrencyPrefs={assetCurrencyPrefs}
                setAssetCurrencyPrefs={setAssetCurrencyPrefs}
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
                customReturnOverrides={customReturnOverrides}
                setCustomReturnOverrides={setCustomReturnOverrides}
                customDrawdowns={customDrawdowns}
                setCustomDrawdowns={setCustomDrawdowns}
                addAsset={addAsset}
                removeAsset={removeAsset}
                handleStep={handleStep}
                handleContribStep={handleContribStep}
                handleExpenseStep={handleExpenseStep}
              />
            </PageTransition>
          )}

          {/* ══════════════════════════════════════════════
              TAB: PROYEKSI & ALOKASI
          ══════════════════════════════════════════════ */}
          {activeTab === "projection" && (
            <PageTransition key="projection">
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
                totalAssets={totalAssets}
                worstCase={worstCase}
                allocData={allocData}
                monthlyContribs={monthlyContribs}
                afterTaxReturn={afterTaxReturn}
              />
            </PageTransition>
          )}

          {/* ══════════════════════════════════════════════
              TAB: TRIAL INVEST
          ══════════════════════════════════════════════ */}
          {activeTab === "trial_invest" && (
            <PageTransition key="trial_invest">
              <KalkulatorPensiun
                userTemplates={userTemplates}
                ASSET_CLASSES={ASSET_CLASSES}
                tokens={tokens}
              />
            </PageTransition>
          )}
        </AnimatePresence>

        <div className="mobile-bottom-spacer" />

        {/* ── DISCLAIMER ── */}
        {activeTab !== "trial_invest" && (
          <div className="disc">
            <strong>⚠️ Disclaimer:</strong> Seluruh perhitungan bersifat simulasi
            edukatif berdasarkan data historis dan tidak menjamin hasil investasi di
            masa depan. Angka return yang digunakan merupakan estimasi rata-rata
            yang sudah disesuaikan dengan pajak (untuk After-tax) dan inflasi.
            Selalu lakukan riset mandiri atau konsultasikan dengan penasihat
            keuangan profesional sebelum mengambil keputusan investasi.
          </div>
        )}

        {/* ── FLOATING BOTTOM DOCK ── */}
        <div className="tab-bar-sticky" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 4, flex: 1 }}>
            {[
              ["input", "Input"],
              ["projection", "Proyeksi"],
            ].map(([id, lbl]) => (
              <motion.button
                key={id}
                className={`tab ${activeTab === id ? "on" : ""}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
                style={{ color: activeTab === id ? "var(--color-surface-card)" : "var(--color-text-tertiary)", width: "100%", border: "none" }}
              >
                {lbl}
              </motion.button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "none", justifyContent: "flex-end" }}>
            <div className="desktop-only" style={{ width: "1.5px", height: "24px", background: "var(--color-border-subtle)", borderRadius: "1px" }} />
            <motion.button
              className={`tab desktop-only ${activeTab === "trial_invest" ? "on" : ""}`}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab("trial_invest")}
              style={{ 
                color: activeTab === "trial_invest" ? "var(--color-surface-card)" : "var(--color-text-tertiary)", 
                width: "auto", 
                maxWidth: "none", 
                whiteSpace: "nowrap", 
                padding: "12px 20px",
                border: "none"
              }}
            >
              Kalkulator Pensiun
            </motion.button>
            <motion.button
              className={`tab mobile-only ${isMobileMenuOpen ? "on" : ""}`}
              whileTap={{ scale: 0.98 }}
              onClick={handleToggleMobileMenu}
              style={{
                color: isMobileMenuOpen ? "var(--color-surface-card)" : "var(--color-text-tertiary)",
                width: "auto",
                height: 48,
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "none"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* ── MOBILE POPUP MENU OVERLAY ── */}
        {(isMobileMenuOpen || isMobileMenuClosing) && (
          <div
            className={`mobile-only mobile-menu-overlay ${isMobileMenuClosing ? "closing" : ""}`}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'var(--color-overlay)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 998,
            }}
            onClick={handleToggleMobileMenu}
          />
        )}

        {/* ── MOBILE POPUP MENU ── */}
        {(isMobileMenuOpen || isMobileMenuClosing) && (
          <div
            className={`mobile-only mobile-menu-popup ${isMobileMenuClosing ? "closing" : ""}`}
            style={{
              position: 'fixed',
              bottom: '80px',
              left: '16px',
              right: '16px',
              backgroundColor: 'var(--color-surface-card)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1.5px solid var(--color-border-subtle)',
              borderRadius: '16px',
              padding: '4px',
              boxShadow: tokens.shadows.medium,
              zIndex: 999,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <button
              className="tab"
              onClick={() => { setActiveTab("trial_invest"); setIsMobileMenuOpen(false); }}
              style={{
                background: activeTab === "trial_invest" ? "var(--color-brand)" : "transparent",
                color: activeTab === "trial_invest" ? "var(--color-surface-card)" : "var(--color-text-tertiary)",
                width: "100%",
                textAlign: "center",
                padding: "16px 4px",
                fontSize: "var(--text-body-bold-size)",
                fontWeight: "var(--text-body-bold-weight)",
                borderRadius: "12px",
                border: "none",
                display: "flex",
                alignItems: "center",
                transition: "all 0.2s",
                justifyContent: "center",
              }}
            >
              Kalkulator Pensiun
            </button>
          </div>
        )}

        {/* ── TOAST NOTIFICATIONS (Stacked) ── */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.isClosing ? "closing" : ""}`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {t.message}
            </div>
          ))}
        </div>

        <Analytics />

        {/* ── CONFIRM DIALOG MODAL ── */}
        <AnimatePresence>
          {modalAction.isOpen && (
            <motion.div
              onClick={closeModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "auto",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--color-overlay)",
                backdropFilter: "blur(4px)",
                padding: "16px",
              }}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
                style={{
                  backgroundColor: "var(--color-surface-card)",
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-border-subtle)",
                  boxShadow: "var(--shadow-xl)",
                  width: "100%",
                  maxWidth: "360px",
                  padding: "20px",
                  textAlign: "center"
                }}
              >
                <p style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-body-weight)", color: "var(--color-text-primary)", lineHeight: "var(--text-body-line-height)", marginBottom: "22px", fontFamily: tokens.typography.fontFamily }}>
                  {modalAction.title}
                </p>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  {modalAction.type === "info" ? (
                    <button
                      onClick={closeModal}
                      style={{
                        width: "100%",
                        padding: "14px 0", borderRadius: "10px", border: "none",
                        background: "var(--color-semantic-brand)", color: "var(--color-white)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
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
                          padding: "12px 0", borderRadius: "8px", border: `1.5px solid var(--color-border-subtle)`,
                          background: "var(--color-surface-input)", color: "var(--color-text-secondary)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
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
                                    customReturns: { ...customReturnOverrides },
                                    customDrawdowns: { ...customDrawdowns },
                                    customUSDRate: customUSDRate,
                                    assetCurrencyPrefs: { ...assetCurrencyPrefs },
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
                          background: modalAction.type === "delete" ? "var(--color-semantic-danger)" : "var(--color-semantic-brand)",
                          color: "var(--color-white)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
                          cursor: "pointer", fontFamily: tokens.typography.fontFamily
                        }}
                      >
                        {modalAction.type === "delete" ? "Hapus" : "Ya, Update"}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </Container>
    </div >
  );
}
