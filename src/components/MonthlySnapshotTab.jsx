import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  parseYearMonth,
  formatYearMonth,
  calculateMonthlyNetReturn,
  afterTaxReturn,
} from "../utils/formatters";

// Slide animation variants for modal/dropdowns
const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
};

const popoverVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
};

const MONTHS_INDO = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTHS_INDO_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
];

export default function MonthlySnapshotTab({
  tokens,
  ASSET_CLASSES,
  customUSDRate,
  assetCurrencyPrefs,
  activeAssetIds,
  setActiveAssetIds,
  monthlySnapshots,
  addSnapshot,
  updateSnapshot,
  deleteSnapshot,
  deleteAllSnapshots,
  assets,
  monthlyContribs,
  customReturnOverrides,
  showAfterTax,
  formatIDR,
  formatCompact,
  parseExpression,
  formatWhileTyping,
  activeTemplateId,
  userTemplates,
}) {
  // --- MOBILE SCREEN STATE ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- UI STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null); // null for new, snapshot object for edit
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState(null); // snapshot object for single delete confirmation

  // --- FORM STATES ---
  const [formMonth, setFormMonth] = useState(""); // YYYY-MM
  const [formAssetValues, setFormAssetValues] = useState({});
  const [formNotes, setFormNotes] = useState("");

  // --- CUSTOM MONTH PICKER STATES ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const pickerRef = useRef(null);

  // Close month picker popover on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sort snapshots for calculations
  const sortedSnapshots = useMemo(() => {
    return [...monthlySnapshots].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [monthlySnapshots]);

  // --- INITIAL PORTFOLIO VALUE (Month 0) ---
  const initialPortfolioValue = useMemo(() => {
    return Object.entries(assets).reduce((sum, [id, val]) => {
      const cls = ASSET_CLASSES.find((c) => c.id === id);
      if (!cls) return sum;
      const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
      return sum + (pref === "USD" ? val * customUSDRate : val);
    }, 0);
  }, [assets, customUSDRate, assetCurrencyPrefs, ASSET_CLASSES]);

  // --- DERIVED METRICS ---
  
  // 1. Total Portfolio Actual (Latest snapshot total)
  const latestSnapshot = useMemo(() => {
    if (sortedSnapshots.length === 0) return null;
    return sortedSnapshots[sortedSnapshots.length - 1];
  }, [sortedSnapshots]);

  const latestPortfolioValue = useMemo(() => {
    if (!latestSnapshot) return 0;
    return Object.entries(latestSnapshot.assetValues).reduce((sum, [id, val]) => {
      const cls = ASSET_CLASSES.find((c) => c.id === id);
      if (!cls) return sum;
      const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
      return sum + (pref === "USD" ? val * customUSDRate : val);
    }, 0);
  }, [latestSnapshot, customUSDRate, assetCurrencyPrefs, ASSET_CLASSES]);

  // 2. Net Inflow per Snapshot calculations
  const snapshotsWithMetrics = useMemo(() => {
    const list = [];
    
    sortedSnapshots.forEach((snap, idx) => {
      const currentYM = snap.yearMonth;
      
      // Calculate current total in IDR
      const totalIDR = Object.entries(snap.assetValues).reduce((sum, [id, val]) => {
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        if (!cls) return sum;
        const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
        return sum + (pref === "USD" ? val * customUSDRate : val);
      }, 0);

      // Determine previous month balances
      let prevAssets = null;
      let prevTotalIDR = 0;
      if (idx === 0) {
        prevAssets = assets;
        prevTotalIDR = initialPortfolioValue;
      } else {
        prevAssets = sortedSnapshots[idx - 1].assetValues;
        prevTotalIDR = Object.entries(prevAssets).reduce((sum, [id, val]) => {
          const cls = ASSET_CLASSES.find((c) => c.id === id);
          if (!cls) return sum;
          const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
          return sum + (pref === "USD" ? val * customUSDRate : val);
        }, 0);
      }

      // Calculate Net Inflow
      let netInflow = 0;
      Object.entries(snap.assetValues).forEach(([id, val]) => {
        const cls = ASSET_CLASSES.find((c) => c.id === id);
        if (!cls) return;
        const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
        const prevVal = prevAssets[id] || 0;
        
        const baseR = customReturnOverrides[id] !== undefined ? customReturnOverrides[id] : cls.return;
        const rMonthly = calculateMonthlyNetReturn(cls, baseR);
        
        const expectedVal = prevVal * (1 + rMonthly);
        const inflowVal = val - expectedVal;
        
        const inflowValIDR = pref === "USD" ? inflowVal * customUSDRate : inflowVal;
        netInflow += inflowValIDR;
      });

      // Calculate actual rate of return for this month
      let returnRate = 0;
      if (prevTotalIDR > 0) {
        returnRate = (totalIDR - (idx === 0 ? totalIDR - prevTotalIDR : netInflow)) / prevTotalIDR - 1;
      }

      list.push({
        ...snap,
        totalPortfolio: totalIDR,
        netInflow: idx === 0 ? totalIDR - prevTotalIDR : netInflow,
        prevTotalPortfolio: prevTotalIDR,
        monthlyReturnRate: returnRate,
      });
    });

    return list;
  }, [sortedSnapshots, assets, initialPortfolioValue, customReturnOverrides, customUSDRate, assetCurrencyPrefs, ASSET_CLASSES]);

  // 3. Rata-rata Kenaikan Bulanan (Rupiah)
  const averageMonthlyIncrease = useMemo(() => {
    if (snapshotsWithMetrics.length === 0) return 0;
    const totalIncrease = snapshotsWithMetrics.reduce((sum, snap) => sum + (snap.totalPortfolio - snap.prevTotalPortfolio), 0);
    return totalIncrease / snapshotsWithMetrics.length;
  }, [snapshotsWithMetrics]);

  // 4. Portfolio Growth Percentage
  const growthPercentage = useMemo(() => {
    if (initialPortfolioValue === 0) return 0;
    return ((latestPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;
  }, [latestPortfolioValue, initialPortfolioValue]);

  // 5. Average Monthly Return Rate
  const averageMonthlyReturn = useMemo(() => {
    if (snapshotsWithMetrics.length === 0) return 0;
    const sumRates = snapshotsWithMetrics.reduce((sum, snap) => sum + snap.monthlyReturnRate, 0);
    return (sumRates / snapshotsWithMetrics.length) * 100;
  }, [snapshotsWithMetrics]);

  // --- ASSET DRIFT COMPARISON ---
  const assetDriftData = useMemo(() => {
    if (!latestSnapshot) return [];

    const initialTotalIDR = Object.entries(assets).reduce((sum, [id, val]) => {
      const cls = ASSET_CLASSES.find((c) => c.id === id);
      if (!cls) return sum;
      const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
      return sum + (pref === "USD" ? val * customUSDRate : val);
    }, 0);

    const actualTotalIDR = Object.entries(latestSnapshot.assetValues).reduce((sum, [id, val]) => {
      const cls = ASSET_CLASSES.find((c) => c.id === id);
      if (!cls) return sum;
      const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
      return sum + (pref === "USD" ? val * customUSDRate : val);
    }, 0);

    return ASSET_CLASSES.map((cls) => {
      const initVal = assets[cls.id] || 0;
      const initPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
      const initValIDR = initPref === "USD" ? initVal * customUSDRate : initVal;
      const initWeight = initialTotalIDR > 0 ? (initValIDR / initialTotalIDR) * 100 : 0;

      const actVal = latestSnapshot.assetValues[cls.id] || 0;
      const actPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
      const actValIDR = actPref === "USD" ? actVal * customUSDRate : actVal;
      const actWeight = actualTotalIDR > 0 ? (actValIDR / actualTotalIDR) * 100 : 0;

      const drift = actWeight - initWeight;

      return {
        ...cls,
        initVal,
        initValIDR,
        initWeight,
        actVal,
        actValIDR,
        actWeight,
        drift,
        pref: actPref,
      };
    }).filter(item => item.initValIDR > 0 || item.actValIDR > 0);
  }, [assets, latestSnapshot, ASSET_CLASSES, customUSDRate, assetCurrencyPrefs]);

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    if (sortedSnapshots.length === 0) return [];
    
    const earliestYM = sortedSnapshots[0].yearMonth;
    const earliestMonths = parseYearMonth(earliestYM);
    const baseMonths = earliestMonths - 1; // Month 0
    
    const latestYM = sortedSnapshots[sortedSnapshots.length - 1].yearMonth;
    const latestMonths = parseYearMonth(latestYM);
    
    const maxMonths = Math.max(latestMonths - baseMonths + 3, 12);
    const dataList = [];
    
    for (let m = 0; m <= maxMonths; m++) {
      const currentYM = formatYearMonth(baseMonths + m);
      
      // A. Calculate Plan Total for Month m
      let planTotal = 0;
      ASSET_CLASSES.forEach((cls) => {
        const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
        const init = pref === "USD" ? (assets[cls.id] || 0) * customUSDRate : assets[cls.id] || 0;
        const mc = pref === "USD" ? (monthlyContribs[cls.id] || 0) * customUSDRate : monthlyContribs[cls.id] || 0;
        const baseR = customReturnOverrides[cls.id] !== undefined ? customReturnOverrides[cls.id] : cls.return;
        const r = (showAfterTax ? afterTaxReturn(cls, baseR) : baseR) / 100;
        const rMonthly = Math.pow(1 + r, 1 / 12) - 1;
        
        let val = init;
        for (let i = 0; i < m; i++) {
          val = val * (1 + rMonthly) + mc;
        }
        planTotal += val;
      });

      // B. Calculate Actual Total for Month m
      const exactSnap = sortedSnapshots.find((s) => s.yearMonth === currentYM);
      let actualTotal = 0;

      if (m === 0) {
        actualTotal = initialPortfolioValue;
      } else if (exactSnap) {
        actualTotal = Object.entries(exactSnap.assetValues).reduce((sum, [id, val]) => {
          const cls = ASSET_CLASSES.find((c) => c.id === id);
          if (!cls) return sum;
          const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
          return sum + (pref === "USD" ? val * customUSDRate : val);
        }, 0);
      } else {
        // Project forward from latest snapshot before month m
        const latestSnapBefore = [...sortedSnapshots].reverse().find(
          (s) => parseYearMonth(s.yearMonth) - baseMonths < m
        );
        
        if (latestSnapBefore) {
          const snapRelM = parseYearMonth(latestSnapBefore.yearMonth) - baseMonths;
          ASSET_CLASSES.forEach((cls) => {
            const pref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
            const snapVal = latestSnapBefore.assetValues[cls.id] || 0;
            const startVal = pref === "USD" ? snapVal * customUSDRate : snapVal;
            const mc = pref === "USD"
              ? (monthlyContribs[cls.id] || 0) * customUSDRate
              : monthlyContribs[cls.id] || 0;
            const baseR = customReturnOverrides[cls.id] !== undefined ? customReturnOverrides[cls.id] : cls.return;
            const r = (showAfterTax ? afterTaxReturn(cls, baseR) : baseR) / 100;
            const rMonthly = Math.pow(1 + r, 1 / 12) - 1;
            
            let val = startVal;
            for (let i = 0; i < m - snapRelM; i++) {
              val = val * (1 + rMonthly) + mc;
            }
            actualTotal += val;
          });
        } else {
          actualTotal = planTotal;
        }
      }

      const date = new Date(
        baseMonths + m >= 0 ? Math.floor((baseMonths + m) / 12) : 2026,
        (baseMonths + m) % 12,
        1
      );
      const label = date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

      // Connected data logic:
      // - Aktual ends exactly at index (latestMonths - baseMonths)
      // - ProyeksiAktual starts exactly at index (latestMonths - baseMonths)
      dataList.push({
        label,
        Plan: Math.round(planTotal),
        Aktual: m <= latestMonths - baseMonths ? Math.round(actualTotal) : undefined,
        ProyeksiAktual: m >= latestMonths - baseMonths ? Math.round(actualTotal) : undefined,
      });
    }

    return dataList;
  }, [sortedSnapshots, assets, monthlyContribs, customReturnOverrides, showAfterTax, customUSDRate, assetCurrencyPrefs, snapshotsWithMetrics, initialPortfolioValue]);

  // --- CRUD TRIGGERS ---
  const handleOpenAddModal = () => {
    setEditingSnapshot(null);
    
    // Auto-calculate next month
    let nextMonthYM = "";
    if (sortedSnapshots.length > 0) {
      const lastYM = sortedSnapshots[sortedSnapshots.length - 1].yearMonth;
      nextMonthYM = formatYearMonth(parseYearMonth(lastYM) + 1);
    } else {
      const now = new Date();
      nextMonthYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    
    // Check if next month is in the future
    const now = new Date();
    const currentYMInt = now.getFullYear() * 12 + now.getMonth();
    const [ny, nm] = nextMonthYM.split("-").map(Number);
    
    if (ny * 12 + (nm - 1) > currentYMInt) {
      nextMonthYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    setFormMonth(nextMonthYM);
    
    const [y] = nextMonthYM.split("-").map(Number);
    setPickerYear(y);

    const initialValues = {};
    ASSET_CLASSES.forEach((c) => {
      if (sortedSnapshots.length > 0) {
        initialValues[c.id] = sortedSnapshots[sortedSnapshots.length - 1].assetValues[c.id] || 0;
      } else {
        initialValues[c.id] = assets[c.id] || 0;
      }
    });
    
    setFormAssetValues(initialValues);
    setFormNotes("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (snap) => {
    setEditingSnapshot(snap);
    setFormMonth(snap.yearMonth);
    
    const [y] = snap.yearMonth.split("-").map(Number);
    setPickerYear(y);

    const assetVals = {};
    ASSET_CLASSES.forEach((c) => {
      assetVals[c.id] = snap.assetValues[c.id] || 0;
    });
    
    setFormAssetValues(assetVals);
    setFormNotes(snap.notes || "");
    setIsModalOpen(true);
  };

  const handleCopyFromLast = () => {
    if (sortedSnapshots.length === 0) return;
    const lastSnap = sortedSnapshots[sortedSnapshots.length - 1];
    const copiedVals = {};
    ASSET_CLASSES.forEach((c) => {
      copiedVals[c.id] = lastSnap.assetValues[c.id] || 0;
    });
    setFormAssetValues(copiedVals);
  };

  const handleAssetInputChange = (id, str) => {
    const evaluated = parseExpression(str);
    setFormAssetValues((prev) => ({
      ...prev,
      [id]: evaluated !== null ? evaluated : 0,
    }));
  };

  // --- IN-MODAL ASSET ADD/REMOVE TOGGLE ---
  const handleToggleAsset = (id) => {
    if (activeAssetIds.includes(id)) {
      setActiveAssetIds((prev) => prev.filter((aid) => aid !== id));
      setFormAssetValues((prev) => ({ ...prev, [id]: 0 }));
    } else {
      setActiveAssetIds((prev) => [...prev, id]);
    }
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formMonth) return;

    const cleanedValues = {};
    ASSET_CLASSES.forEach((c) => {
      if (activeAssetIds.includes(c.id)) {
        cleanedValues[c.id] = Math.max(0, formAssetValues[c.id] || 0);
      } else {
        cleanedValues[c.id] = 0;
      }
    });

    if (editingSnapshot) {
      updateSnapshot(editingSnapshot.id, cleanedValues, formNotes);
    } else {
      const success = addSnapshot({
        id: formMonth,
        yearMonth: formMonth,
        assetValues: cleanedValues,
        notes: formNotes,
      });
      if (!success) return;
    }
    setIsModalOpen(false);
  };

  const formatMonthLabelLong = (ym) => {
    if (!ym) return "";
    const [y, m] = ym.split("-").map(Number);
    return `${MONTHS_INDO[m - 1]} ${y}`;
  };

  const formatMonthLabelShort = (ym) => {
    if (!ym) return "";
    const [y, m] = ym.split("-").map(Number);
    return `${MONTHS_INDO_SHORT[m - 1]} ${String(y).substring(2)}`;
  };

  const handleSelectMonthYear = (monthIdx) => {
    const monthStr = String(monthIdx + 1).padStart(2, "0");
    const ym = `${pickerYear}-${monthStr}`;
    setFormMonth(ym);
    setPickerOpen(false);
  };

  if (!activeTemplateId) {
    return (
      <div
        style={{
          background: "var(--color-surface-card)",
          border: "1.5px solid var(--color-border-subtle)",
          borderRadius: 20,
          padding: "60px 30px",
          textAlign: "center",
          boxShadow: tokens.shadows.medium,
          maxWidth: 680,
          margin: "40px auto 20px auto",
          backdropFilter: "blur(16px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-surface-input) 0%, rgba(30, 41, 59, 0.4) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-semantic-warning)",
            border: "1.5px solid var(--color-border-subtle)",
            fontSize: 32,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          ⚠️
        </div>
        <div>
          <h2
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h2-weight)",
              color: "var(--color-text-primary)",
              margin: "0 0 10px 0",
            }}
          >
            Pilih Profil Anda Terlebih Dahulu
          </h2>
          <p
            style={{
              fontSize: "var(--text-body-size)",
              color: "var(--color-text-tertiary)",
              lineHeight: 1.6,
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            Catatan Snapshot Bulanan memerlukan basis data rencana awal agar komparasi dan kalkulasi return bulanan aktual berjalan akurat.
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>
          *Setiap profil menyimpan snapshot independennya sendiri secara rapi dan otomatis.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER ACTION CONTROLS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h2-weight)",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Catatan Bulanan Aktual
          </h2>
          <p
            style={{
              fontSize: "var(--text-caption-size)",
              color: "var(--color-text-tertiary)",
              margin: "4px 0 0 0",
            }}
          >
            Bandingkan saldo aktual Anda dengan rencana awal.
            <span style={{ color: "var(--color-semantic-brand)", marginLeft: 6, fontWeight: "bold" }}>
              👤 Profil Aktif: {userTemplates.find((t) => t.id === activeTemplateId)?.name}
            </span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAddModal}
            style={{
              flex: 1,
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-semantic-brand)",
              color: "var(--color-white)",
              fontWeight: "var(--text-body-bold-weight)",
              fontSize: "var(--text-caption-size)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              style={{ width: 14, height: 14 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Catat Bulan Ini
          </motion.button>
        </div>
      </div>

      {snapshotsWithMetrics.length === 0 ? (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 20,
            padding: "80px 30px",
            textAlign: "center",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "var(--color-surface-input)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-tertiary)",
              border: "1.5px solid var(--color-border-subtle)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 32, height: 32 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
            </svg>
          </div>
          <div>
            <h2
              style={{
                fontSize: "var(--text-h2-size)",
                fontWeight: "var(--text-h2-weight)",
                color: "var(--color-text-primary)",
                margin: "0 0 10px 0",
              }}
            >
              Belum Ada Snapshot Bulanan
            </h2>
            <p
              style={{
                fontSize: "var(--text-body-size)",
                color: "var(--color-text-tertiary)",
                lineHeight: 1.6,
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              Catatan Snapshot Bulanan memerlukan basis data rencana awal agar komparasi dan kalkulasi return bulanan aktual berjalan akurat. Mulai catat perkembangan saldo riil Anda untuk melihat analisis pergeseran alokasi dan grafik perkembangan.
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAddModal}
            style={{
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-semantic-brand)",
              color: "var(--color-white)",
              fontWeight: "var(--text-body-bold-weight)",
              fontSize: "var(--text-body-size)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              style={{ width: 16, height: 16 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Catat Snapshot Pertama Anda
          </motion.button>
        </div>
      ) : (
        <>
          {/* STRIPE-LIKE 4 EQUAL CARDS FINTECH DASHBOARD GRID - STRICTLY NO GRADIENTS */}
          <div
            className={isMobile ? "stat-strip" : ""}
            style={
              isMobile
                ? {
                    display: "flex",
                    flexDirection: "row",
                    gap: 8,
                    overflowX: "auto",
                    margin: "-4px -16px 8px -16px",
                    padding: "4px 16px 8px 16px",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }
                : {
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 16,
                  }
            }
          >
        {/* CARD 1: TOTAL PORTFOLIO */}
        <motion.div
          whileHover={{ y: -4, borderColor: "var(--color-semantic-brand)", boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: isMobile ? "14px 16px" : "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: "var(--shadow-sm)",
            flexShrink: isMobile ? 0 : 1,
            minWidth: isMobile ? "180px" : "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Portofolio Aktual
            </span>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--color-surface-input)",
                color: "var(--color-semantic-success)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {/* Wallet/Vault SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1v-4Z" />
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: "var(--color-text-primary)", letterSpacing: "-0.5px" }}>
              {formatCompact(latestPortfolioValue)}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              {/* Clean Custom SVG Calendar */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 10, height: 10, color: "var(--color-text-tertiary)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <span>{latestSnapshot ? formatMonthLabelShort(latestSnapshot.yearMonth) : "Belum dicatat"}</span>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: AVERAGE MONTHLY INCREASE IN RUPIAH */}
        <motion.div
          whileHover={{ y: -4, borderColor: "var(--color-semantic-brand)", boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: isMobile ? "14px 16px" : "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: "var(--shadow-sm)",
            flexShrink: isMobile ? 0 : 1,
            minWidth: isMobile ? "180px" : "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Rata-rata Kenaikan Bulanan
            </span>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--color-surface-input)",
                color: "var(--color-semantic-brand)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {/* Up Trend Arrow SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: averageMonthlyIncrease >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)", letterSpacing: "-0.5px" }}>
              {averageMonthlyIncrease >= 0 ? "+" : ""}{formatCompact(averageMonthlyIncrease)}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Rata-rata pertumbuhan saldo per bulan
            </div>
          </div>
        </motion.div>

        {/* CARD 3: GROWTH PERCENTAGE */}
        <motion.div
          whileHover={{ y: -4, borderColor: "var(--color-semantic-brand)", boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: isMobile ? "14px 16px" : "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: "var(--shadow-sm)",
            flexShrink: isMobile ? 0 : 1,
            minWidth: isMobile ? "180px" : "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Kenaikan Portofolio
            </span>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--color-surface-input)",
                color: "var(--color-semantic-success)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {/* Line chart trend-up SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 10.125-5.5M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 10.125-5.5M19.5 7.5v6m0-6h-6" />
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: growthPercentage >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)", letterSpacing: "-0.5px" }}>
              {growthPercentage >= 0 ? "▲" : "▼"} {Math.abs(growthPercentage).toFixed(2)}%
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Perkembangan vs modal awal
            </div>
          </div>
        </motion.div>

        {/* CARD 4: AVERAGE MONTHLY RETURN */}
        <motion.div
          whileHover={{ y: -4, borderColor: "var(--color-semantic-brand)", boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: isMobile ? "14px 16px" : "20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 12,
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: "var(--shadow-sm)",
            flexShrink: isMobile ? 0 : 1,
            minWidth: isMobile ? "180px" : "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Rata-rata Return Bulanan
            </span>
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "var(--color-surface-input)",
                color: "var(--color-semantic-warning)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}
            >
              {/* Sparkles / Compound growth SVG */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.188.904zM19.006 5.005l-.506 3.495-3.5.5.5-3.5L19.006 5.005z" />
              </svg>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "26px", fontWeight: "900", color: averageMonthlyReturn >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)", letterSpacing: "-0.5px" }}>
              {averageMonthlyReturn >= 0 ? "+" : ""}{averageMonthlyReturn.toFixed(2)}%
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Return riil bersih per bulan
            </div>
          </div>
        </motion.div>
      </div>

      {/* GRAPH CONTAINER & SNAPSHOT HISTORY */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* GRAPH SECTION - 100% GRADIENT FREE */}
        <div style={{ width: "100%" }}>
          <div
            style={{
              background: "var(--color-surface-card)",
              border: "1.5px solid var(--color-border-subtle)",
              borderRadius: 20,
              padding: isMobile ? "16px" : "24px",
              boxShadow: tokens.shadows.small,
            }}
          >
            <h3
              style={{
                fontSize: "var(--text-subtitle-size)",
                fontWeight: "bold",
                color: "var(--color-text-primary)",
                margin: "0 0 16px 0",
                letterSpacing: "-0.2px"
              }}
            >
              Kurva Perkembangan: Aktual vs Rencana
            </h3>
            
            {/* Premium Legend Row */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
              {[
                { label: "Rencana (Plan)", color: "var(--color-semantic-brand)", dashed: true },
                { label: "Aktual (Realisasi)", color: "var(--color-semantic-success)", dashed: false },
                { label: "Proyeksi dari Aktual", color: "var(--color-semantic-success)", dashed: true },
              ].map((leg, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 20,
                      height: leg.dashed ? 0 : 3,
                      borderRadius: 3,
                      background: leg.dashed ? "transparent" : leg.color,
                      borderTop: leg.dashed ? `2px dashed ${leg.color}` : "none",
                    }}
                  />
                  <span style={{ fontSize: 11, fontWeight: "500", color: "var(--color-text-secondary)" }}>
                    {leg.label}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ width: "100%", height: isMobile ? 220 : 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.02)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="var(--color-text-tertiary)"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(val) => formatCompact(val).replace("Rp ", "")}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-surface-card)",
                      border: "1.5px solid var(--color-border-subtle)",
                      borderRadius: "12px",
                      color: "var(--color-text-primary)",
                      fontSize: 12,
                      backdropFilter: "blur(8px)",
                      boxShadow: "var(--shadow-xl)"
                    }}
                    formatter={(value, name) => [formatIDR(value), name]}
                  />
                  {/* Sleek Dashed Curve for Plan - 100% Gradient-Free */}
                  <Line
                    type="monotone"
                    name="Rencana"
                    dataKey="Plan"
                    stroke="var(--color-semantic-brand)"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  {/* Thick Glowing Solid Curve for Actual - 100% Gradient-Free (No Area fills!) */}
                  <Line
                    type="monotone"
                    name="Aktual"
                    dataKey="Aktual"
                    stroke="var(--color-semantic-success)"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--color-semantic-success)", stroke: "var(--color-surface-card)", strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  {/* Seamless Connected Projected Actual Line */}
                  <Line
                    type="monotone"
                    name="Proyeksi dari Aktual"
                    dataKey="ProyeksiAktual"
                    stroke="var(--color-semantic-success)"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p
              style={{
                fontSize: 10,
                color: "var(--color-text-tertiary)",
                textAlign: "center",
                margin: "12px 0 0 0",
              }}
            >
              Catatan: Aset USD dikonversi menggunakan kurs saat ini ({formatIDR(customUSDRate)}).
            </p>
          </div>
        </div>

        {/* HISTORY CONTAINER */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: tokens.shadows.small,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1.5px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "bold", color: "var(--color-text-primary)", margin: 0 }}>
              Riwayat Snapshot Bulanan
            </h3>
            {monthlySnapshots.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsDeleteAllOpen(true)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1.5px solid var(--color-semantic-danger)",
                  background: "transparent",
                  color: "var(--color-semantic-danger)",
                  fontWeight: "var(--text-body-bold-weight)",
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                Hapus Semua
              </motion.button>
            )}
          </div>
          
          <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--color-border-subtle)", background: "var(--color-surface-app)" }}>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Bulan</th>
                    <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Total Saldo Aktual</th>
                    <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Net Inflow</th>
                    <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold", maxWidth: "220px" }}>Catatan</th>
                    <th style={{ padding: "12px 20px", textAlign: "center", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold", width: 100 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...snapshotsWithMetrics].reverse().map((snap) => (
                    <tr
                      key={snap.id}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-input)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "14px 20px", fontSize: "var(--text-body-size)", color: "var(--color-text-primary)", fontWeight: "bold" }}>
                        {formatMonthLabelLong(snap.yearMonth)}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right", fontSize: "var(--text-body-size)", color: "var(--color-text-primary)" }}>
                        {formatIDR(snap.totalPortfolio)}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          textAlign: "right",
                          fontSize: "var(--text-body-size)",
                          fontWeight: "var(--text-body-bold-weight)",
                          color:
                            snap.netInflow >= 0
                              ? "var(--color-semantic-success)"
                              : "var(--color-semantic-danger)",
                        }}
                      >
                        {snap.netInflow >= 0 ? "+" : ""}
                        {formatIDR(snap.netInflow)}
                      </td>
                      <td
                        style={{
                          padding: "14px 20px",
                          fontSize: "var(--text-caption-size)",
                          color: "var(--color-text-secondary)",
                          maxWidth: "220px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={snap.notes || undefined}
                      >
                        {snap.notes || <span style={{ color: "var(--color-text-tertiary)" }}>-</span>}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "center" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
                          <button
                            onClick={() => handleOpenEditModal(snap)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--color-text-secondary)",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setSnapshotToDelete(snap)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--color-semantic-danger)",
                              cursor: "pointer",
                              padding: 4,
                            }}
                            title="Hapus"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      {/* ASSET DRIFT / COMPARISON SECTION */}
      {latestSnapshot && assetDriftData.length > 0 && (
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: tokens.shadows.small,
            marginTop: 8,
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1.5px solid var(--color-border-subtle)",
            }}
          >
            <h3 style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "bold", color: "var(--color-text-primary)", margin: 0 }}>
              Pergeseran Alokasi (Asset Drift)
            </h3>
          </div>
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--color-border-subtle)", background: "var(--color-surface-app)" }}>
                  <th style={{ padding: "14px 20px", textAlign: "left", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Alokasi Aset</th>
                  <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Rencana Awal</th>
                  <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Snapshot Terbaru ({formatMonthLabelLong(latestSnapshot.yearMonth)})</th>
                  <th style={{ padding: "14px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Perubahan Alokasi</th>
                </tr>
              </thead>
              <tbody>
                {assetDriftData.map((item) => {
                  const diffValIDR = item.actValIDR - item.initValIDR;
                  const diffWeight = item.actWeight - item.initWeight;
                  
                  const isPositive = diffValIDR > 0;
                  const isNegative = diffValIDR <= 0;
                  
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid var(--color-border-subtle)",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface-input)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Asset name & Icon */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: item.color || "var(--color-semantic-brand)",
                              }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: "bold", color: "var(--color-text-primary)" }}>
                              {item.name}
                            </span>
                            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", textTransform: "uppercase" }}>
                              {item.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Rencana Awal */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: "500", color: "var(--color-text-primary)" }}>
                          {formatIDR(item.initValIDR)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          {item.initWeight.toFixed(1)}% alokasi
                        </div>
                      </td>
                      
                      {/* Snapshot Terbaru */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: "500", color: "var(--color-text-primary)" }}>
                          {formatIDR(item.actValIDR)}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                          {item.actWeight.toFixed(1)}% alokasi
                        </div>
                      </td>
                      
                      {/* Perubahan Alokasi */}
                      <td
                        style={{
                          padding: "14px 20px",
                          textAlign: "right",
                          background: isPositive
                            ? "rgba(16, 185, 129, 0.06)"
                            : isNegative
                            ? "rgba(239, 68, 68, 0.06)"
                            : "transparent",
                          color: isPositive
                            ? "var(--color-semantic-success)"
                            : isNegative
                            ? "var(--color-semantic-danger)"
                            : "var(--color-text-secondary)",
                          fontWeight: "bold",
                        }}
                      >
                        <div style={{ fontSize: 14 }}>
                          {diffValIDR > 0 ? "+" : ""}
                          {formatIDR(diffValIDR)}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 2 }}>
                          {diffWeight > 0 ? "+" : ""}
                          {diffWeight.toFixed(1)}% alokasi
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* FORM MODAL FOR RECORDING SNAPSHOT */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--color-overlay)",
              backdropFilter: "blur(4px)",
              zIndex: 9000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              style={{
                background: "var(--color-surface-card)",
                borderRadius: 20,
                boxShadow: "var(--shadow-xl)",
                width: "100%",
                maxWidth: 620,
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1.5px solid var(--color-border-subtle)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "20px 24px",
                  borderBottom: "1.5px solid var(--color-border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--color-surface-card)",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "var(--text-h3-size)",
                      fontWeight: "var(--text-h2-weight)",
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    {editingSnapshot ? "Ubah Catatan Bulanan" : "Catat Snapshot Bulanan"}
                  </h3>
                  <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
                    {editingSnapshot
                      ? "Sesuaikan data saldo aktual Anda."
                      : "Catat saldo riil Anda di akhir bulan ini."}
                  </span>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: "1.5px solid var(--color-border-subtle)",
                    background: "var(--color-surface-input)",
                    color: "var(--color-text-secondary)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Form */}
              <form
                onSubmit={handleSaveForm}
                style={{
                  padding: "20px 24px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  flex: 1,
                }}
              >
                {/* Custom Month Picker */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }} ref={pickerRef}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      fontWeight: "bold",
                    }}
                  >
                    Pilih Bulan Pencatatan
                  </label>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    {/* Custom Month Picker Trigger (No calendar emoji!) */}
                    <div
                      onClick={() => !editingSnapshot && setPickerOpen(!pickerOpen)}
                      style={{
                        padding: "11px 14px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border-subtle)",
                        background: "var(--color-surface-input)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--text-body-size)",
                        fontWeight: "600",
                        flex: 1,
                        cursor: editingSnapshot ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        userSelect: "none"
                      }}
                    >
                      <span style={{ flex: 1 }}>{formatMonthLabelLong(formMonth) || "Pilih Bulan"}</span>
                      {!editingSnapshot && (
                        <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>▼</span>
                      )}
                    </div>

                    {!editingSnapshot && sortedSnapshots.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyFromLast}
                        style={{
                          padding: "11px 14px",
                          borderRadius: "8px",
                          border: "1.5px solid var(--color-semantic-brand)",
                          background: "transparent",
                          color: "var(--color-semantic-brand)",
                          fontSize: "var(--text-caption-size)",
                          fontWeight: "bold",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        Salin Bulan Lalu
                      </button>
                    )}
                  </div>

                  {/* CUSTOM PICKER POPOVER ELEMENT WITH PAST & FUTURE BLOCKING */}
                  <AnimatePresence>
                    {pickerOpen && (
                      <motion.div
                        variants={popoverVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ duration: 0.15 }}
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: 0,
                          right: 0,
                          background: "var(--color-surface-card)",
                          border: "1.5px solid var(--color-border-subtle)",
                          borderRadius: 12,
                          padding: 14,
                          zIndex: 9999,
                          boxShadow: "var(--shadow-xl)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12
                        }}
                      >
                        {/* Popover Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setPickerYear(prev => prev - 1)}
                            style={{
                              width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--color-border-subtle)",
                              background: "var(--color-surface-input)", color: "var(--color-text-primary)", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12
                            }}
                          >
                            ◀
                          </button>
                          <span style={{ fontWeight: "bold", fontSize: 15, color: "var(--color-text-primary)" }}>{pickerYear}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              if (pickerYear < now.getFullYear() + 2) {
                                setPickerYear(prev => prev + 1);
                              }
                            }}
                            style={{
                              width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--color-border-subtle)",
                              background: "var(--color-surface-input)", color: "var(--color-text-primary)", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12
                            }}
                          >
                            ▶
                          </button>
                        </div>
                        
                        {/* Month Grid with strict blocking for future, past, and already recorded months */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          {MONTHS_INDO_SHORT.map((mShort, idx) => {
                            const currentFormMonth = String(idx + 1).padStart(2, "0");
                            const targetYM = `${pickerYear}-${currentFormMonth}`;
                            const isSelected = formMonth === targetYM;
                            
                            // Date logic checks
                            const now = new Date();
                            const currentYMInt = now.getFullYear() * 12 + now.getMonth();
                            const pickerYMInt = pickerYear * 12 + idx;
                            
                            const isFuture = pickerYMInt > currentYMInt;
                            const isPast = pickerYMInt < currentYMInt;
                            const isAlreadyRecorded = monthlySnapshots.some(s => s.yearMonth === targetYM);

                            // Disabled state
                            const isDisabled = isFuture || isPast || (isAlreadyRecorded && (!editingSnapshot || editingSnapshot.yearMonth !== targetYM));

                            return (
                              <motion.button
                                key={idx}
                                type="button"
                                disabled={isDisabled}
                                onClick={() => handleSelectMonthYear(idx)}
                                whileHover={!isDisabled ? { scale: 1.04 } : {}}
                                whileTap={!isDisabled ? { scale: 0.96 } : {}}
                                style={{
                                  padding: "10px 0",
                                  borderRadius: 8,
                                  textAlign: "center",
                                  fontSize: 12,
                                  fontWeight: "600",
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  transition: "all 0.15s",
                                  border: "none",
                                  background: isSelected 
                                    ? "var(--color-semantic-brand)" 
                                    : isDisabled 
                                      ? "rgba(255,255,255,0.01)" 
                                      : "var(--color-surface-input)",
                                  color: isSelected 
                                    ? "var(--color-white)" 
                                    : isDisabled 
                                      ? "var(--color-text-tertiary)" 
                                      : "var(--color-text-primary)",
                                  opacity: isDisabled ? 0.35 : 1,
                                }}
                                title={isFuture ? "Bulan depan belum bisa dicatat" : isPast ? "Bulan yang sudah berlalu tidak bisa dipilih" : isAlreadyRecorded ? "Bulan ini sudah dicatat snapshotnya" : ""}
                              >
                                {mShort}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Grid 16 Asset Inputs - ELEGANT CARDS SYNCED 100% WITH INPUT TAB (NO GRADIENTS, SUBDUED PASSIVE +/- BUTTONS ON THE RIGHT) */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      fontWeight: "bold",
                    }}
                  >
                    Masukkan Saldo Akhir Aktual
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      maxHeight: "300px",
                      overflowY: "auto",
                      paddingRight: 6,
                    }}
                  >
                    {ASSET_CLASSES.map((cls) => {
                      const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
                      const isActive = activeAssetIds.includes(cls.id);
                      const val = formAssetValues[cls.id] || 0;
                      
                      return (
                        <div
                          key={cls.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "16px 16px",
                            background: "var(--color-surface-card)",
                            borderRadius: 16,
                            border: isActive 
                              ? "1.5px solid var(--color-semantic-success)" 
                              : "1.5px solid var(--color-border-subtle)",
                            opacity: 1, // Absolutely NO dimming on the card container
                            transition: "all 0.2s ease-in-out",
                            boxShadow: "var(--shadow-sm)",
                          }}
                        >
                          {/* SISI KIRI (Informasi Aset) - Identik 100% dengan InputTab.jsx */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: cls.color,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span
                                style={{
                                  fontSize: "var(--text-body-size)",
                                  fontWeight: "var(--text-subtitle-weight)",
                                  color: "var(--color-text-primary)",
                                  lineHeight: 1.2,
                                }}
                              >
                                {cls.name}
                              </span>
                              <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>
                                {cls.risk}
                              </span>
                            </div>
                          </div>

                          {/* SISI KANAN (Aksi & Input) - Rapi & Sangat Fungsional */}
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {/* Jika instrumen aktif, tampilkan input field */}
                            {isActive && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  background: "var(--color-surface-input)",
                                  border: "1.5px solid var(--color-border-subtle)",
                                  borderRadius: "10px",
                                  padding: "0 12px",
                                  width: 150,
                                  transition: "border-color 0.2s"
                                }}
                              >
                                {/* Tag Kode Mata Uang Kapital Tebal */}
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: "900",
                                    color: "var(--color-text-secondary)",
                                    userSelect: "none",
                                    marginRight: 2
                                  }}
                                >
                                  {currencyPref}
                                </span>
                                <input
                                  type="text"
                                  placeholder="0"
                                  value={val > 0 ? (currencyPref === "USD" ? val.toLocaleString("en-US") : formatWhileTyping(val.toString())) : ""}
                                  onChange={(e) => handleAssetInputChange(cls.id, e.target.value)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    padding: "10px 0 10px 6px",
                                    textAlign: "right",
                                    width: "100%",
                                    color: "var(--color-text-primary)",
                                    fontSize: 13,
                                    fontFamily: tokens.typography.fontFamily,
                                    outline: "none",
                                  }}
                                />
                              </div>
                            )}

                            {/* Tombol Aksi Bulat Premium di Far Right - Lebih Pasif & Subdued */}
                            <button
                              type="button"
                              onClick={() => handleToggleAsset(cls.id)}
                              style={{
                                width: 32, height: 32,
                                borderRadius: "10px",
                                border: "1.5px solid var(--color-border-subtle)",
                                background: "var(--color-surface-input)",
                                color: isActive ? "var(--color-semantic-danger)" : "var(--color-semantic-success)",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: isActive ? 12 : 14, fontWeight: "bold",
                                boxShadow: "var(--shadow-sm)",
                                transition: "all 0.15s",
                                outline: "none",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = isActive ? "var(--color-semantic-danger)" : "var(--color-semantic-success)";
                                e.currentTarget.style.background = isActive ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                                e.currentTarget.style.background = "var(--color-surface-input)";
                              }}
                              title={isActive ? "Hapus dari Portofolio" : "Tambah ke Portofolio"}
                            >
                              {isActive ? "✕" : "＋"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                      fontWeight: "bold",
                    }}
                  >
                    Catatan Tambahan
                  </label>
                  <textarea
                    placeholder="Tuliskan catatan kejadian bulan ini (misal: bonus tahunan, market crash, dll)..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid var(--color-border-subtle)",
                      background: "var(--color-surface-input)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--text-body-size)",
                      fontFamily: tokens.typography.fontFamily,
                      minHeight: "60px",
                      resize: "vertical",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Form Footer Action Buttons */}
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: "8px",
                      border: "1.5px solid var(--color-border-subtle)",
                      background: "var(--color-surface-input)",
                      color: "var(--color-text-secondary)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontFamily: tokens.typography.fontFamily,
                    }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      borderRadius: "8px",
                      border: "none",
                      background: "var(--color-semantic-brand)",
                      color: "var(--color-white)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontFamily: tokens.typography.fontFamily,
                    }}
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE SINGLE SNAPSHOT POP-UP MODAL */}
      <AnimatePresence>
        {snapshotToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--color-overlay)",
              backdropFilter: "blur(4px)",
              zIndex: 9500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setSnapshotToDelete(null)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: "var(--color-surface-card)",
                borderRadius: 16,
                width: "100%",
                maxWidth: 420,
                padding: "24px",
                border: "1.5px solid var(--color-border-subtle)",
                boxShadow: "var(--shadow-xl)",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--color-semantic-danger-light, rgba(239, 68, 68, 0.1))",
                  color: "var(--color-semantic-danger)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  marginBottom: 16,
                }}
              >
                ⚠️
              </div>
              <h3 style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "bold", color: "var(--color-text-primary)", margin: "0 0 8px 0" }}>
                Hapus Catatan Bulanan?
              </h3>
              <p style={{ fontSize: "var(--text-body-size)", color: "var(--color-text-tertiary)", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus catatan snapshot untuk bulan <strong>{formatMonthLabelLong(snapshotToDelete.yearMonth)}</strong> secara permanen?
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setSnapshotToDelete(null)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: "8px",
                    border: "1.5px solid var(--color-border-subtle)",
                    background: "var(--color-surface-input)",
                    color: "var(--color-text-secondary)",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    deleteSnapshot(snapshotToDelete.id);
                    setSnapshotToDelete(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--color-semantic-danger)",
                    color: "var(--color-white)",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE ALL DIALOG */}
      <AnimatePresence>
        {isDeleteAllOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--color-overlay)",
              backdropFilter: "blur(4px)",
              zIndex: 9500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
            onClick={() => setIsDeleteAllOpen(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: "var(--color-surface-card)",
                borderRadius: 16,
                width: "100%",
                maxWidth: 420,
                padding: "24px",
                border: "1.5px solid var(--color-border-subtle)",
                boxShadow: "var(--shadow-xl)",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "var(--color-semantic-danger-light, rgba(239, 68, 68, 0.1))",
                  color: "var(--color-semantic-danger)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  marginBottom: 16,
                }}
              >
                ⚠️
              </div>
              <h3 style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "bold", color: "var(--color-text-primary)", margin: "0 0 8px 0" }}>
                Hapus Semua Snapshot?
              </h3>
              <p style={{ fontSize: "var(--text-body-size)", color: "var(--color-text-tertiary)", margin: "0 0 24px 0", lineHeight: 1.5 }}>
                Tindakan ini akan menghapus semua catatan bulanan Anda secara permanen. Perbandingan aktual vs proyeksi akan dinonaktifkan.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setIsDeleteAllOpen(false)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: "8px",
                    border: "1.5px solid var(--color-border-subtle)",
                    background: "var(--color-surface-input)",
                    color: "var(--color-text-secondary)",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    deleteAllSnapshots();
                    setIsDeleteAllOpen(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--color-semantic-danger)",
                    color: "var(--color-white)",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  Ya, Hapus Semua
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
