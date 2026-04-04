import React from 'react';

export default function AllocationTab({
  allocData,
  monthlyContribs,
  tokens,
  formatCompact,
  afterTaxReturn
}) {
  return (
    <div>
      <div className="card" style={{ padding: 20 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            margin: "0 0 16px",
            color: tokens.colors.text.primary,
          }}
        >
          Distribusi Aset
        </h2>

        {allocData.length === 0 ? (
          <div
            style={{ color: tokens.colors.text.tertiary, fontSize: 14, padding: "20px 0" }}
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
                        color: tokens.colors.text.primary,
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
                        color: tokens.colors.text.tertiary,
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
                  <span style={{ fontSize: 10, color: tokens.colors.text.tertiary }}>
                    Gross: {d.return}% → Net:{" "}
                    {afterTaxReturn(d).toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 10, color: tokens.colors.text.tertiary }}>
                    Likuid: {d.liquidity} · {d.risk}
                  </span>
                  {(monthlyContribs[d.id] || 0) > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        color: tokens.colors.dataViz.rdpu,
                        fontWeight: 700,
                        background: tokens.colors.surface.active,
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
            borderTop: `1px solid ${tokens.colors.border.subtle}`,
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
              color: tokens.colors.semantic.brand,
            },
            {
              label: "Aset Ekuitas",
              value: allocData
                .filter((d) => d.isEquity)
                .reduce((s, d) => s + d.pct, 0),
              color: tokens.colors.semantic.warning,
            },
            {
              label: "Aset IDR",
              value: allocData
                .filter((d) => !d.isUSD)
                .reduce((s, d) => s + d.pct, 0),
              color: tokens.colors.semantic.success,
            },
            {
              label: "Aset USD",
              value: allocData
                .filter((d) => d.isUSD)
                .reduce((s, d) => s + d.pct, 0),
              color: tokens.colors.dataViz.usd,
            },
          ].map((s, i) => (
            <div key={i} className="stat">
              <div
                style={{
                  fontSize: 10,
                  color: tokens.colors.text.tertiary,
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
    </div>
  );
}
