import React from 'react';
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
  formatCompact
}) {
  return (
    <div>
      {/* Settings */}
      <div className="card" style={{ padding: 16, marginBottom: 14 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: tokens.colors.text.tertiary,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: 12,
          }}
        >
          Asumsi Proyeksi
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 16,
          }}
        >
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tokens.colors.text.secondary,
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
                  accentColor: tokens.colors.semantic.danger,
                  background: `linear-gradient(to right,${tokens.colors.semantic.danger} ${((inflationRate - 1) / 14) * 100
                    }%,${tokens.colors.border.subtle} 0%)`,
                }}
              />
              <span
                style={{
                  fontFamily: tokens.typography.fontFamily,
                  fontWeight: 800,
                  fontSize: 16,
                  color: tokens.colors.semantic.danger,
                  minWidth: 42,
                }}
              >
                {inflationRate}%
              </span>
            </div>
            <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 4 }}>
              Historis Indonesia: 2–8%/tahun
            </div>
          </div>
          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tokens.colors.text.secondary,
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
                color: tokens.colors.dataViz.rdpu,
              }}
            >
              {formatCompact(totalMonthlyContrib)}
            </div>
            <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 4 }}>
              Isi di tab "Input Aset" → tiap kartu aset. Proyeksi dihitung
              per aset.
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tokens.colors.text.secondary,
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
            <div style={{ fontSize: 10, color: tokens.colors.text.tertiary, marginTop: 4 }}>
              Garis acuan saat proyeksi menyentuh target.
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card" style={{ padding: 20 }}>
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
                color: tokens.colors.text.primary,
              }}
            >
              Proyeksi 10 Tahun
            </h2>
            <p
              style={{
                fontSize: 12,
                color: tokens.colors.text.tertiary,
                margin: "4px 0 0",
              }}
            >
              Nominal · Nilai Riil · Garis Inflasi
            </p>
          </div>

          {/* Legend Row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Portofolio Nominal", color: tokens.colors.semantic.success, dashed: false },
              { label: "Nilai Riil", color: tokens.colors.semantic.brand, dashed: false },
              { label: "Garis Inflasi", color: tokens.colors.semantic.danger, dashed: true },
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
                <span style={{ fontSize: 11, fontWeight: 700, color: tokens.colors.text.secondary }}>
                  {leg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="lg_portfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={tokens.colors.semantic.success} stopOpacity={0.15} />
                <stop offset="95%" stopColor={tokens.colors.semantic.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.surface.input} vertical={false} />
            <XAxis dataKey="year" stroke={tokens.colors.border.input} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatCompact} stroke={tokens.colors.border.input} fontSize={11} tickLine={false} axisLine={false} dx={-5} />
            <Tooltip
              itemSorter={(item) => -item.value}
              formatter={(v, name) => [formatIDR(v), name]}
              contentStyle={{
                background: tokens.colors.surface.card,
                border: `1.5px solid ${tokens.colors.border.subtle}`,
                borderRadius: 10,
                color: tokens.colors.text.primary,
                fontSize: 13,
              }}
              labelStyle={{ color: tokens.colors.text.tertiary, fontSize: 11 }}
            />
            <Area type="monotone" dataKey="portfolio" name="Portofolio Nominal" stroke={tokens.colors.semantic.success} strokeWidth={2.5} fill="url(#lg_portfolio)" />
            <Line type="monotone" dataKey="real" name="Nilai Riil (Daya Beli)" stroke={tokens.colors.semantic.brand} strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="inflation" name="Garis Inflasi" stroke={tokens.colors.semantic.danger} strokeWidth={2} strokeDasharray="4 4" dot={false} />
            <ReferenceLine
              y={fireTarget}
              label={{ position: "top", value: "Target", fill: tokens.colors.dataViz.rdpu, fontSize: 11, fontWeight: "bold" }}
              stroke={tokens.colors.dataViz.rdpu}
              strokeDasharray="3 3"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Year 10 Scorecards */}
        {chartData.length > 0 && (() => {
          const last = chartData[chartData.length - 1];
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 12,
                marginTop: 20,
              }}
            >
              {[
                { label: "Nominal", value: formatCompact(last.portfolio), color: tokens.colors.semantic.success },
                { label: "Nilai Riil", value: formatCompact(last.real), color: tokens.colors.semantic.brand },
                { label: "Inflasi", value: formatCompact(last.inflation), color: tokens.colors.semantic.danger },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: tokens.colors.surface.card,
                    borderRadius: 12,
                    padding: "16px 20px",
                    border: `1.5px solid ${tokens.colors.border.subtle}`,
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: s.color, textTransform: "uppercase", letterSpacing: ".05em" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: tokens.colors.text.tertiary, marginTop: 2 }}>
                      Tahun ke-10
                    </div>
                  </div>
                  <div style={{ fontFamily: tokens.typography.fontFamily, fontSize: 24, fontWeight: 800, color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Explanation Boxes */}
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
            <div className="card" style={{ padding: 18, background: tokens.colors.surface.card }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: tokens.colors.text.primary, marginBottom: 8 }}>
                Mengapa riil selalu lebih rendah?
              </div>
              <div style={{ fontSize: 12, color: tokens.colors.text.secondary, lineHeight: 1.6 }}>
                Inflasi menggerus daya beli — {formatCompact(300000000)} di thn ke-10 setara hanya ~{formatCompact(184000000)} uang hari ini. "Nilai Riil" adalah angka jujur yang sudah dikoreksi inflasi.
              </div>
            </div>

            <div
              className="card"
              style={{
                padding: 18,
                background: isWinning ? tokens.colors.semantic.successBg : tokens.colors.semantic.dangerBg,
                borderColor: isWinning ? tokens.colors.semantic.successBorder : tokens.colors.semantic.dangerBorder,
              }}
            >
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: isWinning ? tokens.colors.semantic.success : tokens.colors.semantic.danger,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                {isWinning ? "Kamu menang vs inflasi" : "Kekayaan tergerus inflasi"} {isWinning ? "✅" : "❌"}
              </div>
              <div style={{ fontSize: 12, color: isWinning ? tokens.colors.semantic.success : tokens.colors.semantic.danger, lineHeight: 1.6, opacity: 0.8 }}>
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
