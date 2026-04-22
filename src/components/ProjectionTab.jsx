import React, { useState, useMemo } from 'react';
import "./designtoken.css";
import {
  ComposedChart,
  Area,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function ProjectionTab({
  chartData,
  inflationRate,
  setInflationRate,
  totalMonthlyContrib,
  fireTarget,
  setFireTarget,
  tokens,
  formatIDR,
  formatCompact,
  totalAssets,
  worstCase,
  allocData,
  monthlyContribs,
  afterTaxReturn
}) {
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // Calculate crash ratio based on current portfolio's risk profile
  const crashRatio = totalAssets > 0 ? (totalAssets - worstCase) / totalAssets : 0;

  const riskProfile = useMemo(() => {
    if (!allocData || allocData.length === 0) return null;

    let low = 0;
    let medium = 0;
    let high = 0;

    allocData.forEach(d => {
      const r = d.risk.toLowerCase();
      if (r.includes("rendah") && !r.includes("sedang") && !r.includes("menengah")) {
        low += d.pct;
      } else if (r.includes("sedang") || r.includes("menengah") || r.includes("menengah-tinggi")) {
        medium += d.pct;
      } else if (r.includes("tinggi") || r.includes("sangat tinggi")) {
        high += d.pct;
      } else {
        medium += d.pct;
      }
    });

    // Normalize so sum is exactly 100 (in case of minor floating point issues)
    const total = low + medium + high;
    if (total > 0) {
      low = (low / total) * 100;
      medium = (medium / total) * 100;
      high = (high / total) * 100;
    }

    let profile = "Moderat";
    let color = "var(--color-viz-obligasi-fr)";
    let description = "Porfotolio saat ini seimbang. Kamu memiliki diversifikasi yang merata untuk menjaga stabilitas sembari tetap mengejar pertumbuhan.";

    if (high > Math.max(low, medium)) {
      profile = "Agresif";
      color = "var(--color-semantic-danger)";
      description = "Portofolio saat ini didominasi oleh instrumen risiko tinggi. Fokus pada pertumbuhan modal maksimal dengan menoleransi tingkat fluktuasi yang signifikan.";
    } else if (low > Math.max(medium, high)) {
      profile = "Konservatif";
      color = "var(--color-viz-cash)";
      description = "Portofolio saat ini lebih dominan ke instrumen risiko rendah. Mengutamakan stabilitas dan keamanan modal dibandingkan pertumbuhan yang agresif.";
    }

    return { low, medium, high, profile, color, description };
  }, [allocData, tokens]);

  return (
    <div>
      {/* 1. Profil Risiko */}
      {riskProfile && (
        <div
          style={{
            padding: "24px",
            borderRadius: "20px",
            background: "var(--color-surface-card)",
            border: `1.5px solid ${"var(--color-border-subtle)"}`,
            marginBottom: "16px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Accent */}
          <div style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "240px",
            height: "240px",
            background: `${riskProfile.color}12`,
            borderRadius: "50%",
            transform: "translate(30%, -30%)",
            filter: "blur(50px)"
          }} />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "center", position: "relative" }}>
            {/* Profile Info */}
            <div style={{ flex: "1 1 340px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-tertiary)", }}>
                  Profil Risiko
                </span>
              </div>

              <h3 style={{
                fontSize: 32,
                fontWeight: 900,
                color: riskProfile.color,
                margin: "0 0 12px",
                letterSpacing: "-1px",
                lineHeight: 1
              }}>
                {riskProfile.profile}
              </h3>

              <p style={{
                fontSize: 14,
                color: "var(--color-text-secondary)",
                lineHeight: "1.6",
                margin: 0,
                maxWidth: "520px"
              }}>
                {riskProfile.description}
              </p>
            </div>

            {/* Stats & Bar Integrated */}
            <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", height: 12, borderRadius: 12, overflow: "hidden", background: "var(--color-surface-active)", border: `1px solid ${"var(--color-border-subtle)"}` }}>
                {riskProfile.low > 0 && <div style={{ width: `${riskProfile.low}%`, background: "var(--color-viz-cash)", transition: "width .6s ease" }} />}
                {riskProfile.medium > 0 && <div style={{ width: `${riskProfile.medium}%`, background: "var(--color-viz-obligasi-fr)", transition: "width .6s ease" }} />}
                {riskProfile.high > 0 && <div style={{ width: `${riskProfile.high}%`, background: "var(--color-semantic-danger)", transition: "width .6s ease" }} />}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                {[
                  { label: "Low", value: riskProfile.low, color: "var(--color-viz-cash)" },
                  { label: "Medium", value: riskProfile.medium, color: "var(--color-viz-obligasi-fr)" },
                  { label: "High", value: riskProfile.high, color: "var(--color-semantic-danger)" },
                ].map((stat, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 800, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.5px" }}>
                      {stat.label}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: stat.color, fontFamily: tokens.typography.fontFamily }}>
                      {stat.value.toFixed(1)}<span style={{ fontSize: 12, fontWeight: 700, marginLeft: 1 }}>%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Settings (Expandable) - Asumsi Proyeksi & Target */}
      <div
        className="card"
        style={{
          padding: 0,
          marginBottom: 14,
          overflow: "hidden",
          border: `1px solid ${"var(--color-border-subtle)"}`
        }}
      >
        <div
          onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
          style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            background: isSettingsExpanded ? "var(--color-surface-input)" : "var(--color-surface-card)",
            transition: "background 0.2s",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: ".1em",
            }}
          >
            Asumsi Proyeksi & Target
          </div>
          <div style={{
            transform: isSettingsExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.3s ease",
            display: "flex",
            alignItems: "center",
            color: "var(--color-text-tertiary)"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateRows: isSettingsExpanded ? "1fr" : "0fr",
          transition: "grid-template-rows 0.3s ease-out, opacity 0.3s ease-out",
          opacity: isSettingsExpanded ? 1 : 0,
        }}>
          <div style={{ minHeight: 0, overflow: "hidden" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
                gap: 16,
                padding: 16,
                borderTop: `1px solid ${"var(--color-border-subtle)"}`,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Inflasi (% / tahun)
                </label>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={0.5}
                    value={inflationRate}
                    onChange={(e) =>
                      setInflationRate(parseFloat(e.target.value))
                    }
                    style={{
                      flex: 1,
                      accentColor: "var(--color-semantic-danger)",
                      background: `linear-gradient(to right,${"var(--color-semantic-danger)"} ${((inflationRate - 1) / 14) * 100
                        }%,${"var(--color-border-subtle)"} 0%)`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: tokens.typography.fontFamily,
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--color-semantic-danger)",
                      minWidth: 42,
                    }}
                  >
                    {inflationRate}%
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  Historis Indonesia: 2–8%/tahun
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Kontribusi Bulanan Total
                </label>
                <div
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: 20,
                    fontWeight: 800,
                    color: "var(--color-viz-rdpu)",
                  }}
                >
                  {formatCompact(totalMonthlyContrib)}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  Isi di tab "Input Aset" → tiap kartu aset. Proyeksi dihitung
                  per aset.
                </div>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-text-secondary)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Target Kekayaan
                </label>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <input
                    type="text"
                    className="ifield-sm"
                    style={{ paddingLeft: 10, paddingRight: 10 }}
                    value={new Intl.NumberFormat("id-ID").format(fireTarget)}
                    onChange={(e) =>
                      setFireTarget(Number(e.target.value.replace(/\D/g, "")))
                    }
                  />
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4 }}>
                  Garis acuan saat proyeksi menyentuh target.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Chart Section */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Proyeksi 10 Tahun
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--color-text-tertiary)",
                margin: "4px 0 0",
              }}
            >
              Nominal · Nilai Riil · Garis Inflasi
            </p>
          </div>

          {/* Legend Row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Portofolio Nominal", color: "var(--color-semantic-success)", dashed: false },
              { label: "Nilai Riil", color: "var(--color-semantic-brand)", dashed: false },
              { label: "Garis Inflasi", color: "var(--color-semantic-danger)", dashed: true },
            ].map((leg, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 24,
                    height: leg.dashed ? 0 : 3,
                    borderRadius: 3,
                    background: leg.dashed ? "transparent" : leg.color,
                    borderTop: leg.dashed ? `2.5px dashed ${leg.color}` : "none",
                  }}
                />
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>
                  {leg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 0, left: 5, bottom: 0 }}
            style={{ outline: "none", WebkitTapHighlightColor: "transparent", userSelect: "none", touchAction: "manipulation" }}
            tabIndex={-1}
          >
            <defs>
              <linearGradient id="lg_portfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={"var(--color-semantic-success)"} stopOpacity={0.15} />
                <stop offset="95%" stopColor={"var(--color-semantic-success)"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={"var(--color-surface-input)"} vertical={false} />
            <XAxis dataKey="year" stroke={"var(--color-border-input)"} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompact} stroke={"var(--color-border-input)"} fontSize={11} tickLine={false} axisLine={false} dx={-5} />
            <Tooltip
              itemSorter={(item) => -item.value}
              formatter={(v, name) => [formatIDR(v), name]}
              contentStyle={{
                background: "var(--color-surface-card)",
                border: `1.5px solid ${"var(--color-border-subtle)"}`,
                borderRadius: 10,
                color: "var(--color-text-primary)",
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--color-text-tertiary)", fontSize: 11 }}
            />
            <Area type="monotone" dataKey="portfolio" name="Portofolio Nominal" stroke={"var(--color-semantic-success)"} strokeWidth={2.5} fill="url(#lg_portfolio)" />
            <Line type="monotone" dataKey="real" name="Nilai Riil (Daya Beli)" stroke={"var(--color-semantic-brand)"} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="inflation" name="Garis Inflasi" stroke={"var(--color-semantic-danger)"} strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <ReferenceLine
              y={fireTarget}
              label={{ position: "top", value: "Target", fill: "var(--color-viz-rdpu)", fontSize: 11, fontWeight: "bold" }}
              stroke={"var(--color-viz-rdpu)"}
              strokeDasharray="3 3"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Yearly Breakdown Accordion & Table */}
        {chartData.length > 1 && (() => {
          const projectionData = chartData.slice(1); // Skip Thn 0
          return (
            <>
              <style>{`
                @media (min-width: 769px) {
                  .proj-accordion { display: none !important; }
                }
                @media (max-width: 768px) {
                  .proj-table-container { display: none !important; }
                }
                .proj-table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 13px;
                }
                .proj-table th {
                  text-align: left;
                  padding: 12px 16px;
                  font-size: 11px;
                  font-weight: 700;
                  color: ${"var(--color-text-tertiary)"};
                  text-transform: uppercase;
                  letter-spacing: .08em;
                  border-bottom: 1px solid ${"var(--color-border-subtle)"};
                  background: ${"var(--color-surface-app)"};
                }
                .proj-table td {
                  padding: 14px 16px;
                  border-bottom: 1px solid ${"var(--color-border-subtle)"};
                  vertical-align: middle;
                }
                .proj-table tr:last-child td {
                  border-bottom: none;
                }
                .proj-table tbody tr {
                  transition: background 0.2s;
                }
                .proj-table tbody tr:hover {
                  background: ${"var(--color-surface-input)"};
                }
              `}</style>

              {/* DESKTOP TABLE */}
              <div
                className="proj-table-container"
                style={{
                  marginTop: 24,
                  border: `1px solid ${"var(--color-border-subtle)"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--color-surface-card)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    borderBottom: `1px solid ${"var(--color-border-subtle)"}`,
                    background: "var(--color-surface-app)",
                  }}
                >
                  Rincian Proyeksi Tahunan
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table className="proj-table">
                    <thead>
                      <tr>
                        <th>Tahun</th>
                        <th>Total Aset</th>
                        <th>Keuntungan</th>
                        <th>Nilai Riil</th>
                        <th>Acuan Inflasi</th>
                        <th>Simulasi Crash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectionData.map((yearData, idx) => {
                        const realIdx = idx + 1;
                        const prevData = chartData[realIdx - 1];
                        const profitNominal = yearData.portfolio - prevData.portfolio;
                        const profitPct = ((profitNominal / prevData.portfolio) * 100).toFixed(1);
                        const isProfit = profitNominal >= 0;

                        return (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700, color: "var(--color-semantic-brand)", whiteSpace: "nowrap" }}>
                              Tahun ke-{realIdx}
                            </td>
                            <td style={{ fontWeight: 800, color: "var(--color-semantic-success)", whiteSpace: "nowrap" }}>
                              {formatCompact(yearData.portfolio)}
                            </td>
                            <td style={{ fontWeight: 700, color: isProfit ? "var(--color-semantic-success)" : "var(--color-semantic-danger)", whiteSpace: "nowrap" }}>
                              {isProfit ? "+" : ""}{formatCompact(profitNominal)} <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>({isProfit ? "+" : ""}{profitPct}%)</span>
                            </td>
                            <td style={{ fontWeight: 600, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                              {formatIDR(yearData.real)}
                            </td>
                            <td style={{ fontWeight: 600, color: "var(--color-semantic-danger)", whiteSpace: "nowrap" }}>
                              {formatIDR(yearData.inflation)}
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 700, color: "var(--color-semantic-danger)" }}>
                                {formatCompact(yearData.portfolio * (1 - crashRatio))}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", marginLeft: 6 }}>
                                (-{(crashRatio * 100).toFixed(0)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MOBILE ACCORDION */}
              <div
                className="proj-accordion"
                style={{
                  marginTop: 24,
                  border: `1px solid ${"var(--color-border-subtle)"}`,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--color-surface-card)",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    borderBottom: `1px solid ${"var(--color-border-subtle)"}`,
                    background: "var(--color-surface-app)",
                  }}
                >
                  Rincian Proyeksi Tahunan
                </div>
                {projectionData.map((yearData, idx) => {
                  const realIdx = idx + 1; // Year index in full chartData
                  const prevData = chartData[realIdx - 1];
                  const isExpanded = expandedIndex === idx;

                  // Profit logic
                  const profitNominal = yearData.portfolio - prevData.portfolio;
                  const profitPct = ((profitNominal / prevData.portfolio) * 100).toFixed(1);
                  const isProfit = profitNominal >= 0;

                  return (
                    <div
                      key={idx}
                      style={{
                        borderBottom: realIdx === chartData.length - 1 ? "none" : `1px solid ${"var(--color-border-subtle)"}`,
                      }}
                    >
                      {/* Header / Collapsed State */}
                      <div
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        style={{
                          padding: "14px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          background: isExpanded ? "var(--color-surface-card)" : "transparent",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-semantic-brand)" }}>
                            Tahun ke-{realIdx}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 2 }}>
                              Total Aset
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-semantic-success)" }}>
                              {formatCompact(yearData.portfolio)}
                            </div>
                          </div>
                          <div style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                            color: "var(--color-text-tertiary)"
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Detail State (Animated) */}
                      <div style={{
                        display: "grid",
                        gridTemplateRows: isExpanded ? "1fr" : "0fr",
                        transition: "grid-template-rows 0.3s ease-out, opacity 0.3s ease-out",
                        opacity: isExpanded ? 1 : 0,
                      }}>
                        <div style={{ minHeight: 0, overflow: "hidden" }}>
                          <div style={{
                            padding: "16px",
                            background: "var(--color-surface-input)",
                            borderTop: `1px solid ${"var(--color-border-subtle)"}`,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16
                          }}>
                            {/* Column 1: Asset Health */}
                            <div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                                    Nilai Riil (Daya Beli)
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-semantic-brand)" }}>
                                    {formatIDR(yearData.real)}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                                    Acuan Inflasi
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-semantic-danger)" }}>
                                    {formatIDR(yearData.inflation)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Performance & Simulation */}
                            <div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                                    Keuntungan Tahun Ini
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: isProfit ? "var(--color-semantic-success)" : "var(--color-semantic-danger)" }}>
                                    {isProfit ? "+" : ""}{formatCompact(profitNominal)} ({isProfit ? "+" : ""}{profitPct}%)
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-tertiary)", textTransform: "uppercase", marginBottom: 4 }}>
                                    Simulasi Market Crash
                                  </div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-semantic-danger)" }}>
                                    {formatCompact(yearData.portfolio * (1 - crashRatio))}
                                    <span style={{ fontSize: 10, fontWeight: 500, marginLeft: 6, opacity: 0.8 }}>
                                      (-{(crashRatio * 100).toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 }}>
                                    Jika terjadi koreksi tajam sesuai profil risiko Anda.
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      {/* 4. Distribusi Aset */}
      {allocData && (
        <div className="card" style={{ padding: 20, marginTop: 14 }}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              margin: "0 0 16px",
              color: "var(--color-text-primary)",
            }}
          >
            Distribusi Aset
          </h2>

          {allocData.length === 0 ? (
            <div
              style={{ color: "var(--color-text-tertiary)", fontSize: 14, padding: "20px 0" }}
            >
              Belum ada aset yang diinput.
            </div>
          ) : (
            [...allocData]
              .sort((a, b) => b.pct - a.pct)
              .map((d) => (
                <div key={d.id} style={{ marginBottom: 14 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: d.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        {d.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: tokens.typography.fontFamily,
                          fontSize: 12,
                          color: "var(--color-text-tertiary)",
                        }}
                      >
                        {formatCompact(d.idr)}
                      </span>
                      <span
                        style={{
                          fontFamily: tokens.typography.fontFamily,
                          fontSize: 14,
                          fontWeight: 800,
                          color: d.color,
                          minWidth: 44,
                          textAlign: "right",
                        }}
                      >
                        {d.pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="pgbar">
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 4,
                        background: d.color,
                        width: `${d.pct}%`,
                        transition: "width .4s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 4,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                      Gross: {d.return}% → Net:{" "}
                      {afterTaxReturn(d).toFixed(1)}%
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>
                      Likuid: {d.liquidity} · {d.risk}
                    </span>
                    {(monthlyContribs[d.id] || 0) > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--color-viz-rdpu)",
                          fontWeight: 700,
                          background: "var(--color-surface-active)",
                          padding: "1px 7px",
                          borderRadius: 20,
                        }}
                      >
                        +
                        {d.isUSD
                          ? `$${new Intl.NumberFormat("en-US").format(
                            monthlyContribs[d.id]
                          )}`
                          : formatCompact(monthlyContribs[d.id] || 0)}
                        /bln
                      </span>
                    )}
                  </div>
                </div>
              ))
          )}

          {/* Breakdown */}
          <div
            style={{
              borderTop: `1px solid ${"var(--color-border-subtle)"}`,
              paddingTop: 16,
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 10,
            }}
          >
            {[
              {
                label: "Aset Defensif",
                value: allocData
                  .filter((d) => !d.isEquity)
                  .reduce((s, d) => s + d.pct, 0),
                color: "var(--color-semantic-brand)",
              },
              {
                label: "Aset Ekuitas",
                value: allocData
                  .filter((d) => d.isEquity)
                  .reduce((s, d) => s + d.pct, 0),
                color: "var(--color-semantic-warning)",
              },
              {
                label: "Aset IDR",
                value: allocData
                  .filter((d) => !d.isUSD)
                  .reduce((s, d) => s + d.pct, 0),
                color: "var(--color-semantic-success)",
              },
              {
                label: "Aset USD",
                value: allocData
                  .filter((d) => d.isUSD)
                  .reduce((s, d) => s + d.pct, 0),
                color: "var(--color-viz-usd)",
              },
            ].map((s, i) => (
              <div key={i} className="stat">
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--color-text-tertiary)",
                    marginBottom: 4,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontFamily: tokens.typography.fontFamily,
                    fontSize: 18,
                    fontWeight: 800,
                    color: s.color,
                  }}
                >
                  {s.value.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Explanation Boxes (Mengapa riil selalu lebih rendah?) */}
      {chartData.length > 0 && (() => {
        const last = chartData[chartData.length - 1];
        const isWinning = last.real >= last.inflation;
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 16,
              marginTop: 16,
            }}
          >
            <div className="card" style={{ padding: 18, background: "var(--color-surface-card)" }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>
                Mengapa riil selalu lebih rendah?
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                Inflasi menggerus daya beli — {formatCompact(300000000)} di thn ke-10 setara hanya ~{formatCompact(184000000)} uang hari ini. "Nilai Riil" adalah angka jujur yang sudah dikoreksi inflasi.
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: 18,
                background: isWinning ? "var(--color-semantic-success-bg)" : "var(--color-semantic-danger-bg)",
                borderColor: isWinning ? "var(--color-semantic-success-border)" : "var(--color-semantic-danger-border)",
              }}
            >
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: isWinning ? "var(--color-semantic-success)" : "var(--color-semantic-danger)",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                {isWinning ? "Kamu menang vs inflasi" : "Nilai Riil Kekayaanmu tergerus inflasi"} {isWinning ? "✅" : "❌"}
              </div>
              <div style={{ fontSize: 12, color: isWinning ? "var(--color-semantic-success)" : "var(--color-semantic-danger)", lineHeight: 1.6, opacity: 0.8 }}>
                {isWinning
                  ? "Nilai Riil di atas Garis Inflasi = kekayaan nyata bertambah secara riil."
                  : "Nilai Riil di bawah Garis Inflasi = pertumbuhan asetmu tidak cukup menutupi kenaikan harga barang."}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
