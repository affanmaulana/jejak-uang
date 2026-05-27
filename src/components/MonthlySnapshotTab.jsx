import React, { useState, useMemo } from "react";
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
  afterTaxReturn, // imported from formatters as well
} from "../utils/formatters";

// Slide animation variants for modal
const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 20 },
  visible: { scale: 1, opacity: 1, y: 0 },
  exit: { scale: 0.95, opacity: 0, y: 20 },
};

export default function MonthlySnapshotTab({
  tokens,
  ASSET_CLASSES,
  customUSDRate,
  assetCurrencyPrefs,
  activeAssetIds,
  monthlySnapshots,
  addSnapshot,
  updateSnapshot,
  deleteSnapshot,
  deleteAllSnapshots,
  assets,
  customReturnOverrides,
  showAfterTax,
  formatIDR,
  formatCompact,
  parseExpression,
  formatWhileTyping,
  activeTemplateId,
  userTemplates,
}) {
  // --- UI STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null); // null for new, snapshot object for edit
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);

  // --- FORM STATES ---
  const [formMonth, setFormMonth] = useState("");
  const [formAssetValues, setFormAssetValues] = useState({});
  const [formNotes, setFormNotes] = useState("");

  // Sort snapshots for calculations
  const sortedSnapshots = useMemo(() => {
    return [...monthlySnapshots].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  }, [monthlySnapshots]);

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
      if (idx === 0) {
        // Compare with initial plan assets
        prevAssets = assets;
      } else {
        prevAssets = sortedSnapshots[idx - 1].assetValues;
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

      list.push({
        ...snap,
        totalPortfolio: totalIDR,
        netInflow: idx === 0 ? totalIDR - Object.entries(assets).reduce((s, [i, v]) => {
          const c = ASSET_CLASSES.find(x => x.id === i);
          if (!c) return s;
          const p = assetCurrencyPrefs[i] || (c.isUSD ? "USD" : "IDR");
          return s + (p === "USD" ? v * customUSDRate : v);
        }, 0) : netInflow, // for the first snapshot, we compare actual total vs initial total
      });
    });

    return list;
  }, [sortedSnapshots, assets, customReturnOverrides, customUSDRate, assetCurrencyPrefs, ASSET_CLASSES]);

  // 3. Accumulative Net Inflow
  const totalNetInflow = useMemo(() => {
    return snapshotsWithMetrics.reduce((sum, snap) => sum + snap.netInflow, 0);
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
        actualTotal = Object.entries(assets).reduce((sum, [id, val]) => {
          const cls = ASSET_CLASSES.find((c) => c.id === id);
          if (!cls) return sum;
          const pref = assetCurrencyPrefs[id] || (cls.isUSD ? "USD" : "IDR");
          return sum + (pref === "USD" ? val * customUSDRate : val);
        }, 0);
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
  }, [sortedSnapshots, assets, monthlyContribs, customReturnOverrides, showAfterTax, customUSDRate, assetCurrencyPrefs, snapshotsWithMetrics]);

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
    // Format while typing & store evaluated raw number
    const evaluated = parseExpression(str);
    setFormAssetValues((prev) => ({
      ...prev,
      [id]: evaluated !== null ? evaluated : 0,
    }));
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formMonth) return;

    // Enforce positive validation for numbers
    const cleanedValues = {};
    ASSET_CLASSES.forEach((c) => {
      cleanedValues[c.id] = Math.max(0, formAssetValues[c.id] || 0);
    });

    if (editingSnapshot) {
      // Edit mode
      updateSnapshot(editingSnapshot.id, cleanedValues, formNotes);
    } else {
      // Add mode
      const success = addSnapshot({
        id: formMonth,
        yearMonth: formMonth,
        assetValues: cleanedValues,
        notes: formNotes,
      });
      if (!success) return; // duplicate month handles inside addSnapshot
    }
    setIsModalOpen(false);
  };

  // Convert month YYYY-MM to Indonesian string
  const formatMonthLabelLong = (ym) => {
    if (!ym) return "";
    const [y, m] = ym.split("-").map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* HEADER ACTION CONTROLS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
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
            Bandingkan perkembangan saldo aset riil Anda dengan proyeksi rencana awal.
            {activeTemplateId ? (
              <span style={{ color: "var(--color-semantic-brand)", marginLeft: 6 }}>
                 Profil Aktif: {userTemplates.find((t) => t.id === activeTemplateId)?.name}
              </span>
            ) : (
              <span style={{ color: "var(--color-semantic-warning)", marginLeft: 6 }}>
                ⚠️ Mode Draft (Data tidak tersimpan permanen. Klik "Simpan Baru" di Tab Input)
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {monthlySnapshots.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsDeleteAllOpen(true)}
              style={{
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
              gap: 6,
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              style={{ width: 16, height: 16 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Catat Bulan Ini
          </motion.button>
        </div>
      </div>

      {/* THREE HEADER CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {/* CARD 1: TOTAL PORTFOLIO */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "20px",
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
            }}
          >
            {formatCompact(latestPortfolioValue)}
          </div>
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-secondary)" }}>
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
            padding: "20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Akumulasi Kontribusi Bersih (Net Inflow)
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color:
                totalNetInflow >= 0
                  ? "var(--color-semantic-success)"
                  : "var(--color-semantic-danger)",
            }}
          >
            {totalNetInflow >= 0 ? "+" : ""}
            {formatCompact(totalNetInflow)}
          </div>
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-secondary)" }}>
            Total dana segar yang Anda tambahkan ke portofolio Anda.
          </div>
        </div>

        {/* CARD 3: SNAPSHOT COUNT */}
        <div
          style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 16,
            padding: "20px",
            boxShadow: tokens.shadows.small,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
            Total Bulan Tercatat
          </div>
          <div
            style={{
              fontSize: "var(--text-h2-size)",
              fontWeight: "var(--text-h1-weight)",
              color: "var(--color-semantic-brand)",
            }}
          >
            {monthlySnapshots.length} Bulan
          </div>
          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-secondary)" }}>
            Catat secara rutin setiap awal bulan untuk analisis terbaik.
          </div>
        </div>
      </div>

      {monthlySnapshots.length > 0 ? (
        <>
          {/* GRAPHS SIDE-BY-SIDE */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
              gap: 20,
            }}
          >
            {/* GRAPH 1: PORTFOLIO COMPARISON */}
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1.5px solid var(--color-border-subtle)",
                borderRadius: 16,
                padding: "20px",
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
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="var(--color-text-tertiary)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => formatCompact(val).replace("Rp ", "")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-card)",
                        border: "1.5px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                        color: "var(--color-text-primary)",
                      }}
                      formatter={(value) => [formatIDR(value), ""]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Line
                      type="monotone"
                      name="Rencana (Plan)"
                      dataKey="Plan"
                      stroke="var(--color-semantic-brand)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      name="Aktual (Realisasi)"
                      dataKey="Aktual"
                      stroke="var(--color-semantic-success)"
                      strokeWidth={3}
                      dot={{ r: 3, fill: "var(--color-semantic-success)", strokeWidth: 1 }}
                    />
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
                  margin: "8px 0 0 0",
                }}
              >
                Catatan: Nilai historis aset USD dikonversi menggunakan kurs saat ini ($1 = {formatIDR(customUSDRate)}).
              </p>
            </div>

            {/* GRAPH 2: MONTHLY NET INFLOW */}
            <div
              style={{
                background: "var(--color-surface-card)",
                border: "1.5px solid var(--color-border-subtle)",
                borderRadius: 16,
                padding: "20px",
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
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="var(--color-text-tertiary)"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => formatCompact(val).replace("Rp ", "")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-surface-card)",
                        border: "1.5px solid var(--color-border-subtle)",
                        borderRadius: "8px",
                        color: "var(--color-text-primary)",
                      }}
                      formatter={(value) => [formatIDR(value), "Inflow"]}
                    />
                    <Bar
                      name="Dana Segar Ditambahkan (Net Inflow)"
                      dataKey="Net Inflow"
                      fill="var(--color-semantic-success)"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--color-text-tertiary)",
                  textAlign: "center",
                  margin: "8px 0 0 0",
                }}
              >
                Kolom hijau menunjukkan suntikan dana segar (Inflow). Kolom merah/minus berarti penarikan dana (Outflow).
              </p>
            </div>
          </div>

          {/* TABLE LIST OF MONTHS */}
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
                maxHeight: "85vh",
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
                {/* Select Month Row */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                    <input
                      type="month"
                      value={formMonth}
                      onChange={(e) => setFormMonth(e.target.value)}
                      disabled={!!editingSnapshot} // month cannot be changed on edit mode
                      required
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--color-border-subtle)",
                        background: "var(--color-surface-input)",
                        color: "var(--color-text-primary)",
                        fontSize: "var(--text-body-size)",
                        fontFamily: tokens.typography.fontFamily,
                        flex: 1,
                        cursor: editingSnapshot ? "not-allowed" : "pointer",
                      }}
                    />
                    {!editingSnapshot && sortedSnapshots.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyFromLast}
                        style={{
                          padding: "10px 14px",
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
                </div>

                {/* Grid 16 Asset Inputs */}
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
                      maxHeight: "350px",
                      overflowY: "auto",
                      paddingRight: 6,
                    }}
                  >
                    {ASSET_CLASSES.map((cls) => {
                      const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? "USD" : "IDR");
                      const placeholder = currencyPref === "USD" ? "$ 0" : "Rp 0";
                      
                      // Calculate active state indicator
                      const isActive = activeAssetIds.includes(cls.id);
                      
                      // Format evaluated visual
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
                            background: isActive ? "transparent" : "var(--color-surface-input)",
                            borderRadius: "10px",
                            border: `1.5px solid ${
                              isActive ? "var(--color-border-subtle)" : "transparent"
                            }`,
                            opacity: isActive ? 1 : 0.75,
                          }}
                        >
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
                                defaultValue={val > 0 ? (currencyPref === "USD" ? val.toLocaleString("en-US") : formatWhileTyping(val.toString())) : ""}
                                onBlur={(e) => handleAssetInputChange(cls.id, e.target.value)}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  border: "1.5px solid var(--color-border-subtle)",
                                  background: "var(--color-surface-input)",
                                  color: "var(--color-text-primary)",
                                  fontSize: 13,
                                  textAlign: "right",
                                  width: 140,
                                  fontFamily: tokens.typography.fontFamily,
                                }}
                              />
                            </div>
                            {currencyPref === "USD" && val > 0 && (
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
                    marginTop: 10,
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
