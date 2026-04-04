import React, { useState } from 'react';

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
                          color: tokens.colors.text.primary,
                        }}
                      >
                        {cls.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: tokens.colors.text.tertiary,
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
                          fontFamily: tokens.typography.fontFamily,
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
                          color: tokens.colors.text.tertiary,
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
                      style={{ background: tokens.colors.surface.input, color: tokens.colors.text.secondary }}
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
                        color: tokens.colors.text.tertiary,
                        fontSize: 12,
                        fontFamily: tokens.typography.fontFamily,
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
                  <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 4, letterSpacing: ".01em" }}>
                    Bisa operasi matematika (+ dan -)
                  </div>

                  {/* ── KONTRIBUSI BULANAN ── */}
                  <div className="contrib-row">
                    <div className="cl" style={{ color: tokens.colors.dataViz.bonds }}>
                      + Kontribusi Rutin / Bulan
                    </div>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: tokens.colors.text.tertiary,
                          fontSize: 11,
                          fontFamily: tokens.typography.fontFamily,
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
                      borderTop: `1px solid ${tokens.colors.surface.input}`,
                      paddingTop: 8,
                    }}
                  >
                    <span>
                      <span style={{ color: tokens.colors.text.tertiary }}>Gross: </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: tokens.typography.fontFamily,
                          color: tokens.colors.text.secondary,
                        }}
                      >
                        {cls.return}%
                      </span>
                    </span>
                    <span>
                      <span style={{ color: tokens.colors.text.tertiary }}>After-Tax: </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: tokens.typography.fontFamily,
                          color: tokens.colors.semantic.success,
                        }}
                      >
                        {netR}%
                      </span>
                    </span>
                    {cls.isUSD && idr > 0 && (
                      <span>
                        <span style={{ color: tokens.colors.text.tertiary }}>≈ </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontFamily: tokens.typography.fontFamily,
                            color: tokens.colors.semantic.warning,
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
                      if (result !== null) {
                        setMonthlyExpense(Math.min(result, 1000000000));
                      }
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
    </>
  );
}
