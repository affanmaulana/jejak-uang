import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

  // 2. Net Inflow per Snapshot calculations (for display in table & cards)
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
        // Compare with initial plan assets
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

      // Calculate actual rate of return for this month:
      // returnRate = (totalIDR - netInflow) / prevTotalIDR - 1
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

  // 3. Accumulative Net Inflow
  const totalNetInflow = useMemo(() => {
    return snapshotsWithMetrics.reduce((sum, snap) => sum + snap.netInflow, 0);
  }, [snapshotsWithMetrics]);

  // 4. Portfolio Growth Percentage
  const growthPercentage = useMemo(() => {
    if (initialPortfolioValue === 0) return 0;
    return ((latestPortfolioValue - initialPortfolioValue) / initialPortfolioValue) * 100;
  }, [latestPortfolioValue, initialPortfolioValue]);

  // 5. Average Monthly Return Rate (Rata-rata Return Bulanan Aktual)
  const averageMonthlyReturn = useMemo(() => {
    if (snapshotsWithMetrics.length === 0) return 0;
    const sumRates = snapshotsWithMetrics.reduce((sum, snap) => sum + snap.monthlyReturnRate, 0);
    return (sumRates / snapshotsWithMetrics.length) * 100;
  }, [snapshotsWithMetrics]);

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    if (sortedSnapshots.length === 0) return [];
    
    const earliestYM = sortedSnapshots[0].yearMonth;
    const earliestMonths = parseYearMonth(earliestYM);
    const baseMonths = earliestMonths - 1; // Month 0 (initial plan assets)
    
    const latestYM = sortedSnapshots[sortedSnapshots.length - 1].yearMonth;
    const latestMonths = parseYearMonth(latestYM);
    
    // We project up to 3 months into the future after latest snapshot to show trend
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
      let isSnapshotMonth = false;
      let monthInflow = 0;

      if (m === 0) {
        actualTotal = initialPortfolioValue;
        isSnapshotMonth = true;
      } else if (exactSnap) {
        actualTotal = Object.entries(exactSnap.assetValues).reduce((sum, [id, val]) => {
          const cls = ASSET_CLASSES.find((c) => c.id === id);
          if (!cls) return sum;
          const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
          return sum + (pref === "USD" ? val * customUSDRate : val);
        }, 0);
        isSnapshotMonth = true;

        // Fetch metrics calculated earlier for this month's inflow
        const metricSnap = snapshotsWithMetrics.find((s) => s.yearMonth === currentYM);
        if (metricSnap) {
          monthInflow = metricSnap.netInflow;
        }
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

      // Formatting label
      const date = new Date(
        baseMonths + m >= 0 ? Math.floor((baseMonths + m) / 12) : 2026,
        (baseMonths + m) % 12,
        1
      );
      const label = date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });

      dataList.push({
        label,
        Plan: Math.round(planTotal),
        Aktual: m <= latestMonths - baseMonths ? Math.round(actualTotal) : undefined,
        ProyeksiAktual: m > latestMonths - baseMonths ? Math.round(actualTotal) : undefined,
        "Net Inflow": isSnapshotMonth && m > 0 ? Math.round(monthInflow) : undefined,
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
    
    // Check if next month is in the future relative to current real-world month
    const now = new Date();
    const currentYMInt = now.getFullYear() * 12 + now.getMonth();
    const [ny, nm] = nextMonthYM.split("-").map(Number);
    
    if (ny * 12 + (nm - 1) > currentYMInt) {
      // Fallback to current real-world month if next snapshot month is in the future
      nextMonthYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    setFormMonth(nextMonthYM);
    
    const [y, m] = nextMonthYM.split("-").map(Number);
    setPickerYear(y);

    // Initialize form inputs with values of the latest snapshot or current assets state
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
    
    const [y, m] = snap.yearMonth.split("-").map(Number);
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

    // Enforce positive validation for numbers, only save active assets
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

  // --- PICKER ACTION ---
  const handleSelectMonthYear = (monthIdx) => {
    const monthStr = String(monthIdx + 1).padStart(2, "0");
    const ym = `${pickerYear}-${monthStr}`;
    setFormMonth(ym);
    setPickerOpen(false);
  };

  // If no active profile, show premium onboarding screen to avoid bleed-over
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
          🔒
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
            Aktifkan Profil Anda Terlebih Dahulu
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
        <div
          style={{
            background: "var(--color-surface-input)",
            border: "1px dashed var(--color-border-subtle)",
            borderRadius: 12,
            padding: "16px 20px",
            width: "100%",
            fontSize: "var(--text-caption-size)",
            color: "var(--color-text-secondary)",
            textAlign: "left",
            lineHeight: 1.5,
          }}
        >
          💡 <strong>Tips Cepat:</strong> Masuk ke tab <strong>"Input"</strong> di bagian bawah, lalu pilih profil aktif Anda di baris atas, atau buat profil baru dalam 5 detik jika Anda belum memilikinya.
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
          {monthlySnapshots.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsDeleteAllOpen(true)}
              style={{
                flex: isMobile ? 1 : "none",
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1.5px solid var(--color-semantic-danger)",
                background: "transparent",
                color: "var(--color-semantic-danger)",
                fontWeight: "var(--text-body-bold-weight)",
                fontSize: "var(--text-caption-size)",
                cursor: "pointer",
              }}
            >
              Hapus Semua
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAddModal}
            style={{
              flex: isMobile ? 1.5 : "none",
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

      {/* REDESIGNED HIGH-END FINTECH DASHBOARD PANEL (Stripe-like Layout) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.3fr 2.7fr",
          gap: 16,
          background: "var(--color-surface-card)",
          border: "1.5px solid var(--color-border-subtle)",
          borderRadius: 20,
          padding: "24px",
          boxShadow: "var(--shadow-md, 0 10px 30px rgba(0,0,0,0.04))",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* HERO CARD: TOTAL PORTFOLIO ACTUAL */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(79, 70, 229, 0.06) 100%)",
            border: "1.5px solid rgba(16, 185, 129, 0.15)",
            borderRadius: 16,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 8px 32px rgba(16, 185, 129, 0.03)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Portofolio Aktual
            </div>
            <div
              style={{
                fontSize: isMobile ? "28px" : "36px",
                fontWeight: "900",
                color: "var(--color-text-primary)",
                lineHeight: 1.1,
                marginTop: 6,
                letterSpacing: "-0.5px"
              }}
            >
              {formatCompact(latestPortfolioValue)}
            </div>
          </div>
          <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", width: "100%" }} />
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            <span>📅</span>
            <span>
              {latestSnapshot
                ? `Terakhir dicatat: ${formatMonthLabelLong(latestSnapshot.yearMonth)}`
                : "Belum ada catatan snapshot"}
            </span>
          </div>
        </div>

        {/* 3 SUB-METRICS LIST ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          {/* SUB-CARD 1: NET INFLOW */}
          <div
            style={{
              background: "var(--color-surface-input)",
              border: "1.5px solid var(--color-border-subtle)",
              borderRadius: 14,
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 8,
              transition: "transform 0.2s",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "600" }}>
                Kontribusi Bersih (Net Inflow)
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: totalNetInflow >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                  marginTop: 6,
                }}
              >
                {totalNetInflow >= 0 ? "+" : ""}
                {formatCompact(totalNetInflow)}
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Akumulasi suntikan modal riil Anda.
            </div>
          </div>

          {/* SUB-CARD 2: GROWTH PERCENTAGE */}
          <div
            style={{
              background: "var(--color-surface-input)",
              border: "1.5px solid var(--color-border-subtle)",
              borderRadius: 14,
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "600" }}>
                Kenaikan Portofolio
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: growthPercentage >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                  marginTop: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                {growthPercentage >= 0 ? "▲" : "▼"} {Math.abs(growthPercentage).toFixed(2)}%
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Perkembangan saldo aktual vs modal awal.
            </div>
          </div>

          {/* SUB-CARD 3: AVERAGE MONTHLY RETURN */}
          <div
            style={{
              background: "var(--color-surface-input)",
              border: "1.5px solid var(--color-border-subtle)",
              borderRadius: 14,
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontWeight: "600" }}>
                Rata-rata Return Bulanan
              </div>
              <div
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: averageMonthlyReturn >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                  marginTop: 6,
                }}
              >
                {averageMonthlyReturn >= 0 ? "+" : ""}
                {averageMonthlyReturn.toFixed(2)}%
              </div>
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
              Pertumbuhan portofolio bersih dari pasar.
            </div>
          </div>
        </div>
      </div>

      {monthlySnapshots.length > 0 ? (
        <>
          {/* GRAPHS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 20,
            }}
          >
            {/* REDESIGNED HIGH-END PORTFOLIO COMPARISON GRADIENT AREA CHART */}
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
                  { label: "Inflow Bulanan", color: "rgba(16, 185, 129, 0.2)", isBar: true },
                ].map((leg, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {leg.isBar ? (
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: leg.color }} />
                    ) : (
                      <div
                        style={{
                          width: 20,
                          height: leg.dashed ? 0 : 3,
                          borderRadius: 3,
                          background: leg.dashed ? "transparent" : leg.color,
                          borderTop: leg.dashed ? `2px dashed ${leg.color}` : "none",
                        }}
                      />
                    )}
                    <span style={{ fontSize: 11, fontWeight: "500", color: "var(--color-text-secondary)" }}>
                      {leg.label}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ width: "100%", height: isMobile ? 220 : 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-semantic-brand)" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="var(--color-semantic-brand)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-semantic-success)" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="var(--color-semantic-success)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={10} tickLine={false} />
                    <YAxis
                      stroke="var(--color-text-tertiary)"
                      fontSize={10}
                      tickLine={false}
                      tickFormatter={(val) => formatCompact(val).replace("Rp ", "")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15, 23, 42, 0.95)",
                        border: "1.5px solid var(--color-border-subtle)",
                        borderRadius: "12px",
                        color: "var(--color-text-primary)",
                        fontSize: 12,
                        backdropFilter: "blur(8px)",
                        boxShadow: "var(--shadow-xl)"
                      }}
                      formatter={(value, name) => [formatIDR(value), name]}
                    />
                    {/* Soft Inflow Bars */}
                    <Bar
                      name="Inflow Bulanan"
                      dataKey="Net Inflow"
                      fill="var(--color-semantic-success)"
                      opacity={0.15}
                      radius={[3, 3, 0, 0]}
                    />
                    {/* Plan Area */}
                    <Area
                      type="monotone"
                      name="Rencana"
                      dataKey="Plan"
                      stroke="var(--color-semantic-brand)"
                      strokeWidth={2}
                      fill="url(#colorPlan)"
                    />
                    {/* Actual Area */}
                    <Area
                      type="monotone"
                      name="Aktual"
                      dataKey="Aktual"
                      stroke="var(--color-semantic-success)"
                      strokeWidth={3}
                      fill="url(#colorActual)"
                      dot={{ r: 3.5, fill: "var(--color-semantic-success)", stroke: "var(--color-surface-card)", strokeWidth: 1.5 }}
                    />
                    {/* Projected Actual Line */}
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
            </div>
            
            {/* CONDITIONAL RENDER: PREMIUM MOBILE CARD-LIST OR DESKTOP TABLE */}
            {isMobile ? (
              <div style={{ display: "flex", flexDirection: "column", padding: 12, gap: 10 }}>
                {[...snapshotsWithMetrics].reverse().map((snap) => (
                  <div
                    key={snap.id}
                    style={{
                      background: "var(--color-surface-input)",
                      border: "1px solid var(--color-border-subtle)",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, fontWeight: "bold", color: "var(--color-text-primary)" }}>
                        {formatMonthLabelShort(snap.yearMonth)}
                      </span>
                      <div style={{ display: "flex", gap: 12 }}>
                        <button
                          onClick={() => handleOpenEditModal(snap)}
                          style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setSnapshotToDelete(snap)}
                          style={{ border: "none", background: "transparent", color: "var(--color-semantic-danger)", cursor: "pointer" }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 16, height: 16 }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Saldo Aktual:</span>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: "500" }}>
                        {formatIDR(snap.totalPortfolio)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--color-text-tertiary)" }}>Net Inflow:</span>
                      <span
                        style={{
                          fontWeight: "bold",
                          color: snap.netInflow >= 0 ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                        }}
                      >
                        {snap.netInflow >= 0 ? "+" : ""}
                        {formatIDR(snap.netInflow)}
                      </span>
                    </div>

                    {snap.notes && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: "var(--color-text-secondary)",
                          padding: "6px 8px",
                          background: "var(--color-surface-card)",
                          borderRadius: 6,
                          borderLeft: "2px solid var(--color-border-subtle)",
                        }}
                      >
                        📝 {snap.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--color-border-subtle)", background: "var(--color-surface-app)" }}>
                      <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Bulan</th>
                      <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Total Saldo Aktual</th>
                      <th style={{ padding: "12px 20px", textAlign: "right", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Net Inflow</th>
                      <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "bold" }}>Catatan</th>
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
                        <td style={{ padding: "14px 20px", fontSize: "var(--text-caption-size)", color: "var(--color-text-secondary)" }}>
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
            )}
          </div>
        </>
      ) : (
        /* EMPTY STATE VIEW */
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "60px 20px",
            textAlign: "center",
            boxShadow: tokens.shadows.small,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "var(--color-surface-app)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-text-secondary)",
              marginBottom: 16,
              border: "1.5px solid var(--color-border-subtle)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              style={{ width: 28, height: 28 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <h3 style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-primary)", margin: "0 0 8px 0" }}>
            Belum ada Snapshot Bulanan
          </h3>
          <p
            style={{
              maxWidth: 450,
              margin: "0 auto 20px auto",
              fontSize: "var(--text-body-size)",
              color: "var(--color-text-tertiary)",
              lineHeight: 1.5,
            }}
          >
            Catat saldo aktual Anda di akhir bulan untuk melacak realisasi pertumbuhan kekayaan Anda secara komparatif terhadap rencana.
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAddModal}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "none",
              background: "var(--color-semantic-brand)",
              color: "var(--color-white)",
              fontWeight: "var(--text-body-bold-weight)",
              fontSize: "var(--text-caption-size)",
              cursor: "pointer",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            Mulai Catat Bulan Pertama
          </motion.button>
        </div>
      )}

      {/* MODAL: INPUT/EDIT MONTHLY SNAPSHOT */}
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
                        
                        {/* Month Grid with strict blocking for future & already recorded months */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          {MONTHS_INDO_SHORT.map((mShort, idx) => {
                            const currentFormMonth = String(idx + 1).padStart(2, "0");
                            const targetYM = `${pickerYear}-${currentFormMonth}`;
                            const isSelected = formMonth === targetYM;
                            
                            // Check if this month is in the future
                            const now = new Date();
                            const currentYMInt = now.getFullYear() * 12 + now.getMonth();
                            const pickerYMInt = pickerYear * 12 + idx;
                            const isFuture = pickerYMInt > currentYMInt;

                            // Check if this month has already been recorded in snapshots
                            const isAlreadyRecorded = monthlySnapshots.some(s => s.yearMonth === targetYM);

                            // Disabled state
                            const isDisabled = isFuture || (isAlreadyRecorded && (!editingSnapshot || editingSnapshot.yearMonth !== targetYM));

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
                                title={isFuture ? "Bulan depan belum bisa dicatat" : isAlreadyRecorded ? "Bulan ini sudah dicatat snapshotnya" : ""}
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

                {/* Grid 16 Asset Inputs (Premium Cards without dimming, crisp active/inactive borders, and internal prefix currency symbols) */}
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
                            padding: "12px 14px",
                            background: "var(--color-surface-card)",
                            borderRadius: "12px",
                            border: isActive 
                              ? "1.5px solid var(--color-semantic-success)" 
                              : "1.5px dashed var(--color-border-subtle)",
                            opacity: 1, // NO DIMMING! Beautifully crisp.
                            transition: "all 0.2s ease-in-out",
                            boxShadow: isActive ? "0 4px 16px rgba(16, 185, 129, 0.04)" : "none",
                          }}
                        >
                          {/* Toggle active / inactive control button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAsset(cls.id)}
                            style={{
                              width: 24, height: 24, borderRadius: "50%", border: "none",
                              background: isActive ? "var(--color-semantic-danger-light, rgba(239, 68, 68, 0.12))" : "var(--color-semantic-success-light, rgba(16, 185, 129, 0.12))",
                              color: isActive ? "var(--color-semantic-danger)" : "var(--color-semantic-success)",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold",
                              boxShadow: "var(--shadow-sm)"
                            }}
                            title={isActive ? "Hapus dari Portofolio" : "Tambah ke Portofolio"}
                          >
                            {isActive ? "✕" : "＋"}
                          </button>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: cls.color,
                                flexShrink: 0,
                              }}
                            />
                            <div>
                              <div
                                style={{
                                  fontSize: "var(--text-body-bold-size)",
                                  fontWeight: "bold",
                                  color: "var(--color-text-primary)",
                                  lineHeight: 1.2,
                                }}
                              >
                                {cls.name}
                              </div>
                              <span style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>
                                {cls.risk}
                              </span>
                            </div>
                          </div>

                          {/* Value Input Area with currency symbol embedded inside the input field */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                background: isActive ? "var(--color-surface-input)" : "rgba(255, 255, 255, 0.02)",
                                border: isActive ? "1.5px solid var(--color-semantic-success)" : "1.5px solid var(--color-border-subtle)",
                                borderRadius: "8px",
                                padding: "0 10px",
                                width: 140,
                                transition: "border-color 0.2s"
                              }}
                            >
                              <span style={{ fontSize: 12, fontWeight: "bold", color: isActive ? "var(--color-text-secondary)" : "var(--color-text-tertiary)", userSelect: "none" }}>
                                {currencyPref === "USD" ? "$" : "Rp"}
                              </span>
                              <input
                                type="text"
                                placeholder="0"
                                disabled={!isActive}
                                value={isActive && val > 0 ? (currencyPref === "USD" ? val.toLocaleString("en-US") : formatWhileTyping(val.toString())) : ""}
                                onChange={(e) => handleAssetInputChange(cls.id, e.target.value)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: "8px 0 8px 6px",
                                  textAlign: "right",
                                  width: "100%",
                                  color: "var(--color-text-primary)",
                                  fontSize: 13,
                                  fontFamily: tokens.typography.fontFamily,
                                  outline: "none",
                                  cursor: isActive ? "text" : "not-allowed"
                                }}
                              />
                            </div>
                            {isActive && currencyPref === "USD" && val > 0 && (
                              <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                                ≈ {formatCompact(val * customUSDRate)}
                              </span>
                            )}
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
                    Catatan (Opsional)
                  </label>
                  <textarea
                    placeholder="Contoh: Ada bonus tahunan, market koreksi masif..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid var(--color-border-subtle)",
                      background: "var(--color-surface-input)",
                      color: "var(--color-text-primary)",
                      fontSize: "var(--text-body-size)",
                      fontFamily: tokens.typography.fontFamily,
                      resize: "none",
                    }}
                  />
                </div>

                {/* Modal Footer Controls */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    marginTop: 6,
                    borderTop: "1.5px solid var(--color-border-subtle)",
                    paddingTop: 16,
                  }}
                >
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
                🗑️
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
