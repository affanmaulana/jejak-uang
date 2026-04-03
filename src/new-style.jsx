import React from 'react';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, PieChart } from 'lucide-react';

// 1. STYLE TOKENS: Single Source of Truth
const tokens = {
  colors: {
    surface: {
      app: '#F8FAFC',        // Slate 50
      card: '#FFFFFF',       // Pure white
      input: '#F1F5F9',      // Slate 100
      active: '#E2E8F0',     // Slate 200
    },
    border: {
      subtle: '#E2E8F0',     // Slate 200
      input: '#CBD5E1',      // Slate 300
      active: '#3B82F6',     // Blue 500
    },
    text: {
      primary: '#0F172A',    // Slate 900
      secondary: '#475569',  // Slate 600
      tertiary: '#94A3B8',   // Slate 400
    },
    semantic: {
      success: '#10B981',    // Emerald 500
      danger: '#EF4444',     // Red 500
      warning: '#F59E0B',    // Amber 500
      brand: '#0F172A',      // Slate 900
    },
    dataViz: {
      cash: '#14B8A6',
      digitalBank: '#0EA5E9',
      rdpu: '#8B5CF6',
      bonds: '#6366F1',
      localStocks: '#F43F5E',
      sp500: '#3B82F6',
      usd: '#10B981',
      gold: '#EAB308',
    }
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: { fontSize: '48px', fontWeight: 700, lineHeight: '1.1', letterSpacing: '-0.02em' },
    h1: { fontSize: '32px', fontWeight: 700, lineHeight: '1.2', letterSpacing: '-0.01em' },
    h2: { fontSize: '24px', fontWeight: 600, lineHeight: '1.3', letterSpacing: '0' },
    eyebrow: { fontSize: '12px', fontWeight: 700, lineHeight: '1.4', letterSpacing: '0.05em', textTransform: 'uppercase' },
    bodyRegular: { fontSize: '16px', fontWeight: 400, lineHeight: '1.5', letterSpacing: '0' },
    bodyBold: { fontSize: '16px', fontWeight: 600, lineHeight: '1.5', letterSpacing: '0' },
    interactive: { fontSize: '14px', fontWeight: 600, lineHeight: '1.2', letterSpacing: '0' },
  }
};

export default function App() {
  return (
    <div style={{ backgroundColor: tokens.colors.surface.app, fontFamily: tokens.typography.fontFamily, color: tokens.colors.text.primary, minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header Style Guide */}
        <div>
          <h1 style={{ ...tokens.typography.h1, marginBottom: '8px' }}>Jejak Harta</h1>
          <p style={{ ...tokens.typography.bodyRegular, color: tokens.colors.text.secondary }}>Sistem Desain & Panduan Token</p>
        </div>

        {/* DEMO: Dashboard Card */}
        <section>
          <div style={{ backgroundColor: tokens.colors.surface.card, borderRadius: '16px', border: `1px solid ${tokens.colors.border.subtle}`, padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.secondary }}>Total Kekayaan Bersih</span>
                <div style={{ ...tokens.typography.display, marginTop: '8px' }}>Rp 14.500.000.000</div>
              </div>
              <div style={{ backgroundColor: '#ECFDF5', padding: '8px 16px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '8px', color: tokens.colors.semantic.success }}>
                <TrendingUp size={20} />
                <span style={tokens.typography.bodyBold}>+12.4% YTD</span>
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: tokens.colors.border.subtle, width: '100%' }}></div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: tokens.colors.surface.input, padding: '12px', borderRadius: '12px', color: tokens.colors.dataViz.sp500 }}>
                  <PieChart size={24} />
                </div>
                <div>
                  <span style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.tertiary }}>S&P 500 ETF</span>
                  <div style={{ ...tokens.typography.h2, marginTop: '4px' }}>Rp 5.200.000.000</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: tokens.colors.surface.input, padding: '12px', borderRadius: '12px', color: tokens.colors.dataViz.bonds }}>
                  <Wallet size={24} />
                </div>
                <div>
                  <span style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.tertiary }}>Obligasi Negara</span>
                  <div style={{ ...tokens.typography.h2, marginTop: '4px' }}>Rp 3.800.000.000</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ backgroundColor: '#FEF2F2', padding: '12px', borderRadius: '12px', color: tokens.colors.semantic.danger }}>
                  <TrendingDown size={24} />
                </div>
                <div>
                  <span style={{ ...tokens.typography.eyebrow, color: tokens.colors.semantic.danger }}>Saham Lokal (Drawdown)</span>
                  <div style={{ ...tokens.typography.h2, marginTop: '4px' }}>-Rp 150.000.000</div>
                </div>
              </div>
            </div>

            <button style={{ backgroundColor: tokens.colors.semantic.brand, color: tokens.colors.surface.card, padding: '16px', borderRadius: '12px', border: 'none', cursor: 'pointer', ...tokens.typography.interactive, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              Lihat Proyeksi FIRE
            </button>
          </div>
        </section>

        {/* TYPOGRAPHY TOKENS */}
        <section style={{ backgroundColor: tokens.colors.surface.card, borderRadius: '16px', border: `1px solid ${tokens.colors.border.subtle}`, padding: '32px' }}>
          <h2 style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.tertiary, marginBottom: '24px', borderBottom: `1px solid ${tokens.colors.border.subtle}`, paddingBottom: '12px' }}>Tipografi (Plus Jakarta Sans)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(tokens.typography).filter(([k]) => k !== 'fontFamily').map(([key, style]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '16px', alignItems: 'center' }}>
                <span style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.secondary }}>{key}</span>
                <div style={style}>The quick brown fox jumps over the lazy dog.</div>
              </div>
            ))}
          </div>
        </section>

        {/* DATA VIZ COLORS */}
        <section style={{ backgroundColor: tokens.colors.surface.card, borderRadius: '16px', border: `1px solid ${tokens.colors.border.subtle}`, padding: '32px' }}>
          <h2 style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.tertiary, marginBottom: '24px', borderBottom: `1px solid ${tokens.colors.border.subtle}`, paddingBottom: '12px' }}>Palet Visualisasi Data (Aset)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '16px' }}>
            {Object.entries(tokens.colors.dataViz).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ backgroundColor: value, height: '48px', borderRadius: '8px' }}></div>
                <div style={{ ...tokens.typography.eyebrow, color: tokens.colors.text.secondary }}>{key}</div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}