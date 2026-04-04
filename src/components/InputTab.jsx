import React, { useState, useEffect } from 'react';

export default function InputTab({
  // Global & Asset Data
  tokens,
  ASSET_CLASSES,
  USD_RATE,
  activeAssetIds,
  assets,
  setAssets,
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
  addAsset,
  removeAsset,
  handleStep,
  handleContribStep,
  handleExpenseStep
}) {
  // INTERNAL STATES (as requested)
  const [rawInputs, setRawInputs] = useState({});
  const [rawContribs, setRawContribs] = useState({});
  const [rawExpense, setRawExpense] = useState("");
  const [editingAssetId, setEditingAssetId] = useState(null);
  const [draftAsset, setDraftAsset] = useState(0);
  const [draftContrib, setDraftContrib] = useState(0);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false); // STATE BARU

  // Initialize draft when modal opens
  useEffect(() => {
    if (editingAssetId !== null) {
      setDraftAsset(assets[editingAssetId] || 0);
      setDraftContrib(monthlyContribs[editingAssetId] || 0);
    }
  }, [editingAssetId]);

  const handleDraftStep = (dir, isUSD) => {
    const step = isUSD ? 50 : 50000;
    const max = isUSD ? 100000 : 1000000000;
    setDraftAsset((prev) => Math.max(0, Math.min(prev + step * dir, max)));
  };

  const handleDraftContribStep = (dir, isUSD) => {
    const step = isUSD ? 50 : 50000;
    const max = 100000000;
    setDraftContrib((prev) => Math.max(0, Math.min(prev + step * dir, max)));
  };

  const handleCloseModal = () => {
    if (editingAssetId === null) return;
    const hasChanged =
      draftAsset !== (assets[editingAssetId] || 0) ||
      draftContrib !== (monthlyContribs[editingAssetId] || 0);

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
          <div style={{ fontSize: 18, fontWeight: 800, color: tokens.colors.text.secondary }}>
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
              fontWeight: 700,
              fontSize: 13,
              cursor: activeAssetIds.length >= ASSET_CLASSES.length ? "not-allowed" : "pointer",
              background: activeAssetIds.length >= ASSET_CLASSES.length ? tokens.colors.surface.input : tokens.colors.semantic.brand,
              color: activeAssetIds.length >= ASSET_CLASSES.length ? tokens.colors.text.tertiary : tokens.colors.surface.card,
              boxShadow: activeAssetIds.length >= ASSET_CLASSES.length ? "none" : tokens.shadows.medium,
              transition: "all .2s",
              fontFamily: tokens.typography.fontFamily,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span>
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
              background: tokens.colors.surface.card,
              border: `2px dashed ${tokens.colors.border.subtle}`,
              borderRadius: 20,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16, filter: "grayscale(1)", opacity: 0.7 }}>🏦</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: tokens.colors.text.primary,
                marginBottom: 8,
                lineHeight: 1.35,
              }}
            >
              Harta yang tak tercatat,
              <br />
              <span style={{ color: tokens.colors.text.tertiary }}>adalah harta yang tak terjaga.</span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: tokens.colors.text.tertiary,
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
                borderRadius: 12,
                border: "none",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                background: tokens.colors.semantic.brand,
                color: tokens.colors.surface.card,
                boxShadow: "0 8px 24px rgba(15,23,42,.15)",
                fontFamily: tokens.typography.fontFamily,
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
          /* ── COMPACT LIST OF ASSETS ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {ASSET_CLASSES.filter((cls) => activeAssetIds.includes(cls.id)).map((cls) => {
              const raw = assets[cls.id] || 0;
              const idr = cls.isUSD ? raw * USD_RATE : raw;
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
                    background: tokens.colors.surface.card,
                    borderRadius: 16,
                    cursor: "pointer",
                    boxShadow: tokens.shadows.small || "0 2px 8px rgba(0,0,0,0.05)",
                    border: `1px solid ${tokens.colors.border.subtle}`,
                    transition: "transform 0.15s, border-color 0.15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = tokens.colors.border.input;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = tokens.colors.border.subtle;
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
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {cls.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: tokens.colors.text.tertiary,
                        }}
                      >
                        {tokens.typography.fontFamily.includes("Inter") ? "Portfolio Component" : cls.risk}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: tokens.colors.text.primary,
                          fontFamily: tokens.typography.fontFamily,
                        }}
                      >
                        {formatIDR(idr)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
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
                        background: tokens.colors.surface.app,
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
                        style={{ width: 18, height: 18, color: tokens.colors.text.secondary }}
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
              background: tokens.colors.overlay,
              backdropFilter: "blur(4px)",
              zIndex: 9000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              `}
            </style>
            <div
              className="floating-modal-container"
              onClick={(e) => e.stopPropagation()}
              style={{
                background: tokens.colors.surface.card,
                borderRadius: 20,
                boxShadow: "0 24px 60px rgba(15, 23, 42, 0.3)",
                width: "100%",
                maxWidth: 480,
                maxHeight: "90vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {(() => {
                const cls = ASSET_CLASSES.find((c) => c.id === editingAssetId);
                if (!cls) return null;

                const raw = draftAsset;
                const idr = cls.isUSD ? raw * USD_RATE : raw;
                const netR = afterTaxReturn(cls).toFixed(1);
                const mc = draftContrib;

                return (
                  <>
                    {/* Header */}
                    <div
                      style={{
                        padding: "20px 24px 16px",
                        borderBottom: `1px solid ${tokens.colors.border.subtle}`,
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
                              fontSize: 18,
                              fontWeight: 800,
                              color: tokens.colors.text.primary,
                            }}
                          >
                            Edit {cls.name}
                          </h3>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            color: tokens.colors.text.tertiary,
                            lineHeight: 1.5,
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
                          fontSize: 20,
                          color: tokens.colors.text.tertiary,
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Nilai Aset */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: tokens.colors.text.secondary,
                          }}
                        >
                          Berapa total nilai {cls.name} saat ini?
                        </label>
                        <div style={{ position: "relative" }}>
                          <span
                            style={{
                              position: "absolute",
                              left: 14,
                              top: "50%",
                              transform: "translateY(-50%)",
                              color: tokens.colors.text.tertiary,
                              fontWeight: 700,
                              fontSize: 14,
                            }}
                          >
                            {cls.isUSD ? "$" : "Rp"}
                          </span>
                          <input
                            type="text"
                            className="ifield"
                            autoFocus
                            style={{
                              paddingLeft: 42,
                              height: 52,
                              fontSize: 18,
                              fontWeight: 800,
                              background: tokens.colors.surface.app,
                            }}
                            value={
                              rawInputs[cls.id] !== undefined
                                ? rawInputs[cls.id]
                                : draftAsset === 0
                                  ? ""
                                  : new Intl.NumberFormat(cls.isUSD ? "en-US" : "id-ID").format(draftAsset)
                            }
                            onChange={(e) => {
                              const formatted = formatWhileTyping(e.target.value);
                              setRawInputs((prev) => ({ ...prev, [cls.id]: formatted }));
                            }}
                            onBlur={(e) => {
                              const result = parseExpression(e.target.value);
                              if (result !== null) {
                                const max = cls.isUSD ? 100000 : 1000000000;
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
                          <div
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              display: "flex",
                              gap: 6,
                            }}
                          >
                            <button className="stepbtn" style={{ width: 34, height: 34 }} onClick={() => handleDraftStep(-1, cls.isUSD)}>
                              −
                            </button>
                            <button className="stepbtn" style={{ width: 34, height: 34 }} onClick={() => handleDraftStep(1, cls.isUSD)}>
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Kontribusi Bulanan */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: tokens.colors.text.secondary,
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
                              color: tokens.colors.text.tertiary,
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {cls.isUSD ? "$" : "Rp"}
                          </span>
                          <input
                            type="text"
                            className="ifield"
                            style={{
                              paddingLeft: 42,
                              height: 48,
                              fontSize: 16,
                              fontWeight: 700,
                              background: tokens.colors.surface.app,
                            }}
                            value={
                              rawContribs[cls.id] !== undefined
                                ? rawContribs[cls.id]
                                : draftContrib === 0
                                  ? ""
                                  : new Intl.NumberFormat(cls.isUSD ? "en-US" : "id-ID").format(draftContrib)
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
                          <div
                            style={{
                              position: "absolute",
                              right: 10,
                              top: "50%",
                              transform: "translateY(-50%)",
                              display: "flex",
                              gap: 6,
                            }}
                          >
                            <button className="stepbtn" style={{ width: 30, height: 30 }} onClick={() => handleDraftContribStep(-1, cls.isUSD)}>
                              −
                            </button>
                            <button className="stepbtn" style={{ width: 30, height: 30 }} onClick={() => handleDraftContribStep(1, cls.isUSD)}>
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Summary Info */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                          background: tokens.colors.surface.app,
                          padding: "8px 16px",
                          borderRadius: 12,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, color: tokens.colors.text.tertiary, marginBottom: 4 }}>
                            Proyeksi Imbal Hasil
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span style={{ fontSize: 16, fontWeight: 800, color: tokens.colors.semantic.success }}>
                              {netR}%
                            </span>
                            <span style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>net / thn</span>
                          </div>
                        </div>
                        {cls.isUSD && idr > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 11, color: tokens.colors.text.tertiary, marginBottom: 4 }}>
                              Setara Rupiah
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.colors.text.secondary }}>
                              {formatCompact(idr)}
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
                            setEditingAssetId(null);
                          }}
                          style={{
                            padding: "16px",
                            borderRadius: 12,
                            border: "none",
                            background: tokens.colors.semantic.brand,
                            color: tokens.colors.surface.card,
                            fontWeight: 800,
                            fontSize: 16,
                            cursor: "pointer",
                            boxShadow: tokens.shadows.medium,
                            transition: "transform 0.15s",
                          }}
                          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                          Simpan & Kembali
                        </button>

                        <button
                          onClick={() => {
                            removeAsset(cls.id);
                            setEditingAssetId(null);
                          }}
                          style={{
                            padding: "12px",
                            borderRadius: 12,
                            border: `1.5px solid ${tokens.colors.border.subtle}`,
                            background: "none",
                            color: tokens.colors.semantic.danger,
                            fontWeight: 700,
                            fontSize: 13,
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
              background: tokens.colors.overlay,
              backdropFilter: "blur(4px)",
              zIndex: 8000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: tokens.colors.surface.card,
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
                  borderBottom: `1.5px solid ${tokens.colors.surface.input}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: tokens.colors.surface.card,
                  flexShrink: 0,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 18,
                      color: tokens.colors.text.primary,
                      marginBottom: 3,
                    }}
                  >
                    📦 Katalog Instrumen Investasi
                  </div>
                  <div style={{ fontSize: 12, color: tokens.colors.text.tertiary }}>
                    Pilih instrumen untuk ditambahkan ke simulasi portofoliomu.
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: `1.5px solid ${tokens.colors.border.subtle}`,
                    background: tokens.colors.surface.app,
                    color: tokens.colors.text.secondary,
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all .15s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = tokens.colors.semantic.dangerBg;
                    e.currentTarget.style.color = tokens.colors.semantic.danger;
                    e.currentTarget.style.borderColor = tokens.colors.semantic.dangerBorder;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = tokens.colors.surface.app;
                    e.currentTarget.style.color = tokens.colors.text.secondary;
                    e.currentTarget.style.borderColor = tokens.colors.border.subtle;
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
                  background: tokens.colors.surface.app,
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
                        background: tokens.colors.surface.card,
                        border: `1.5px solid ${tokens.colors.border.subtle}`,
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
                        e.currentTarget.style.borderColor = tokens.colors.border.subtle;
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
                            color: tokens.colors.text.primary,
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
                          color: tokens.colors.text.tertiary,
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
                          style={{ background: tokens.colors.surface.input, color: tokens.colors.text.secondary }}
                        >
                          {cls.risk}
                        </span>
                        <span
                          className="tag"
                          style={{ background: tokens.colors.semantic.successBg, color: tokens.colors.semantic.success }}
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
                        color: tokens.colors.text.tertiary,
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

      {/* ══════════════════════════════════════════════
          MODUL DANA DARURAT (DEFENSIF)
      ══════════════════════════════════════════════ */}
      <hr
        style={{
          border: 0,
          borderTop: `1.5px dashed ${tokens.colors.border.input}`,
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
              color: tokens.colors.text.primary,
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
                style={{ background: includeEmergencyInTotal ? tokens.colors.semantic.brand : tokens.colors.border.input }}
                onClick={() => setIncludeEmergencyInTotal((v) => !v)}
              >
                <div
                  className="ios-thumb"
                  style={{ transform: includeEmergencyInTotal ? "translateX(16px)" : "translateX(0)" }}
                />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: tokens.colors.text.secondary, cursor: "pointer" }}
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
                <div className="cl" style={{ color: tokens.colors.text.secondary }}>Pengeluaran Bulanan</div>
                <div style={{ position: "relative", marginTop: 4 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: tokens.colors.text.tertiary,
                      fontSize: 13,
                      fontFamily: tokens.typography.fontFamily,
                    }}
                  >
                    Rp
                  </span>
                  <input
                    type="text"
                    className="ifield"
                    value={
                      rawExpense !== ""
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
                      // Jika result null (kosong/dihapus), paksa jadi 0
                      setMonthlyExpense(result !== null ? Math.min(result, 1000000000) : 0);
                      setRawExpense("");
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
                <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 4, letterSpacing: ".01em" }}>
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
                  style={{ width: "100%", textAlign: "center", color: tokens.colors.text.secondary }}
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
                      accentColor: tokens.colors.semantic.brand,
                      background: `linear-gradient(to right,${tokens.colors.semantic.brand} ${((targetMonths - 3) / 9) * 100
                        }%,${tokens.colors.border.subtle} 0%)`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: tokens.typography.fontFamily,
                      fontSize: 16,
                      fontWeight: 800,
                      color: tokens.colors.semantic.brand,
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
                <div className="cl" style={{ color: tokens.colors.text.secondary }}>Total Kebutuhan</div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: 26,
                    fontWeight: 800,
                    color: tokens.colors.text.primary,
                    marginTop: 4,
                  }}
                >
                  {formatCompact(monthlyExpense * targetMonths)}
                </div>
                <div style={{ fontSize: 12, color: tokens.colors.text.tertiary, marginTop: 2 }}>
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
              style={{ padding: "16px 20px", borderTop: `6px solid ${tokens.colors.dataViz.cash}` }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.tertiary }}
              >
                Lapis 1 ({t1Months} Bulan) - Cash / Bank
              </div>
              <div
                style={{
                  fontFamily: tokens.typography.fontFamily,
                  fontSize: 20,
                  fontWeight: 800,
                  color: tokens.colors.text.primary,
                  margin: "6px 0",
                }}
              >
                {formatIDR(monthlyExpense * t1Months)}
              </div>
              <div style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>
                Untuk likuiditas instan H-0. Hindari instrumen fluktuatif.
              </div>
            </div>

            {/* Card Lapis 2: Bank Digital */}
            <div
              className="card"
              style={{ padding: "16px 20px", borderTop: `6px solid ${tokens.colors.dataViz.digitalBank}` }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.tertiary }}
              >
                Lapis 2 ({t2Months} Bulan) - Bank Digital
              </div>
              <div
                style={{
                  fontFamily: tokens.typography.fontFamily,
                  fontSize: 20,
                  fontWeight: 800,
                  color: tokens.colors.text.primary,
                  margin: "6px 0",
                }}
              >
                {formatIDR(monthlyExpense * t2Months)}
              </div>
              <div style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>
                Likuiditas tinggi dengan yield lebih baik dari bank
                konvensional.
              </div>
            </div>

            {/* Card Lapis 3: RDPU */}
            <div
              className="card"
              style={{ padding: "16px 20px", borderTop: `6px solid ${tokens.colors.dataViz.rdpu}` }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.tertiary }}
              >
                Lapis 3 ({t3Months} Bulan) - RDPU
              </div>
              <div
                style={{
                  fontFamily: tokens.typography.fontFamily,
                  fontSize: 20,
                  fontWeight: 800,
                  color: tokens.colors.text.primary,
                  margin: "6px 0",
                }}
              >
                {formatIDR(monthlyExpense * t3Months)}
              </div>
              <div style={{ fontSize: 11, color: tokens.colors.text.tertiary }}>
                Pelindung nilai dari inflasi. Pencairan memakan waktu 1-3 hari
                kerja.
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
            top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tokens.colors.overlay,
            backdropFilter: "blur(4px)",
            padding: "16px",
            WebkitTapHighlightColor: "transparent"
          }}
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
              Angka yang kamu ubah belum disimpan. Yakin ingin membuang perubahan ini?
            </p>
            <div style={{ display: "flex", gap: "8px", width: "100%" }}>
              <button
                onClick={() => setShowDiscardConfirm(false)}
                style={{
                  flex: 1,
                  padding: "12px 0", borderRadius: "8px", border: `1.5px solid ${tokens.colors.border.subtle}`,
                  background: tokens.colors.surface.input, color: tokens.colors.text.secondary, fontWeight: 700, fontSize: "14px",
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
                  background: tokens.colors.semantic.danger, color: "#FFFFFF", fontWeight: 700, fontSize: "14px",
                  cursor: "pointer", fontFamily: tokens.typography.fontFamily
                }}
              >
                Ya, Buang
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
