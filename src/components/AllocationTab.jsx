import React, { useMemo } from 'react';

export default function AllocationTab({
  allocData,
  monthlyContribs,
  tokens,
  formatCompact,
  afterTaxReturn
}) {
  const riskProfile = useMemo(() => {
    if (allocData.length === 0) return null;

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
    let color = tokens.colors.dataViz.obligasiFr;
    let description = "Porfotolio saat ini seimbang. Kamu memiliki diversifikasi yang merata untuk menjaga stabilitas sembari tetap mengejar pertumbuhan.";

    if (high > Math.max(low, medium)) {
      profile = "Agresif";
      color = tokens.colors.semantic.danger;
      description = "Portofolio saat ini didominasi oleh instrumen risiko tinggi. Fokus pada pertumbuhan modal maksimal dengan menoleransi tingkat fluktuasi yang signifikan.";
    } else if (low > Math.max(medium, high)) {
      profile = "Konservatif";
      color = tokens.colors.dataViz.cash;
      description = "Portofolio saat ini lebih dominan ke instrumen risiko rendah. Mengutamakan stabilitas dan keamanan modal dibandingkan pertumbuhan yang agresif.";
    }

    return { low, medium, high, profile, color, description };
  }, [allocData, tokens]);

  return (
    <div>
      {riskProfile && (
        <div
          style={{
            padding: "24px",
            borderRadius: "20px",
            background: tokens.colors.surface.card,
            border: `1.5px solid ${tokens.colors.border.subtle}`,
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
                <span style={{ fontSize: 11, fontWeight: 800, color: tokens.colors.text.tertiary, textTransform: "uppercase", letterSpacing: "1.2px" }}>
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
                color: tokens.colors.text.secondary,
                lineHeight: "1.6",
                margin: 0,
                maxWidth: "520px"
              }}>
                {riskProfile.description}
              </p>
            </div>

            {/* Stats & Bar Integrated */}
            <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", height: 12, borderRadius: 12, overflow: "hidden", background: tokens.colors.surface.active, border: `1px solid ${tokens.colors.border.subtle}` }}>
                {riskProfile.low > 0 && <div style={{ width: `${riskProfile.low}%`, background: tokens.colors.dataViz.cash, transition: "width .6s ease" }} />}
                {riskProfile.medium > 0 && <div style={{ width: `${riskProfile.medium}%`, background: tokens.colors.dataViz.obligasiFr, transition: "width .6s ease" }} />}
                {riskProfile.high > 0 && <div style={{ width: `${riskProfile.high}%`, background: tokens.colors.semantic.danger, transition: "width .6s ease" }} />}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                {[
                  { label: "Low", value: riskProfile.low, color: tokens.colors.dataViz.cash },
                  { label: "Medium", value: riskProfile.medium, color: tokens.colors.dataViz.obligasiFr },
                  { label: "High", value: riskProfile.high, color: tokens.colors.semantic.danger },
                ].map((stat, idx) => (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <span style={{ fontSize: 10, color: tokens.colors.text.tertiary, fontWeight: 800, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.5px" }}>
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
