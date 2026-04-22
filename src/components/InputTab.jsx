import React, { useState, useEffect } from 'react';
import "./designtoken.css";

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
  // INTERNAL STATES (as requested)
  const [rawInputs, setRawInputs] = useState({});
  const [rawContribs, setRawContribs] = useState({});
  const [rawExpense, setRawExpense] = useState(undefined);
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [draftAsset, setDraftAsset] = useState(0);
  const [draftContrib, setDraftContrib] = useState(0);
  const [draftReturn, setDraftReturn] = useState(0);
  const [draftDrawdown, setDraftDrawdown] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false); // STATE BARU
  // Tambahkan di bawah showDiscardConfirm (Sekitar baris 46)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [catalogFilter, setCatalogFilter] = useState('all');


  // Initialize draft when modal opens
  useEffect(() => {
    if (editingAssetId !== null) {
      const cls = ASSET_CLASSES.find(c => c.id === editingAssetId);
      setDraftAsset(assets[editingAssetId] || 0);
      setDraftContrib(monthlyContribs[editingAssetId] || 0);
      setDraftReturn(customReturnOverrides[editingAssetId] ?? (cls?.return || 0));
      setDraftDrawdown(customDrawdowns[editingAssetId] ?? (cls?.isEquity ? 30 : 0));
      setShowAdvanced(false);
    }
  }, [editingAssetId]);

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
    const hasChanged =
      draftAsset !== (assets[editingAssetId] || 0) ||
      draftContrib !== (monthlyContribs[editingAssetId] || 0) ||
      draftReturn !== (customReturnOverrides[editingAssetId] ?? (ASSET_CLASSES.find(c => c.id === editingAssetId)?.return || 0)) ||
      draftDrawdown !== (customDrawdowns[editingAssetId] ?? (ASSET_CLASSES.find(c => c.id === editingAssetId)?.isEquity ? 30 : 0));

    if (hasChanged) {
      // Panggil pop-up kustom, bukan bawaan browser
      setShowDiscardConfirm(true);
    } else {
      setEditingAssetId(null);
    }
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
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={activeAssetIds.length >= ASSET_CLASSES.length}
            className="desktop-only"
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
              transition: "all .2s",
              fontFamily: tokens.typography.fontFamily,
            }}
          >
            <span style={{ fontSize: "var(--text-h3-size)", lineHeight: "1" }}>＋</span>
            Instrumen Baru
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
            <button
              onClick={() => setIsModalOpen(true)}
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
                boxShadow: "0 8px 24px rgba(15,23,42,.15)",
                fontFamily: tokens.typography.fontFamily,
                transition: "transform .15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <span style={{ fontSize: "var(--text-h3-size)", lineHeight: "1" }}>＋</span>
              Tambah Instrumen Pertamamu
            </button>
          </div>
        ) : (
          /* ── COMPACT LIST OF ASSETS ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ASSET_CLASSES.filter((cls) => activeAssetIds.includes(cls.id)).map((cls) => {
              const raw = assets[cls.id] || 0;
              const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
              const idr = currencyPref === 'USD' ? raw * customUSDRate : raw;
              const pct = totalAssets > 0 ? ((idr / totalAssets) * 100).toFixed(1) : 0;

              return (
                <div
                  key={cls.id}
                  onClick={() => setEditingAssetId(cls.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 16px",
                    background: "var(--color-surface-card)",
                    borderRadius: 16,
                    cursor: "pointer",
                    boxShadow: tokens.shadows.small || "0 2px 8px rgba(0,0,0,0.05)",
                    border: `1px solid ${"var(--color-border-subtle)"}`,
                    transition: "transform 0.15s, border-color 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-input)";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
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
                </div>
              );
            })}
          </div>
        )}

        {/* ── FLOATING MODAL EDITOR ── */}
        {editingAssetId && (
          <div
            onClick={handleCloseModal}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "auto",
              background: "var(--color-overlay)",
              backdropFilter: "blur(4px)",
              zIndex: 9000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease"
            }}
          >
            <style>
              {`
                @media (max-width: 768px) {
                  .floating-modal-container {
                    align-self: flex-end !important;
                    margin: 16px !important;
                    width: calc(100% - 32px) !important;
                    border-radius: 20px !important;
                  }
                }
                input[type=number]::-webkit-inner-spin-button,
                input[type=number]::-webkit-outer-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                input[type=number] {
                  -moz-appearance: textfield;
                }
                .stepbtn {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  border-radius: 12px;
                  border: 1.5px solid ${"var(--color-border-subtle)"};
                  background: ${"var(--color-surface-card)"};
                  color: ${"var(--color-text-primary)"};
                  font-weight: 800;
                  cursor: pointer;
                  transition: all 0.2s;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                  font-family: ${tokens.typography.fontFamily};
                }
                .stepbtn:hover {
                  background: ${"var(--color-surface-input)"};
                  border-color: ${"var(--color-border-input)"};
                  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                }
                .stepbtn:active {
                  transform: translateY(1px) scale(0.96);
                  background: ${"var(--color-surface-input)"};
                }
                  .floating-modal-container > div::-webkit-scrollbar {
                  display: none;
                }
                .floating-modal-container > div {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}
            </style>
            <div
              className="floating-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--color-surface-card)",
                borderRadius: 20,
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.3)",
                width: "100%",
                maxWidth: 480,
                maxHeight: "85vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {(() => {
                const cls = ASSET_CLASSES.find((c) => c.id === editingAssetId);
                if (!cls) return null;

                const raw = draftAsset;
                const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
                const idr = currencyPref === 'USD' ? raw * customUSDRate : raw;
                const netR = afterTaxReturn(cls, draftReturn).toFixed(1);
                const mc = draftContrib;

                return (
                  <>
                    {/* Header */}
                    <div
                      style={{
                        padding: "20px 24px 16px",
                        borderBottom: `1px solid ${"var(--color-border-subtle)"}`,
                        flexShrink: 0,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: cls.color,
                            }}
                          />
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "var(--text-h3-size)",
                              fontWeight: "var(--text-h1-weight)",
                              color: "var(--color-text-primary)",
                            }}
                          >
                            Edit {cls.name}
                          </h3>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "var(--text-body-size)",
                            color: "var(--color-text-tertiary)",
                            lineHeight: "var(--text-subtitle-line-height)",
                          }}
                        >
                          {cls.description}
                        </p>
                      </div>
                      <button
                        onClick={handleCloseModal}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "var(--text-h3-size)",
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flexGrow: 1 }}>
                      {/* Currency Toggle (if supported) */}
                      {cls.canSwitchCurrency && (
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: "var(--color-surface-app)",
                          borderRadius: 14,
                          gap: 16,
                          border: `1.5px solid ${"var(--color-border-subtle)"}`,
                          marginBottom: 4
                        }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>Input dalam USD?</span>
                            <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)" }}>Ubah konversi USD-IDR di 'Valas USD'</span>
                          </div>
                          <label className="ios-toggle-wrap">
                            <input
                              type="checkbox"
                              hidden
                              checked={currencyPref === 'USD'}
                              onChange={(e) => setAssetCurrencyPrefs(prev => ({
                                ...prev,
                                [cls.id]: e.target.checked ? 'USD' : 'IDR'
                              }))}
                            />
                            <div className="ios-track" style={{
                              background: currencyPref === 'USD' ? "var(--color-semantic-brand)" : "var(--color-border-subtle)",
                              width: 42,
                              height: 24,
                              borderRadius: 12
                            }}>
                              <div className="ios-thumb" style={{
                                transform: currencyPref === 'USD' ? 'translateX(18px)' : 'translateX(0)',
                                width: 18,
                                height: 18,
                                top: 3,
                                left: 3
                              }} />
                            </div>
                          </label>
                        </div>
                      )}

                      {/* Nilai Aset */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          style={{
                            fontSize: "var(--text-body-size)",
                            fontWeight: "var(--text-subtitle-weight)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Berapa total nilai {cls.name} saat ini? ({currencyPref})
                        </label>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "var(--color-text-tertiary)",
                              fontWeight: "var(--text-subtitle-weight)",
                              fontSize: "var(--text-body-size)",
                            }}
                          >
                            {currencyPref === 'USD' ? "$" : "Rp"}
                          </span>
                          <input
                            type="text"
                            className="ifield-lg"
                            value={
                              rawInputs[cls.id] !== undefined
                                ? rawInputs[cls.id]
                                : draftAsset === 0
                                  ? ""
                                  : new Intl.NumberFormat(currencyPref === 'USD' ? "en-US" : "id-ID").format(draftAsset)
                            }
                            onChange={(e) => {
                              const formatted = formatWhileTyping(e.target.value);
                              setRawInputs((prev) => ({ ...prev, [cls.id]: formatted }));
                            }}
                            onBlur={(e) => {
                              const result = parseExpression(e.target.value);
                              if (result !== null) {
                                const max = currencyPref === 'USD' ? 100000 : 1000000000;
                                setDraftAsset(Math.min(result, max));
                              }
                              setRawInputs((prev) => {
                                const n = { ...prev };
                                delete n[cls.id];
                                return n;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                            }}
                            placeholder="0"
                          />


                        </div>
                        <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginLeft: "4px" }}>
                          Bisa operasi matematika (+ dan -)
                        </div>
                      </div>

                      {/* Kontribusi Bulanan */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          style={{
                            fontSize: "var(--text-body-size)",
                            fontWeight: "var(--text-subtitle-weight)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Tambahan investasi rutin setiap bulan (DCA)?
                        </label>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: "var(--color-text-tertiary)",
                              fontWeight: "var(--text-subtitle-weight)",
                              fontSize: "var(--text-body-size)",
                            }}
                          >
                            {currencyPref === 'USD' ? "$" : "Rp"}
                          </span>
                          <input
                            type="text"
                            className="ifield"
                            value={
                              rawContribs[cls.id] !== undefined
                                ? rawContribs[cls.id]
                                : draftContrib === 0
                                  ? ""
                                  : new Intl.NumberFormat(currencyPref === 'USD' ? "en-US" : "id-ID").format(draftContrib)
                            }
                            onChange={(e) => {
                              const formatted = formatWhileTyping(e.target.value);
                              setRawContribs((prev) => ({ ...prev, [cls.id]: formatted }));
                            }}
                            onBlur={(e) => {
                              const result = parseExpression(e.target.value);
                              if (result !== null) {
                                setDraftContrib(Math.min(result, 100000000));
                              }
                              setRawContribs((prev) => {
                                const n = { ...prev };
                                delete n[cls.id];
                                return n;
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.target.blur();
                            }}
                            placeholder="0"
                          />

                        </div>
                      </div>

                      {/* Setup Tambahan (Advanced) */}
                      <div style={{ marginTop: 4 }}>
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          style={{
                            background: "none",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 0",
                            cursor: "pointer",
                            fontSize: "var(--text-body-size)",
                            fontWeight: "var(--text-subtitle-weight)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          <span>Setup Tambahan</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                            style={{
                              width: 14,
                              height: 14,
                              transform: showAdvanced ? "rotate(180deg)" : "rotate(0)",
                              transition: "transform 0.2s",
                            }}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                          </svg>
                        </button>

                        {showAdvanced && (
                          <div
                            style={{
                              marginTop: 16,
                              display: "flex",
                              flexDirection: "column",
                              gap: 20,
                            }}
                          >
                            {/* Custom Return Rate */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <label style={{ fontSize: "var(--text-caption-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-secondary)" }}>
                                Custom Return Rate (%)
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button
                                  className="stepbtn"
                                  style={{ width: 44, height: 44, fontSize: "var(--text-h3-size)", flexShrink: 0 }}
                                  onClick={() => setDraftReturn(prev => Math.max(0, parseFloat((prev - 0.1).toFixed(1))))}
                                >
                                  −
                                </button>
                                <div style={{ position: "relative", flex: 1 }}>
                                  <input
                                    type="number"
                                    step="0.1"
                                    className="ifield-sm"
                                    style={{ textAlign: "center", padding: "0 32px" }}
                                    value={draftReturn}
                                    onChange={(e) => setDraftReturn(Number(e.target.value))}
                                  />
                                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>
                                    %
                                  </span>
                                </div>
                                <button
                                  className="stepbtn"
                                  style={{ width: 44, height: 44, fontSize: "var(--text-h3-size)", flexShrink: 0 }}
                                  onClick={() => setDraftReturn(prev => parseFloat((prev + 0.1).toFixed(1)))}
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Stress Test Drawdown */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              <label style={{ fontSize: "var(--text-caption-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-secondary)" }}>
                                Stress Test Drawdown (%)
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <button
                                  className="stepbtn"
                                  style={{ width: 44, height: 44, fontSize: "var(--text-h3-size)", flexShrink: 0 }}
                                  onClick={() => setDraftDrawdown(prev => Math.max(0, prev - 1))}
                                >
                                  −
                                </button>
                                <div style={{ position: "relative", flex: 1 }}>
                                  <input
                                    type="number"
                                    className="ifield-sm"
                                    style={{ textAlign: "center", padding: "0 32px" }}
                                    value={draftDrawdown}
                                    onChange={(e) => setDraftDrawdown(Number(e.target.value))}
                                  />
                                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>
                                    %
                                  </span>
                                </div>
                                <button
                                  className="stepbtn"
                                  style={{ width: 44, height: 44, fontSize: "var(--text-h3-size)", flexShrink: 0 }}
                                  onClick={() => setDraftDrawdown(prev => Math.min(100, prev + 1))}
                                >
                                  +
                                </button>
                              </div>
                              <span style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginTop: 2 }}>
                                Estimasi penurunan (%) saat skenario terburuk (crash).
                              </span>
                            </div>

                            {/* Custom Kurs USD (Specifically for Valas USD) */}
                            {cls.id === 'usd' && (
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                <label style={{ fontSize: "var(--text-caption-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-secondary)" }}>
                                  Custom Kurs USD (Rp)
                                </label>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ position: "relative", flex: 1 }}>
                                    <input
                                      type="text"
                                      className="ifield-sm"
                                      style={{ paddingLeft: 34 }}
                                      value={new Intl.NumberFormat("id-ID").format(customUSDRate)}
                                      onChange={(e) => setCustomUSDRate(Number(e.target.value.replace(/\D/g, "")))}
                                    />
                                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: "var(--text-caption-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-tertiary)" }}>
                                      Rp
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reset Button */}
                            <button
                              onClick={() => {
                                setDraftReturn(cls.return);
                                setDraftDrawdown(cls.isEquity ? 30 : 0);
                                if (cls.id === 'usd') setCustomUSDRate(17100);
                              }}
                              style={{
                                marginTop: 4,
                                width: "100%",
                                padding: "12px",
                                borderRadius: 12,
                                border: `1.5px solid ${"var(--color-border-subtle)"}`,
                                background: "none",
                                color: "var(--color-text-secondary)",
                                fontWeight: "var(--text-h1-weight)",
                                fontSize: "var(--text-body-size)",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                fontFamily: tokens.typography.fontFamily,
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "var(--color-surface-app)";
                                e.currentTarget.style.borderColor = "var(--color-border-input)";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "none";
                                e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                              }}
                            >
                              Reset ke Default
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Summary Info */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--color-surface-app)",
                          padding: "16px",
                          borderRadius: 12,
                          width: "100%",
                          boxSizing: "border-box",
                          gap: 16 // Kasih jarak aman jika ada elemen kanan
                        }}
                      >
                        {/* THE FIX: flex: 1 memaksa kontainer ini memakan semua sisa ruang */}
                        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                          <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                            Proyeksi Imbal Hasil (Net)
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "var(--text-h3-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-semantic-success)" }}>
                              {netR}%
                            </span>
                            <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>/ thn</span>
                          </div>

                          {/* INFO PAJAK */}
                          <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", fontStyle: "italic", opacity: 0.8 }}>
                            {cls.id === "gold"
                              ? "*Incl. biaya spread & admin ~1.5%"
                              : cls.taxRate === 0
                                ? "*Bebas pajak (0%)"
                                : `*Include pajak/biaya ~${(cls.taxRate * 100) < 1 ? (cls.taxRate * 100).toFixed(1) : (cls.taxRate * 100).toFixed(0)}%`}
                          </div>
                        </div>

                        {((cls.isUSD || cls.canSwitchCurrency) && draftAsset > 0) && (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)", marginBottom: 4, whiteSpace: "nowrap" }}>
                              {currencyPref === 'USD' ? 'Setara Rupiah' : 'Setara USD'}
                            </div>
                            <div style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-text-secondary)" }}>
                              {currencyPref === 'USD' ? formatCompact(idr) : `$${(draftAsset / customUSDRate).toFixed(2)}`}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                        <button
                          onClick={() => {
                            setAssets((prev) => ({ ...prev, [cls.id]: draftAsset }));
                            setMonthlyContribs((prev) => ({ ...prev, [cls.id]: draftContrib }));
                            setCustomReturnOverrides((prev) => ({ ...prev, [cls.id]: draftReturn }));
                            setCustomDrawdowns((prev) => ({ ...prev, [cls.id]: draftDrawdown }));
                            setEditingAssetId(null);
                          }}
                          style={{
                            padding: "16px",
                            borderRadius: 12,
                            border: "none",
                            background: "var(--color-semantic-brand)",
                            color: "var(--color-surface-card)",
                            fontWeight: "var(--text-h1-weight)",
                            fontSize: "var(--text-subtitle-size)",
                            cursor: "pointer",
                            boxShadow: "var(--shadow-medium)",
                            transition: "transform 0.15s",
                          }}
                          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          Simpan & Kembali
                        </button>

                        <button
                          onClick={() => setShowDeleteConfirm(true)} // Pemicu pop-up kustom
                          style={{
                            padding: "12px",
                            borderRadius: 12,
                            border: `1.5px solid ${"var(--color-border-subtle)"}`,
                            background: "none",
                            color: "var(--color-semantic-danger)",
                            fontWeight: "var(--text-subtitle-weight)",
                            fontSize: "var(--text-body-size)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                        >
                          Hapus dari Portofolio
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── MODAL OVERLAY: KATALOG INSTRUMEN ── */}
        {isModalOpen && (
          <div
            onClick={() => setIsModalOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "auto",
              background: "var(--color-overlay)",
              backdropFilter: "blur(4px)",
              zIndex: 8000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              transition: "all 0.3s ease"
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--color-surface-card)",
                borderRadius: 20,
                boxShadow: "0 24px 80px rgba(0,0,0,.22)",
                width: "100%",
                maxWidth: 820,
                maxHeight: "85vh",
                minHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "20px 24px 16px",
                  borderBottom: `1.5px solid ${"var(--color-surface-input)"}`,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--color-surface-card)",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div
                      style={{
                        fontWeight: "var(--text-h1-weight)",
                        fontSize: "var(--text-h3-size)",
                        color: "var(--color-text-primary)",
                        marginBottom: 3,
                      }}
                    >
                      📦 Katalog Instrumen Investasi
                    </div>
                    <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>
                      Pilih instrumen untuk ditambahkan ke simulasi portofoliomu.
                    </div>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      border: `1.5px solid ${"var(--color-border-subtle)"}`,
                      background: "var(--color-surface-app)",
                      color: "var(--color-text-secondary)",
                      fontSize: "var(--text-subtitle-size)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all .15s",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "var(--color-semantic-danger-bg)";
                      e.currentTarget.style.color = "var(--color-semantic-danger)";
                      e.currentTarget.style.borderColor = "var(--color-semantic-danger-border)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "var(--color-surface-app)";
                      e.currentTarget.style.color = "var(--color-text-secondary)";
                      e.currentTarget.style.borderColor = "var(--color-border-subtle)";
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Filter Bar */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    overflowX: "auto",
                    flexWrap: "nowrap",
                    paddingBottom: 4,
                    msOverflowStyle: "none",
                    scrollbarWidth: "none",
                  }}
                >
                  <style>{`
                    .filter-chip::-webkit-scrollbar { display: none; }
                  `}</style>
                  {[
                    { id: 'all', label: 'Semua', sub: 'Semua', color: "var(--color-text-tertiary)" },
                    { id: 'safe', label: 'Safe Haven', sub: 'Safe', color: "var(--color-viz-cash)" },
                    { id: 'stable', label: 'Stable Growth', sub: 'Stable', color: "var(--color-viz-obligasi-fr)" },
                    { id: 'aggressive', label: 'Aggressive', sub: 'Aggressive', color: "var(--color-viz-local-stocks)" }
                  ].map((opt) => {
                    const isActive = catalogFilter === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setCatalogFilter(opt.id)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          minWidth: "fit-content",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            padding: "8px 16px",
                            borderRadius: "100px",
                            fontSize: "var(--text-body-size)",
                            fontWeight: "var(--text-subtitle-weight)",
                            whiteSpace: "nowrap",
                            transition: "all 0.2s",
                            background: isActive ? "var(--color-semantic-brand)" : "var(--color-surface-input)",
                            color: isActive ? "var(--color-surface-card)" : "var(--color-text-secondary)",
                            textAlign: "center"
                          }}
                        >
                          {opt.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: 20,
                  overflowY: "auto",
                  background: "var(--color-surface-app)",
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
                  {(() => {
                    const categoryGroups = {
                      safe: ['cash', 'bankDigital', 'rdpu', 'rdpu_usd', 'usd'],
                      stable: ['sbn_ritel', 'obligasi_fr', 'rdo', 'gold', 'rd_campuran'],
                      aggressive: ['sp500', 'rdSaham', 'saham', 'nasdaq', 'us_stocks', 'kripto']
                    };

                    const filteredAssets = ASSET_CLASSES.filter((cls) => {
                      if (activeAssetIds.includes(cls.id)) return false;
                      if (catalogFilter === 'all') return true;
                      return categoryGroups[catalogFilter]?.includes(cls.id);
                    });

                    if (filteredAssets.length === 0) {
                      return (
                        <div
                          style={{
                            gridColumn: "1/-1",
                            textAlign: "center",
                            padding: "60px 20px",
                            color: "var(--color-text-tertiary)",
                          }}
                        >
                          <div style={{ fontSize: "var(--text-display-size)", marginBottom: 12 }}>✨</div>
                          <div style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-caption-weight)" }}>
                            {catalogFilter === 'all'
                              ? "Semua instrumen sudah aktif di portofoliomu!"
                              : "Tidak ada instrumen di kategori ini"}
                          </div>
                        </div>
                      );
                    }

                    return filteredAssets.map((cls) => (
                      <div
                        key={cls.id}
                        onClick={() => addAsset(cls.id)}
                        style={{
                          background: "var(--color-surface-card)",
                          border: `1.5px solid ${"var(--color-border-subtle)"}`,
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
                          e.currentTarget.style.borderColor = "var(--color-border-subtle)";
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
                              fontWeight: "var(--text-subtitle-weight)",
                              fontSize: "var(--text-body-size)",
                              color: "var(--color-text-primary)",
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
                              fontSize: "var(--text-body-size)",
                              fontWeight: "var(--text-subtitle-weight)",
                              flexShrink: 0,
                            }}
                          >
                            +
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: "var(--text-eyebrow-size)",
                            color: "var(--color-text-tertiary)",
                            lineHeight: "var(--text-caption-line-height)",
                            marginBottom: 10,
                          }}
                        >
                          {cls.description}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                          {(() => {
                            const normalizedRisk = () => {
                              const r = cls.risk.toLowerCase();
                              if (r.includes("rendah") && !r.includes("sedang") && !r.includes("menengah")) return { label: "RENDAH", color: "var(--color-viz-cash)" };
                              if (r.includes("sedang") || r.includes("menengah") || r.includes("menengah-tinggi")) {
                                if (r === "menengah-tinggi") return { label: "TINGGI", color: "var(--color-semantic-danger)" };
                                return { label: "SEDANG", color: "var(--color-viz-obligasi-fr)" };
                              }
                              if (r.includes("tinggi")) return { label: "TINGGI", color: "var(--color-semantic-danger)" };
                              return { label: "SEDANG", color: "var(--color-viz-obligasi-fr)" };
                            };
                            const risk = normalizedRisk();
                            return (
                              <>
                                <span
                                  className="tag"
                                  style={{
                                    background: `${risk.color}14`,
                                    color: risk.color,
                                    border: `1px solid ${risk.color}22`
                                  }}
                                >
                                  {risk.label}
                                </span>
                                <span
                                  className="tag"
                                  style={{
                                    background: `${"var(--color-semantic-brand)"}08`,
                                    color: "var(--color-text-secondary)",
                                    border: `1px solid ${"var(--color-border-subtle)"}`
                                  }}
                                >
                                  {cls.return}% gross
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

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
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
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
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
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
              border: `1px solid ${"var(--color-border-subtle)"}`, boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
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
      <button
        className="fab"
        onClick={() => setIsModalOpen(true)}
        disabled={activeAssetIds.length >= ASSET_CLASSES.length}
        title="Tambah Instrumen"
      >
        + Instrumen Baru
      </button>
      {/* ── STYLED CONFIRMATION POPUP (Mirrored exactly from App.jsx) ── */}
      {showDiscardConfirm && (
        <div
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
            transition: "all 0.3s ease"
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface-card)",
              borderRadius: "16px",
              boxShadow: "0 24px 50px rgba(0,0,0,0.2)",
              width: "100%",
              maxWidth: "360px",
              padding: "16px",
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
          </div>
        </div>
      )}
      {/* ── STYLED DELETE CONFIRMATION POPUP ── */}
      {showDeleteConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "auto",
            zIndex: 10000, // Lebih tinggi dari modal editor
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: "var(--color-overlay)", backdropFilter: "blur(4px)", padding: "16px",
            WebkitTapHighlightColor: "transparent",
            transition: "all 0.3s ease"
          }}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface-card)", borderRadius: "16px",
              boxShadow: "0 24px 50px rgba(0,0,0,0.2)", width: "100%", maxWidth: "360px",
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
          </div>
        </div>
      )}
    </>
  );
}
