import React, { useState, useMemo } from 'react';
import "../styles/tokens.css";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const formatIDR = (v) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);
const formatCompact = (v) => {
  if (v >= 1e12) return `Rp${(v / 1e12).toFixed(1)}T`;
  if (v >= 1e9) return `Rp${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `Rp${(v / 1e6).toFixed(0)}Jt`;
  return formatIDR(v);
};

const formatWhileTyping = (raw) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(digits, 10));
};

const parseFormatted = (str) => parseInt(str.replace(/\D/g, ""), 10) || 0;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: "var(--color-surface-card)",
      border: "1.5px solid var(--color-border-subtle)",
      borderRadius: 12,
      padding: "12px 16px",
      boxShadow: "none",
    }}>
      <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
          <span style={{ fontSize: "var(--text-body-size)", color: "var(--color-text-secondary)" }}>{p.name}:</span>
          <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>{formatCompact(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function KalkulatorPensiun({ userTemplates, ASSET_CLASSES, tokens }) {
  const [mode, setMode] = useState("manual"); // "manual" | "template"
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Manual inputs
  const [currentAge, setCurrentAge] = useState(25);
  const [retirementAge, setRetirementAge] = useState(55);
  const [rawInitial, setRawInitial] = useState("");
  const [initialAmount, setInitialAmount] = useState(0);
  const [rawMonthly, setRawMonthly] = useState("");
  const [monthlyContrib, setMonthlyContrib] = useState(1000000);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [inflationRate, setInflationRate] = useState(5);

  const years = Math.max(retirementAge - currentAge, 1);

  // Derived from template
  const templateData = useMemo(() => {
    if (mode !== "template" || !selectedTemplateId) return null;
    const t = (userTemplates || []).find(x => x.id === selectedTemplateId);
    if (!t) return null;
    const DEFAULT_USD_RATE = 17100;
    let totalAsset = 0;
    let totalContrib = 0;
    let weightedReturn = 0;
    let totalWeight = 0;
    (ASSET_CLASSES || []).forEach(cls => {
      const pref = (t.assetCurrencyPrefs || {})[cls.id] || (cls.isUSD ? 'USD' : 'IDR');
      const raw = (t.assets || {})[cls.id] || 0;
      const idr = pref === 'USD' ? raw * (t.customUSDRate || DEFAULT_USD_RATE) : raw;
      const mc = (t.contribs || {})[cls.id] || 0;
      const mcIdr = pref === 'USD' ? mc * (t.customUSDRate || DEFAULT_USD_RATE) : mc;
      totalAsset += idr;
      totalContrib += mcIdr;
      if (idr > 0) {
        const r = (t.customReturns || {})[cls.id] !== undefined ? (t.customReturns || {})[cls.id] : cls.return;
        weightedReturn += r * idr;
        totalWeight += idr;
      }
    });
    return {
      initialAmount: totalAsset,
      monthlyContrib: totalContrib,
      annualReturn: totalWeight > 0 ? parseFloat((weightedReturn / totalWeight).toFixed(2)) : 8,
    };
  }, [mode, selectedTemplateId, userTemplates, ASSET_CLASSES]);

  const effectiveInitial = mode === "template" && templateData ? templateData.initialAmount : initialAmount;
  const effectiveMonthly = mode === "template" && templateData ? templateData.monthlyContrib : monthlyContrib;
  const effectiveReturn = mode === "template" && templateData ? templateData.annualReturn : annualReturn;

  // FV Calculation
  const chartData = useMemo(() => {
    const r = effectiveReturn / 100;
    const data = [];
    for (let y = 0; y <= years; y++) {
      const fvInitial = effectiveInitial * Math.pow(1 + r, y);
      const fvContrib = r > 0
        ? effectiveMonthly * 12 * (Math.pow(1 + r, y) - 1) / r
        : effectiveMonthly * 12 * y;
      const portfolio = Math.round(fvInitial + fvContrib);
      const totalContributed = Math.round(effectiveInitial + effectiveMonthly * 12 * y);
      const real = Math.round(portfolio / Math.pow(1 + inflationRate / 100, y));
      data.push({
        label: currentAge + y === currentAge ? "Sekarang" : `Usia ${currentAge + y}`,
        portfolio,
        totalContributed,
        real,
      });
    }
    return data;
  }, [effectiveInitial, effectiveMonthly, effectiveReturn, inflationRate, years, currentAge]);

  const finalValue = chartData[chartData.length - 1]?.portfolio || 0;
  const finalContributed = chartData[chartData.length - 1]?.totalContributed || 0;
  const finalReal = chartData[chartData.length - 1]?.real || 0;
  const totalGrowth = finalValue - finalContributed;
  const growthMultiple = finalContributed > 0 ? (finalValue / finalContributed).toFixed(1) : 0;

  const inputStyle = {
    width: "100%",
    background: "var(--color-surface-input)",
    border: "1.5px solid var(--color-border-subtle)",
    borderRadius: 12,
    color: "var(--color-text-primary)",
    fontFamily: tokens?.typography?.fontFamily || "inherit",
    outline: "none",
    padding: "12px 16px",
    fontSize: "var(--text-subtitle-size)",
    fontWeight: "var(--text-subtitle-weight)",
    boxSizing: "border-box",
    transition: "all 0.2s",
  };

  const labelStyle = {
    fontSize: "var(--text-eyebrow-size)",
    fontWeight: "var(--text-eyebrow-weight)",
    color: "var(--color-text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "var(--text-eyebrow-letter-spacing)",
    marginBottom: 6,
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 100 }}>
      {/* 2-COLUMN MAIN LAYOUT (INPUT LEFT 2:5 PROJECTION RIGHT) */}
      <div className="pensiun-grid" style={{
        display: "grid",
        gridTemplateColumns: "2fr 5fr",
        gap: 20,
        alignItems: "start"
      }}>
        {/* LEFT COLUMN: PARAMETER INPUT CARD */}
        <div style={{
          background: "var(--color-surface-card)",
          border: "1.5px solid var(--color-border-subtle)",
          borderRadius: 20,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16
        }}>
          {/* TAB CHOOSER (INPUT MANUAL / TEMPLATE) MOVED TO LEFT COLUMN AT TOP */}
          <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--color-surface-input)", borderRadius: 12, border: "1.5px solid var(--color-border-subtle)" }}>
            {[["manual", "Manual"], ["template", "Tersimpan"]].map(([m, lbl]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: tokens?.typography?.fontFamily || "inherit",
                  fontSize: "var(--text-body-size)",
                  fontWeight: "var(--text-subtitle-weight)",
                  background: mode === m ? "var(--color-surface-card)" : "transparent",
                  color: mode === m ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                  outline: "none",
                  transition: "all 0.2s",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div style={{ fontSize: "var(--text-subtitle-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>
            ⚙️ Parameter Pensiun
          </div>

          {/* Group 1: Usia & Jangka Waktu */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Usia Sekarang</label>
                <input
                  type="number" min={10} max={80}
                  value={currentAge}
                  onChange={e => setCurrentAge(Math.min(80, Math.max(10, Number(e.target.value))))}
                  style={{ ...inputStyle, textAlign: "left" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Usia Pensiun</label>
                <input
                  type="number" min={currentAge + 1} max={99}
                  value={retirementAge}
                  onChange={e => setRetirementAge(Math.min(99, Math.max(currentAge + 1, Number(e.target.value))))}
                  style={{ ...inputStyle, textAlign: "left" }}
                />
              </div>
            </div>
            <div style={{
              padding: "10px 14px",
              background: "var(--color-semantic-success-bg)",
              border: "1.5px solid var(--color-semantic-success-border)",
              borderRadius: 10,
              textAlign: "center"
            }}>
              <span style={{ fontSize: "var(--text-body-size)", fontWeight: "var(--text-subtitle-weight)", color: "var(--color-semantic-success)" }}>
                {years} tahun masa pertumbuhan
              </span>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1.5px dashed var(--color-border-subtle)", margin: "4px 0" }} />

          {/* Group 2: Modal & Investasi Bulanan */}
          {mode === "template" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={labelStyle}>Pilih Profil Tersimpan</label>
                {(!userTemplates || userTemplates.length === 0) ? (
                  <div style={{ padding: "14px 12px", background: "var(--color-surface-input)", borderRadius: 10, color: "var(--color-text-tertiary)", fontSize: "var(--text-body-size)", textAlign: "center" }}>
                    Belum ada alokasi tersimpan. Simpan profil Anda di tab Input Aset.
                  </div>
                ) : (
                  <div style={{ position: "relative", width: "100%" }}>
                    {/* Trigger Button */}
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      style={{
                        ...inputStyle,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        paddingRight: "14px",
                        borderColor: isDropdownOpen ? "var(--color-semantic-success-border)" : "var(--color-border-subtle)",
                        background: isDropdownOpen ? "var(--color-surface-card)" : "var(--color-surface-input)",
                        userSelect: "none"
                      }}
                    >
                      <span style={{ color: selectedTemplateId ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                        {userTemplates.find(t => t.id === selectedTemplateId)?.name || "-- Pilih Profil --"}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-text-tertiary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease-in-out"
                        }}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>

                    {/* Pop-up Options List */}
                    {isDropdownOpen && (
                      <>
                        {/* Overlay to close on click outside */}
                        <div
                          onClick={() => setIsDropdownOpen(false)}
                          style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 998,
                            cursor: "default"
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            right: 0,
                            background: "var(--color-surface-card)",
                            border: "1.5px solid var(--color-border-subtle)",
                            borderRadius: 12,
                            padding: 6,
                            zIndex: 999,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            maxHeight: 200,
                            overflowY: "auto"
                          }}
                        >
                          {userTemplates.map(t => {
                            const isSelected = selectedTemplateId === t.id;
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  setSelectedTemplateId(t.id);
                                  setIsDropdownOpen(false);
                                }}
                                className="custom-option"
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: 8,
                                  cursor: "pointer",
                                  fontSize: "var(--text-body-size)",
                                  fontWeight: isSelected ? "var(--text-body-bold-weight)" : "normal",
                                  color: isSelected ? "var(--color-semantic-success)" : "var(--color-text-primary)",
                                  background: isSelected ? "var(--color-semantic-success-bg)" : "transparent",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  transition: "all 0.15s ease-in-out"
                                }}
                              >
                                <span>{t.name}</span>
                                {isSelected && (
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="var(--color-semantic-success)" style={{ width: 16, height: 16 }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {templateData && (
                <div style={{ padding: "12px 14px", background: "var(--color-surface-input)", borderRadius: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>Modal Awal</span>
                    <span style={{ fontSize: "var(--text-caption-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>{formatCompact(templateData.initialAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>Kontribusi / Bulan</span>
                    <span style={{ fontSize: "var(--text-caption-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>{formatCompact(templateData.monthlyContrib)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>Return Rata-rata</span>
                    <span style={{ fontSize: "var(--text-caption-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-semantic-success)" }}>{templateData.annualReturn}% / tahun</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={labelStyle}>Modal Awal</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", fontSize: "var(--text-body-size)" }}>Rp</span>
                  <input
                    type="text"
                    value={rawInitial !== "" ? rawInitial : initialAmount === 0 ? "" : new Intl.NumberFormat("id-ID").format(initialAmount)}
                    onChange={e => { const f = formatWhileTyping(e.target.value); setRawInitial(f); }}
                    onBlur={() => { setInitialAmount(parseFormatted(rawInitial)); setRawInitial(""); }}
                    placeholder="0"
                    style={{ ...inputStyle, paddingLeft: 42 }}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Kontribusi Bulanan</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", fontSize: "var(--text-body-size)" }}>Rp</span>
                  <input
                    type="text"
                    value={rawMonthly !== "" ? rawMonthly : monthlyContrib === 0 ? "" : new Intl.NumberFormat("id-ID").format(monthlyContrib)}
                    onChange={e => { const f = formatWhileTyping(e.target.value); setRawMonthly(f); }}
                    onBlur={() => { setMonthlyContrib(parseFormatted(rawMonthly)); setRawMonthly(""); }}
                    placeholder="0"
                    style={{ ...inputStyle, paddingLeft: 42 }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>📈 Estimasi Return / Tahun</label>
                  <span style={{ fontSize: "var(--text-caption-bold-size)", color: "var(--color-semantic-success)" }}>{annualReturn}%</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="range" min={1} max={30} step={0.5} value={annualReturn}
                    onChange={e => setAnnualReturn(parseFloat(e.target.value))}
                    style={{
                      flex: 1, accentColor: "var(--color-semantic-success)", height: 4, borderRadius: 4,
                      background: `linear-gradient(to right, var(--color-semantic-success) ${((annualReturn - 1) / 29) * 100}%, var(--color-border-subtle) 0%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <hr style={{ border: 0, borderTop: "1.5px dashed var(--color-border-subtle)", margin: "4px 0" }} />

          {/* Group 3: Inflasi */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>⚠️ Asumsi Inflasi / Tahun</label>
              <span style={{ fontSize: "var(--text-caption-bold-size)", color: "var(--color-semantic-danger)" }}>{inflationRate}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={1} max={15} step={0.5} value={inflationRate}
                onChange={e => setInflationRate(parseFloat(e.target.value))}
                style={{
                  flex: 1, accentColor: "var(--color-semantic-danger)", height: 4, borderRadius: 4,
                  background: `linear-gradient(to right, var(--color-semantic-danger) ${((inflationRate - 1) / 14) * 100}%, var(--color-border-subtle) 0%)`,
                }}
              />
            </div>
            <div style={{ fontSize: "var(--text-eyebrow-size)", color: "var(--color-text-tertiary)", marginTop: 6 }}>
              Historis Indonesia: 2–8%/tahun
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (PROJECTION AREA): HERO RESULTS (TOP) & PROJECTION GRAPH (BOTTOM) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* HERO RESULT CARD (DARK THEME) */}
          <div style={{
            background: "var(--color-text-primary)",
            borderRadius: 20,
            padding: 24,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "none"
          }}>
            {/* BG Gradients */}
            <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 220, height: 220, background: "radial-gradient(circle, var(--color-viz-rd-campuran) 0%, transparent 70%)", opacity: 0.2, filter: "blur(40px)" }} />
            <div style={{ position: "absolute", bottom: "-10%", left: "-10%", width: 180, height: 180, background: "radial-gradient(circle, var(--color-viz-sp500) 0%, transparent 70%)", opacity: 0.15, filter: "blur(40px)" }} />

            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "var(--text-eyebrow-size)", fontWeight: "var(--text-eyebrow-weight)", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "var(--text-eyebrow-letter-spacing)", marginBottom: 6 }}>
                Proyeksi Nilai Masa Depan (Usia {retirementAge})
              </div>
              <div style={{ fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 900, color: "#fff", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 2 }}>
                {formatCompact(finalValue)}
              </div>
              <div style={{ fontSize: "var(--text-caption-size)", color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                Daya beli riil setelah disesuaikan inflasi: <strong style={{ color: "var(--color-semantic-success)" }}>{formatCompact(finalReal)}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, marginBottom: 2 }}>Total Disetor</div>
                  <div style={{ fontSize: "var(--text-body-bold-size)", fontWeight: "var(--text-h1-weight)", color: "rgba(255,255,255,0.9)" }}>{formatCompact(finalContributed)}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, marginBottom: 2 }}>Pertumbuhan</div>
                  <div style={{ fontSize: "var(--text-body-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-viz-cash)" }}>{formatCompact(Math.max(0, totalGrowth))}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, marginBottom: 2 }}>Multiplier</div>
                  <div style={{ fontSize: "var(--text-body-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-viz-rd-campuran)" }}>{growthMultiple}×</div>
                </div>
              </div>
            </div>

            <div style={{ position: "relative", zIndex: 1, marginTop: 20, fontSize: "9px", color: "rgba(255,255,255,0.3)", lineHeight: 1.4, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10 }}>
              Disclosure: Simulasi menggunakan perhitungan compound interest majemuk tahunan. Past returns are not a guarantee of future returns.
            </div>
          </div>

          {/* PROJECTION GRAPH CARD (WHITE BACKGROUND) */}
          <div style={{
            background: "var(--color-surface-card)",
            border: "1.5px solid var(--color-border-subtle)",
            borderRadius: 20,
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            boxShadow: "none"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingRight: 4, flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontSize: "var(--text-body-bold-size)", fontWeight: "var(--text-h1-weight)", color: "var(--color-text-primary)" }}>Grafik Proyeksi Akumulasi</div>
                <div style={{ fontSize: "var(--text-caption-size)", color: "var(--color-text-tertiary)" }}>Akumulasi Nominal vs Nilai Riil vs Uang Disetor</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Nominal", color: "var(--color-viz-rd-campuran)" },
                  { label: "Daya Beli", color: "var(--color-semantic-success)" },
                  { label: "Disetor", color: "var(--color-border-input)" },
                ].map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 12, height: 3, borderRadius: 2, background: l.color }} />
                    <span style={{ fontSize: "9px", color: "var(--color-text-tertiary)", fontWeight: 700, textTransform: "uppercase" }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gPortfolio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-viz-rd-campuran)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-viz-rd-campuran)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-semantic-success)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-semantic-success)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gContrib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-border-input)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-border-input)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-input)" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-border-input)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(1, Math.floor(years / 5))}
                />
                <YAxis
                  tickFormatter={formatCompact}
                  stroke="var(--color-border-input)"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  dx={-4}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="totalContributed" name="Total Disetor" stroke="var(--color-border-input)" strokeWidth={2} fill="url(#gContrib)" />
                <Area type="monotone" dataKey="real" name="Nilai Riil (Daya Beli)" stroke="var(--color-semantic-success)" strokeWidth={2} fill="url(#gReal)" />
                <Area type="monotone" dataKey="portfolio" name="Portofolio Nominal" stroke="var(--color-viz-rd-campuran)" strokeWidth={2.5} fill="url(#gPortfolio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RESPONSIVE LAYOUT & SPINNER HIDER STYLES */}
      <style>{`
        @media (max-width: 868px) {
          .pensiun-grid {
            grid-template-columns: 1fr !important;
          }
        }
        /* Hide HTML5 number inputs spinner buttons (counter arrows) */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        /* Premium Input & Select Focus Glow */
        input:focus, select:focus {
          border-color: var(--color-semantic-success-border) !important;
          background-color: var(--color-surface-card) !important;
          outline: none;
        }
        input:hover, select:hover {
          border-color: var(--color-text-secondary) !important;
        }
        select {
          cursor: pointer;
        }
        .custom-option:hover {
          background-color: var(--color-surface-input) !important;
          color: var(--color-text-primary) !important;
        }
        .custom-option:active {
          background-color: var(--color-semantic-success-bg) !important;
        }
      `}</style>
    </div>
  );
}
