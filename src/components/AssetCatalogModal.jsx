import React from 'react';
import { motion } from 'framer-motion';
import "../styles/tokens.css";

export default function AssetCatalogModal({
  isModalOpen,
  setIsModalOpen,
  ASSET_CLASSES,
  activeAssetIds,
  addAsset,
  catalogFilter,
  setCatalogFilter
}) {
  return (
    <motion.div
      onClick={() => setIsModalOpen(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
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
      }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        style={{
          background: "var(--color-surface-card)",
          borderRadius: 20,
          boxShadow: "var(--shadow-xl)",
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
            borderBottom: `1.5px solid var(--color-surface-input)`,
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
                Katalog Instrumen Investasi
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
                border: `1.5px solid var(--color-border-subtle)`,
                background: "var(--color-surface-app)",
                color: "var(--color-text-secondary)",
                fontSize: "var(--text-subtitle-size)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all .15s",
              }}
            >
              ✕
            </button>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "4px 0",
              scrollbarWidth: "none",
            }}
          >
            {[
              { id: 'all', label: 'Semua' },
              { id: 'safe', label: 'Risiko Rendah' },
              { id: 'stable', label: 'Menengah' },
              { id: 'aggressive', label: 'Agresif' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCatalogFilter(f.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1.5px solid",
                  borderColor: catalogFilter === f.id ? "var(--color-semantic-brand)" : "var(--color-border-subtle)",
                  background: catalogFilter === f.id ? "var(--color-semantic-brand)" : "var(--color-surface-card)",
                  color: catalogFilter === f.id ? "var(--color-white)" : "var(--color-text-secondary)",
                  fontSize: "var(--text-caption-size)",
                  fontWeight: "var(--text-subtitle-weight)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                <span>{f.icon}</span>
                {f.label}
              </button>
            ))}
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
                <motion.div
                  key={cls.id}
                  onClick={() => addAsset(cls.id)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    background: "var(--color-surface-card)",
                    border: `1.5px solid var(--color-border-subtle)`,
                    borderTop: `4px solid ${cls.color}`,
                    borderRadius: 14,
                    padding: "14px 16px",
                    cursor: "pointer",
                    transition: "all .18s",
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
                              border: `1px solid var(--color-border-subtle)`
                            }}
                          >
                            {cls.return}% gross
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              ));
            })()}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
