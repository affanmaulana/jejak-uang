import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import "../styles/tokens.css";
import AssetEditorModal from './AssetEditorModal';
import AssetCatalogModal from './AssetCatalogModal';

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.2 } 
  }
};

export default function InputTab({
  // Global & Asset Data
  tokens,
  ASSET_CLASSES,
  activeAssetIds,
  assets,
  setAssets,
  customUSDRate,
  setCustomUSDRate,
  assetCurrencyPrefs,
  setAssetCurrencyPrefs,
  monthlyContribs,
  setMonthlyContribs,
  totalAssets,

  // Modal & Catalog State
  isModalOpen,
  setIsModalOpen,

  // Emergency Fund State
  monthlyExpense,
  setMonthlyExpense,
  targetMonths,
  setTargetMonths,
  includeEmergencyInTotal,
  setIncludeEmergencyInTotal,

  // Profile/Template State (if used)
  userTemplates,
  activeTemplateId,
  saveNewTemplate,

  // Helpers & Handlers
  formatIDR,
  formatCompact,
  parseExpression,
  formatWhileTyping,
  afterTaxReturn,
  customReturnOverrides,
  setCustomReturnOverrides,
  customDrawdowns,
  setCustomDrawdowns,
  addAsset,
  removeAsset
}) {
  // INTERNAL STATES
  const [rawExpense, setRawExpense] = useState(undefined);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('all');

  // ── BODY SCROLL LOCK ──
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || editingAssetId !== null || showDiscardConfirm || showDeleteConfirm;
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
  }, [isModalOpen, editingAssetId, showDiscardConfirm, showDeleteConfirm]);




  const handleCloseModal = () => {
    if (editingAssetId === null) return;
    setEditingAssetId(null);
  };

  // Derived logic for Emergency Fund tiering
  const t1Months = 1;
  const t2Months = 2;
  const t3Months =
    targetMonths - t1Months - t2Months > 0
      ? targetMonths - t1Months - t2Months
      : 0;

  return (
    <>
      <div>
        {/* ── OPTION 2: TOP MODAL — Action Header ── */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>
            {activeAssetIds.length > 0
              ? `${activeAssetIds.length} instrumen aktif`
              : "Belum ada instrumen dipilih"}
          </div>
          <motion.button
            onClick={() => setIsModalOpen(true)}
            disabled={activeAssetIds.length >= ASSET_CLASSES.length}
            className="desktop-only"
            whileHover={activeAssetIds.length >= ASSET_CLASSES.length ? {} : { scale: 1.02, y: -1 }}
            whileTap={activeAssetIds.length >= ASSET_CLASSES.length ? {} : { scale: 0.98 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 12,
              border: "none",
              fontWeight: "var(--text-subtitle-weight)",
              fontSize: "var(--text-body-size)",
              cursor: activeAssetIds.length >= ASSET_CLASSES.length ? "not-allowed" : "pointer",
              background: activeAssetIds.length >= ASSET_CLASSES.length ? "var(--color-surface-input)" : "var(--color-semantic-brand)",
              color: activeAssetIds.length >= ASSET_CLASSES.length ? "var(--color-text-tertiary)" : "var(--color-surface-card)",
              boxShadow: activeAssetIds.length >= ASSET_CLASSES.length ? "none" : "var(--shadow-medium)",
              transition: "background-color .2s, color .2s",
              fontFamily: tokens.typography.fontFamily,
            }}
          >
            <span style={{ fontSize: "var(--text-h3-size)", lineHeight: "1" }}>＋</span>
            Instrumen Baru
          </motion.button>
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
              background: "var(--color-surface-card)",
              border: `2px dashed ${"var(--color-border-subtle)"}`,
              borderRadius: 20,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "var(--text-display-size)", marginBottom: 16, filter: "grayscale(1)", opacity: 0.7 }}>🏦</div>
            <div
              style={{
                fontSize: "var(--text-h2-size)",
                fontWeight: "var(--text-h1-weight)",
                color: "var(--color-text-primary)",
                marginBottom: 8,
                lineHeight: "var(--text-h2-line-height)",
              }}
            >
              Harta yang tak tercatat,
              <br />
              <span style={{ color: "var(--color-text-tertiary)" }}>adalah harta yang tak terjaga.</span>
            </div>
            <div
              style={{
                fontSize: "var(--text-body-size)",
                color: "var(--color-text-tertiary)",
                marginBottom: 28,
                maxWidth: 360,
                lineHeight: "var(--text-body-line-height)",
              }}
            >
              Mulai lacak portofoliomu. Pilih instrumen investasi yang kamu miliki dan simulasikan pertumbuhannya.
            </div>
            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                borderRadius: 12,
                border: "none",
                fontWeight: "var(--text-h1-weight)",
                fontSize: "var(--text-body-size)",
                cursor: "pointer",
                background: "var(--color-semantic-brand)",
                color: "var(--color-surface-card)",
                boxShadow: "var(--shadow-lg)",
                fontFamily: tokens.typography.fontFamily,
              }}
            >
              <span style={{ fontSize: "var(--text-h3-size)", lineHeight: "1" }}>＋</span>
              Tambah Instrumen Pertamamu
            </motion.button>
          </div>
        ) : (
          /* ── COMPACT LIST OF ASSETS ── */
          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            layout
          >
            <AnimatePresence initial={false}>
              {ASSET_CLASSES.filter((cls) => activeAssetIds.includes(cls.id)).map((cls) => {
                const raw = assets[cls.id] || 0;
                const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
                const idr = currencyPref === 'USD' ? raw * customUSDRate : raw;
                const pct = totalAssets > 0 ? ((idr / totalAssets) * 100).toFixed(1) : 0;

                return (
                  <motion.div
                    key={cls.id}
                    layout
                    variants={listItemVariants}
                    exit="exit"
                    onClick={() => setEditingAssetId(cls.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 16px",
                      background: "var(--color-surface-card)",
                      borderRadius: 16,
                      cursor: "pointer",
                      boxShadow: tokens.shadows.small || "var(--shadow-sm)",
                      border: `1px solid var(--color-border-subtle)`,
                    }}
                  whileHover={{
                    y: -2,
                    borderColor: "var(--color-border-input)",
                    boxShadow: "var(--shadow-glow, 0 8px 24px rgba(0,0,0,0.06))",
                  }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
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
                        }}
                      >
                        {cls.name}
                      </span>
                      <span
                        style={{
                          fontSize: "var(--text-eyebrow-size)",
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {tokens.typography.fontFamily.includes("Inter") ? "Portfolio Component" : cls.risk}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          fontSize: "var(--text-body-size)",
                          fontWeight: "var(--text-h1-weight)",
                          color: "var(--color-text-primary)",
                          fontFamily: tokens.typography.fontFamily,
                        }}
                      >
                        {formatIDR(idr)}
                      </div>
                      <div
                        style={{
                          fontSize: "var(--text-eyebrow-size)",
                          fontWeight: "var(--text-subtitle-weight)",
                          color: cls.color,
                        }}
                      >
                        {pct}%
                      </div>
                    </div>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "var(--color-surface-app)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        style={{ width: 18, height: 18, color: "var(--color-text-secondary)" }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── FLOATING MODAL EDITOR ── */}
        <AnimatePresence>
          {editingAssetId !== null && (
            <AssetEditorModal
              editingAssetId={editingAssetId}
              setEditingAssetId={setEditingAssetId}
              ASSET_CLASSES={ASSET_CLASSES}
              assets={assets}
              setAssets={setAssets}
              monthlyContribs={monthlyContribs}
              setMonthlyContribs={setMonthlyContribs}
              customReturnOverrides={customReturnOverrides}
              setCustomReturnOverrides={setCustomReturnOverrides}
              customDrawdowns={customDrawdowns}
              setCustomDrawdowns={setCustomDrawdowns}
              customUSDRate={customUSDRate}
              assetCurrencyPrefs={assetCurrencyPrefs}
              setAssetCurrencyPrefs={setAssetCurrencyPrefs}
              tokens={tokens}
              formatIDR={formatIDR}
              formatCompact={formatCompact}
              parseExpression={parseExpression}
              formatWhileTyping={formatWhileTyping}
              afterTaxReturn={afterTaxReturn}
              setShowDeleteConfirm={setShowDeleteConfirm}
            />
          )}
        </AnimatePresence>

        {/* ── MODAL OVERLAY: KATALOG INSTRUMEN ── */}
        <AnimatePresence>
          {isModalOpen && (
            <AssetCatalogModal
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              ASSET_CLASSES={ASSET_CLASSES}
              activeAssetIds={activeAssetIds}
              addAsset={addAsset}
              catalogFilter={catalogFilter}
              setCatalogFilter={setCatalogFilter}
            />
          )}
        </AnimatePresence>

      </div>

      {/* ══════════════════════════════════════════════
          MODUL DANA DARURAT (DEFENSIF)
      ══════════════════════════════════════════════ */}
      <hr
        style={{
          border: 0,
          borderTop: `1.5px dashed ${"var(--color-border-input)"}`,
          margin: "16px 0",
        }}
      />

      <div style={{ marginBottom: 8 }}>
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
              fontSize: "var(--text-h3-size)",
              fontWeight: "var(--text-h1-weight)",
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Dana Darurat
          </h2>

          {/* TOGGLE PENGGABUNGAN ASET */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label className="ios-toggle-wrap">
              <div
                className="ios-track"
                style={{ background: includeEmergencyInTotal ? "var(--color-semantic-brand)" : "var(--color-border-input)" }}
                onClick={() => setIncludeEmergencyInTotal((v) => !v)}
              >
                <div
                  className="ios-thumb"
                  style={{ transform: includeEmergencyInTotal ? "translateX(16px)" : "translateX(0)" }}
                />
              </div>
              <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-caption-weight)", color: "var(--color-text-secondary)", cursor: "pointer" }}
                onClick={() => setIncludeEmergencyInTotal((v) => !v)}
              >
                Gabungkan ke Total Aset
              </span>
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
                <div className="cl" style={{ color: "var(--color-text-secondary)" }}>Pengeluaran Bulanan</div>
                <div style={{ position: "relative", marginTop: 4 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--color-text-tertiary)",
                      fontSize: "var(--text-body-size)",
                      fontFamily: tokens.typography.fontFamily,
                    }}
                  >
                    Rp
                  </span>
                  <input
                    type="text"
                    className="ifield"
                    value={
                      rawExpense !== undefined
                        ? rawExpense
                        : monthlyExpense === 0
                          ? ""
                          : new Intl.NumberFormat("id-ID").format(monthlyExpense)
                    }
                    onChange={(e) => {
                      const formatted = formatWhileTyping(e.target.value);
                      setRawExpense(formatted);
                    }}
                    onBlur={(e) => {
                      const result = parseExpression(e.target.value);
                      // Paksa jadi 0 kalau user menghapus habis angkanya
                      setMonthlyExpense(result !== null ? Math.min(result, 1000000000) : 0);
                      // Kembalikan ke undefined agar React tahu kita berhenti ngedit
                      setRawExpense(undefined);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.target.blur();
                    }}
                    placeholder="0"
                  />

                </div>
                <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginTop: 4, letterSpacing: ".01em" }}>
                  Bisa operasi matematika (+ dan -)
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
                  style={{ width: "100%", textAlign: "center", color: "var(--color-text-secondary)" }}
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
                      accentColor: "var(--color-semantic-brand)",
                      background: `linear-gradient(to right,${"var(--color-semantic-brand)"} ${((targetMonths - 3) / 9) * 100
                        }%,${"var(--color-border-subtle)"} 0%)`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: tokens.typography.fontFamily,
                      fontSize: "var(--text-subtitle-size)",
                      fontWeight: "var(--text-h1-weight)",
                      color: "var(--color-semantic-brand)",
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
                <div className="cl" style={{ color: "var(--color-text-secondary)" }}>Total Kebutuhan</div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: "var(--text-h2-size)",
                    fontWeight: "var(--text-h1-weight)",
                    color: "var(--color-text-primary)",
                    marginTop: 4,
                  }}
                >
                  {formatCompact(monthlyExpense * targetMonths)}
                </div>
                <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                  {formatIDR(monthlyExpense * targetMonths)}
                </div>
              </div>
            </div>
          </div>

          {/* BARIS 2: TIERING CARDS (Compact, Read-Only Style) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

            {/* ── Lapis 1: Cash/Bank ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px",
              background: "var(--color-surface-card)", borderRadius: 16,
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                {/* Indikator Warna Sesuai Token DataViz */}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-viz-cash)", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-primary)" }}>Lapis 1: Cash / Bank</span>
                  <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>Target {t1Months} Bulan • Likuiditas Instan</span>
                </div>
              </div>
              <div style={{ textAlign: "right", gap: 4 }}>
                <div style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)", fontFamily: tokens.typography.fontFamily }}>
                  {formatIDR(monthlyExpense * t1Months)}
                </div>
                <div style={{ fontSize: "var(--text-eyebrow-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>Target Dana</div>
              </div>
            </div>

            {/* ── Lapis 2: Bank Digital ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px",
              background: "var(--color-surface-card)", borderRadius: 16,
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-viz-digital-bank)", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-primary)" }}>Lapis 2: Bank Digital</span>
                  <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>Target {t2Months} Bulan • Yield Lebih Baik</span>
                </div>
              </div>
              <div style={{ textAlign: "right", gap: 4 }}>
                <div style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)", fontFamily: tokens.typography.fontFamily }}>
                  {formatIDR(monthlyExpense * t2Months)}
                </div>
                <div style={{ fontSize: "var(--text-eyebrow-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>Target Dana</div>
              </div>
            </div>

            {/* ── Lapis 3: RDPU ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px",
              background: "var(--color-surface-card)", borderRadius: 16,
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "var(--shadow-sm)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-viz-rdpu)", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-primary)" }}>Lapis 3: RDPU</span>
                  <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>Target {t3Months} Bulan • Pelindung Inflasi</span>
                </div>
              </div>
              <div style={{ textAlign: "right", gap: 4 }}>
                <div style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)", fontFamily: tokens.typography.fontFamily }}>
                  {formatIDR(monthlyExpense * t3Months)}
                </div>
                <div style={{ fontSize: "var(--text-eyebrow-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>Target Dana</div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MOBILE FAB ── */}
      {activeAssetIds.length > 0 && (
        <button
          className="fab"
          onClick={() => setIsModalOpen(true)}
          disabled={activeAssetIds.length >= ASSET_CLASSES.length}
          title="Tambah Instrumen"
        >
          + Instrumen Baru
        </button>
      )}
      {/* ── STYLED CONFIRMATION POPUP (Mirrored exactly from App.jsx) ── */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div
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
              WebkitTapHighlightColor: "transparent",
            }}
            onClick={() => setShowDiscardConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{
                backgroundColor: "var(--color-surface-card)",
                borderRadius: "16px",
                boxShadow: "var(--shadow-xl)",
                width: "100%",
                maxWidth: "360px",
                padding: "20px",
                textAlign: "center"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-body-weight)", color: "var(--color-text-primary)", lineHeight: "var(--text-body-line-height)", marginBottom: "22px", fontFamily: tokens.typography.fontFamily }}>
                Angka yang kamu ubah belum disimpan. Yakin ingin membuang perubahan ini?
              </p>
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "12px 0", borderRadius: "8px", border: `1.5px solid ${"var(--color-border-subtle)"}`,
                    background: "var(--color-surface-input)", color: "var(--color-text-secondary)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
                    cursor: "pointer", fontFamily: tokens.typography.fontFamily
                  }}
                >
                  Lanjut Edit
                </button>
                <button
                  onClick={() => {
                    setEditingAssetId(null);
                    setShowDiscardConfirm(false);
                  }}
                  style={{
                    flex: 1,
                    padding: "12px 0", borderRadius: "8px", border: "none",
                    background: "var(--color-semantic-danger)", color: "var(--color-surface-card)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
                    cursor: "pointer", fontFamily: tokens.typography.fontFamily
                  }}
                >
                  Ya, Buang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STYLED DELETE CONFIRMATION POPUP ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "auto",
              zIndex: 10000, // Lebih tinggi dari modal editor
              backgroundColor: "var(--color-overlay)", backdropFilter: "blur(4px)", padding: "16px",
              WebkitTapHighlightColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{
                backgroundColor: "var(--color-surface-card)", borderRadius: "16px",
                boxShadow: "var(--shadow-xl)", width: "100%", maxWidth: "360px",
                padding: "20px", textAlign: "center"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-body-weight)", color: "var(--color-text-primary)", lineHeight: "var(--text-body-line-height)", marginBottom: "22px", fontFamily: tokens.typography.fontFamily }}>
                Hapus <strong>{ASSET_CLASSES.find(c => c.id === editingAssetId)?.name}</strong> dari portofolio? Semua data nilai dan kontribusi akan hilang permanen.
              </p>
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: "8px", border: `1.5px solid ${"var(--color-border-subtle)"}`,
                    background: "var(--color-surface-input)", color: "var(--color-text-secondary)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
                    cursor: "pointer", fontFamily: tokens.typography.fontFamily
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    removeAsset(editingAssetId);
                    setEditingAssetId(null);
                    setShowDeleteConfirm(false);
                  }}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: "8px", border: "none",
                    background: "var(--color-semantic-danger)", color: "var(--color-surface-card)", fontWeight: "var(--text-subtitle-weight)", fontSize: "var(--text-body-size)",
                    cursor: "pointer", fontFamily: tokens.typography.fontFamily
                  }}
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
