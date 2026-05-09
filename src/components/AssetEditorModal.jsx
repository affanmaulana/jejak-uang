import React, { useState, useEffect } from 'react';
import "../styles/tokens.css";

export default function AssetEditorModal({
  editingAssetId,
  setEditingAssetId,
  ASSET_CLASSES,
  assets,
  setAssets,
  monthlyContribs,
  setMonthlyContribs,
  customReturnOverrides,
  setCustomReturnOverrides,
  customDrawdowns,
  setCustomDrawdowns,
  customUSDRate,
  assetCurrencyPrefs,
  setAssetCurrencyPrefs,
  tokens,
  formatIDR,
  formatCompact,
  parseExpression,
  formatWhileTyping,
  afterTaxReturn,
  setShowDeleteConfirm
}) {
  const [draftAsset, setDraftAsset] = useState(0);
  const [draftContrib, setDraftContrib] = useState(0);
  const [draftReturn, setDraftReturn] = useState(0);
  const [draftDrawdown, setDraftDrawdown] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rawInputs, setRawInputs] = useState({});
  const [rawContribs, setRawContribs] = useState({});

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
  }, [editingAssetId, ASSET_CLASSES, assets, monthlyContribs, customReturnOverrides, customDrawdowns]);

  if (!editingAssetId) return null;

  const cls = ASSET_CLASSES.find((c) => c.id === editingAssetId);
  if (!cls) return null;

  const raw = draftAsset;
  const currencyPref = assetCurrencyPrefs[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
  const idr = currencyPref === 'USD' ? raw * customUSDRate : raw;
  const netR = afterTaxReturn(cls, draftReturn).toFixed(1);

  const handleCloseModal = () => {
    const hasChanged =
      draftAsset !== (assets[editingAssetId] || 0) ||
      draftContrib !== (monthlyContribs[editingAssetId] || 0) ||
      draftReturn !== (customReturnOverrides[editingAssetId] ?? (ASSET_CLASSES.find(c => c.id === editingAssetId)?.return || 0)) ||
      draftDrawdown !== (customDrawdowns[editingAssetId] ?? (ASSET_CLASSES.find(c => c.id === editingAssetId)?.isEquity ? 30 : 0));

    if (hasChanged) {
        // Since we can't easily show the discard confirm from here without more props, 
        // we'll just handle it in InputTab for now or pass a prop.
        // Let's pass a prop setShowDiscardConfirm if needed.
        // For now, I'll just close it or let the parent handle the check.
        setEditingAssetId(null); 
    } else {
      setEditingAssetId(null);
    }
  };

  const onSave = () => {
    setAssets((prev) => ({ ...prev, [cls.id]: draftAsset }));
    setMonthlyContribs((prev) => ({ ...prev, [cls.id]: draftContrib }));
    setCustomReturnOverrides((prev) => ({ ...prev, [cls.id]: draftReturn }));
    setCustomDrawdowns((prev) => ({ ...prev, [cls.id]: draftDrawdown }));
    setEditingAssetId(null);
  };

  return (
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
            alignItems: center;
            justify-content: center;
            border-radius: 12px;
            border: 1.5px solid var(--color-border-subtle);
            background: var(--color-surface-card);
            color: var(--color-text-primary);
            font-weight: 800;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: var(--shadow-sm);
            font-family: ${tokens.typography.fontFamily};
          }
          .stepbtn:hover {
            background: var(--color-surface-input);
            border-color: var(--color-border-input);
            box-shadow: var(--shadow-md);
          }
          .stepbtn:active {
            transform: translateY(1px) scale(0.96);
            background: var(--color-surface-input);
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
          boxShadow: "var(--shadow-modal)",
          width: "100%",
          maxWidth: 480,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid var(--color-border-subtle)`,
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
              border: `1.5px solid var(--color-border-subtle)`,
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
                  transform: showAdvanced ? "rotate(180deg)" : "rotate(0deg)",
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
              gap: 16
            }}
          >
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
              onClick={onSave}
              style={{
                padding: "16px",
                borderRadius: 12,
                border: "none",
                background: "var(--color-semantic-brand)",
                color: "var(--color-surface-card)",
                fontWeight: "var(--text-h1-weight)",
                fontSize: "var(--text-subtitle-size)",
                cursor: "pointer",
                boxShadow: "var(--shadow-lg)",
                transition: "transform 0.15s",
              }}
            >
              Simpan & Kembali
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: "12px",
                borderRadius: 12,
                border: `1.5px solid var(--color-border-subtle)`,
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
      </div>
    </div>
  );
}
