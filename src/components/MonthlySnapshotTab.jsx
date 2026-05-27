import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
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

// 12 Indonesian months list
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
  setActiveAssetIds, // REQUIRED FOR SNAPSHOT MUTATIONS
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
        // Month 0 is initial assets
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
    
    setFormMonth(nextMonthYM);
    
    // Sync picker defaults
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
      // Remove from active list
      setActiveAssetIds((prev) => prev.filter((aid) => aid !== id));
      // Set balance to 0 in form
      setFormAssetValues((prev) => ({ ...prev, [id]: 0 }));
    } else {
      // Add to active list
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

  // Convert month YYYY-MM to Indonesian string
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

      {/* RE-ARCHITECTED DASHBOARD METRIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {/* CARD 1: TOTAL PORTFOLIO ACTUAL */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "18px 20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Total Portofolio Aktual
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color: "var(--color-text-primary)",
              lineHeight: 1.2,
            }}
          >
            {formatCompact(latestPortfolioValue)}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
            {latestSnapshot
              ? `Terakhir dicatat: ${formatMonthLabelLong(latestSnapshot.yearMonth)}`
              : "Belum ada catatan snapshot"}
          </div>
        </div>

        {/* CARD 2: TOTAL NET INFLOW */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "18px 20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Kontribusi Bersih (Net Inflow)
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color:
                totalNetInflow >= 0
                  ? "var(--color-semantic-success)"
                  : "var(--color-semantic-danger)",
              lineHeight: 1.2,
            }}
          >
            {totalNetInflow >= 0 ? "+" : ""}
            {formatCompact(totalNetInflow)}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Total dana segar yang Anda tambahkan.
          </div>
        </div>

        {/* CARD 3: PORTFOLIO GROWTH PERCENTAGE */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "18px 20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Persentase Kenaikan Portofolio
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color:
                growthPercentage >= 0
                  ? "var(--color-semantic-success)"
                  : "var(--color-semantic-danger)",
              lineHeight: 1.2,
            }}
          >
            {growthPercentage >= 0 ? "▲ +" : "▼ "}
            {growthPercentage.toFixed(2)}%
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Perkembangan saldo terhadap rencana awal.
          </div>
        </div>

        {/* CARD 4: AVERAGE ACTUAL MONTHLY RETURN */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "18px 20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Rata-rata Return Bulanan Aktual
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color:
                averageMonthlyReturn >= 0
                  ? "var(--color-semantic-success)"
                  : "var(--color-semantic-danger)",
              lineHeight: 1.2,
            }}
          >
            {averageMonthlyReturn >= 0 ? "+" : ""}
            {averageMonthlyReturn.toFixed(2)}%
          </div>
          <div style={{ fontSize: 10, color: "var(--color-text-secondary)", marginTop: 2 }}>
            Pertumbuhan pasar bersih per bulan.
          </div>
        </div>
      </div>

      {monthlySnapshots.length > 0 ? (
        <>
          {/* GRAPHS SIDE-BY-SIDE */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {/* GRAPH 1: PORTFOLIO COMPARISON */}
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1.5px solid var(--color-border-subtle)",
                borderRadius: 16,
                padding: isMobile ? "14px" : "20px",
                boxShadow: tokens.shadows.small,
              }}
            >
              <h3
                style={{
                  fontSize: "var(--text-subtitle-size)",
                  fontWeight: "var(--text-subtitle-weight)",
                  color: "var(--color-text-primary)",
                  margin: "0 0 16px 0",
                }}
              >
                Komparasi Portofolio: Aktual vs Rencana
              </h3>
              <div style={{ width: "100%", height: isMobile ? 200 : 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
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
                        borderRadius: "8px",
                        color: "var(--color-text-primary)",
                        fontSize: 12,
                      }}
                      formatter={(value) => [formatIDR(value), ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                    <Line
                      type="monotone"
                      name="Rencana (Plan)"
                      dataKey="Plan"
                      stroke="var(--color-semantic-brand)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Aktual"
                      dataKey="Aktual"
                      stroke="var(--color-semantic-success)"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: "var(--color-semantic-success)", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      name="Proyeksi Aktual"
                      dataKey="ProyeksiAktual"
                      stroke="var(--color-semantic-success)"
                      strokeDasharray="3 3"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: "var(--color-text-tertiary)",
                  textAlign: "center",
                  margin: "8px 0 0 0",
                }}
              >
                Catatan: Aset USD dikonversi menggunakan kurs saat ini ({formatIDR(customUSDRate)}).
              </p>
            </div>

            {/* GRAPH 2: MONTHLY NET INFLOW */}
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1.5px solid var(--color-border-subtle)",
                borderRadius: 16,
                padding: isMobile ? "14px" : "20px",
                boxShadow: tokens.shadows.small,
              }}
            >
              <h3
                style={{
                  fontSize: "var(--text-subtitle-size)",
                  fontWeight: "var(--text-subtitle-weight)",
                  color: "var(--color-text-primary)",
                  margin: "0 0 16px 0",
                }}
              >
                Kontribusi Bersih (Net Inflow) per Bulan
              </h3>
              <div style={{ width: "100%", height: isMobile ? 200 : 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
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
                        borderRadius: "8px",
                        color: "var(--color-text-primary)",
                        fontSize: 12,
                      }}
                      formatter={(value) => [formatIDR(value), "Inflow"]}
                    />
                    <Bar
                      name="Net Inflow"
                      dataKey="Net Inflow"
                      fill="var(--color-semantic-success)"
                      radius={[3, 3, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p
                style={{
                  fontSize: 9,
                  color: "var(--color-text-tertiary)",
                  textAlign: "center",
                  margin: "8px 0 0 0",
                }}
              >
                Kolom hijau berarti menambah modal, kolom merah/minus berarti penarikan modal.
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
              <h3 style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-primary)", margin: 0 }}>
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
                          onClick={() => deleteSnapshot(snap.id)}
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
                              onClick={() => deleteSnapshot(snap.id)}
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
                    {/* Custom Month Picker Trigger */}
                    <div
                      onClick={() => !editingSnapshot && setPickerOpen(!pickerOpen)}
                      style={{
                        padding: "11px 14px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border-subtle)",
                        background: "var(--color-surface-input)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--text-body-size)",
                        fontWeight: "500",
                        flex: 1,
                        cursor: editingSnapshot ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        userSelect: "none"
                      }}
                    >
                      <span>📅</span>
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

                  {/* CUSTOM PICKER POPOVER ELEMENT */}
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
                            onClick={() => setPickerYear(prev => prev + 1)}
                            style={{
                              width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--color-border-subtle)",
                              background: "var(--color-surface-input)", color: "var(--color-text-primary)", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12
                            }}
                          >
                            ▶
                          </button>
                        </div>
                        
                        {/* Month Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          {MONTHS_INDO_SHORT.map((mShort, idx) => {
                            const currentFormMonth = String(idx + 1).padStart(2, "0");
                            const isSelected = formMonth === `${pickerYear}-${currentFormMonth}`;
                            return (
                              <motion.div
                                key={idx}
                                onClick={() => handleSelectMonthYear(idx)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                  padding: "10px 0", borderRadius: 8, textAlign: "center", fontSize: 12, fontWeight: "500",
                                  cursor: "pointer", transition: "all 0.15s",
                                  background: isSelected ? "var(--color-semantic-brand)" : "var(--color-surface-input)",
                                  color: isSelected ? "var(--color-white)" : "var(--color-text-primary)"
                                }}
                              >
                                {mShort}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Grid 16 Asset Inputs (Equipped with interactive Add/Remove Card Controls) */}
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
                      const placeholder = currencyPref === "USD" ? "$ 0" : "Rp 0";
                      
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
                            padding: "10px 12px",
                            background: isActive ? "transparent" : "rgba(30, 41, 59, 0.25)",
                            borderRadius: "10px",
                            border: `1.5px solid ${
                              isActive ? "var(--color-border-subtle)" : "transparent"
                            }`,
                            opacity: isActive ? 1 : 0.45,
                            transition: "all 0.25s ease-in-out",
                          }}
                        >
                          {/* Toggle active / inactive control button */}
                          <button
                            type="button"
                            onClick={() => handleToggleAsset(cls.id)}
                            style={{
                              width: 24, height: 24, borderRadius: "50%", border: "none",
                              background: isActive ? "var(--color-semantic-danger-light, rgba(239, 68, 68, 0.1))" : "var(--color-semantic-success-light, rgba(16, 185, 129, 0.1))",
                              color: isActive ? "var(--color-semantic-danger)" : "var(--color-semantic-success)",
                              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold"
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
                                  fontWeight: "var(--text-body-bold-weight)",
                                  color: "var(--color-text-primary)",
                                  lineHeight: 1.2,
                                }}
                              >
                                {cls.name}
                              </div>
                              <span style={{ fontSize: 9, color: "var(--color-text-tertiary)" }}>
                                {currencyPref} · {cls.risk}
                              </span>
                            </div>
                          </div>

                          {/* Value Input */}
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                              <input
                                type="text"
                                placeholder={placeholder}
                                disabled={!isActive}
                                value={isActive && val > 0 ? (currencyPref === "USD" ? val.toLocaleString("en-US") : formatWhileTyping(val.toString())) : ""}
                                onChange={(e) => handleAssetInputChange(cls.id, e.target.value)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1.5px solid var(--color-border-subtle)",
                                  background: isActive ? "var(--color-surface-input)" : "rgba(30, 41, 59, 0.05)",
                                  color: "var(--color-text-primary)",
                                  fontSize: 13,
                                  textAlign: "right",
                                  width: 130,
                                  fontFamily: tokens.typography.fontFamily,
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
