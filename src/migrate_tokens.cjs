const fs = require('fs');
const path = require('path');

const patterns = [
  ['tokens.colors.surface.app', 'var(--color-surface-app)'],
  ['tokens.colors.surface.card', 'var(--color-surface-card)'],
  ['tokens.colors.surface.input', 'var(--color-surface-input)'],
  ['tokens.colors.surface.active', 'var(--color-surface-active)'],
  ['tokens.colors.overlay', 'var(--color-overlay)'],
  ['tokens.colors.border.subtle', 'var(--color-border-subtle)'],
  ['tokens.colors.border.input', 'var(--color-border-input)'],
  ['tokens.colors.border.active', 'var(--color-border-active)'],
  ['tokens.colors.text.primary', 'var(--color-text-primary)'],
  ['tokens.colors.text.secondary', 'var(--color-text-secondary)'],
  ['tokens.colors.text.tertiary', 'var(--color-text-tertiary)'],
  ['tokens.colors.semantic.successBg', 'var(--color-semantic-success-bg)'],
  ['tokens.colors.semantic.dangerBg', 'var(--color-semantic-danger-bg)'],
  ['tokens.colors.semantic.successBorder', 'var(--color-semantic-success-border)'],
  ['tokens.colors.semantic.dangerBorder', 'var(--color-semantic-danger-border)'],
  ['tokens.colors.semantic.success', 'var(--color-semantic-success)'],
  ['tokens.colors.semantic.danger', 'var(--color-semantic-danger)'],
  ['tokens.colors.semantic.warning', 'var(--color-semantic-warning)'],
  ['tokens.colors.semantic.brand', 'var(--color-semantic-brand)'],
  ['tokens.colors.dataViz.cash', 'var(--color-viz-cash)'],
  ['tokens.colors.dataViz.digitalBank', 'var(--color-viz-digital-bank)'],
  ['tokens.colors.dataViz.usd', 'var(--color-viz-usd)'],
  ['tokens.colors.dataViz.sbnRitel', 'var(--color-viz-sbn-ritel)'],
  ['tokens.colors.dataViz.obligasiFr', 'var(--color-viz-obligasi-fr)'],
  ['tokens.colors.dataViz.bonds', 'var(--color-viz-bonds)'],
  ['tokens.colors.dataViz.rdpu', 'var(--color-viz-rdpu)'],
  ['tokens.colors.dataViz.rdCampuran', 'var(--color-viz-rd-campuran)'],
  ['tokens.colors.dataViz.rdSaham', 'var(--color-viz-rd-saham)'],
  ['tokens.colors.dataViz.rdpuUsd', 'var(--color-viz-rdpu-usd)'],
  ['tokens.colors.dataViz.localStocks', 'var(--color-viz-local-stocks)'],
  ['tokens.colors.dataViz.sp500', 'var(--color-viz-sp500)'],
  ['tokens.colors.dataViz.nasdaq', 'var(--color-viz-nasdaq)'],
  ['tokens.colors.dataViz.usStocks', 'var(--color-viz-us-stocks)'],
  ['tokens.colors.dataViz.gold', 'var(--color-viz-gold)'],
  ['tokens.colors.dataViz.kripto', 'var(--color-viz-kripto)']
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // To avoid replacing definitions in App.jsx, we can split by a marker or just be smart.
  // Actually, replacing with quoted var() is usually what's needed in JSX attributes.
  // e.g. background: tokens.colors.text.primary -> background: "var(--color-text-primary)"
  
  patterns.sort((a, b) => b[0].length - a[0].length).forEach(([token, variable]) => {
    // Replace where it is not preceded by a quote (simple heuristic for "not already a string")
    // In many places it's tokens.colors... and we want "var(...)"
    
    // Specifically handle the case in objects: color: tokens.colors... -> color: "var(...)"
    const regex = new RegExp(token.replace(/\./g, '\\.'), 'g');
    content = content.replace(regex, (match, offset, fullText) => {
      // Check if it's already inside quotes
      const before = fullText.slice(Math.max(0, offset - 1), offset);
      if (before === "'" || before === '"' || before === '`') {
        return variable; // Just replace the inner part
      }
      return `"${variable}"`; // Wrap in quotes for JSX style objects
    });
  });
  
  fs.writeFileSync(filePath, content);
}

const files = [
  'd:/Dokumen/SaaS with AI/Jejak-Harta/jejak-uang/src/App.jsx',
  'd:/Dokumen/SaaS with AI/Jejak-Harta/jejak-uang/src/components/InputTab.jsx',
  'd:/Dokumen/SaaS with AI/Jejak-Harta/jejak-uang/src/components/ProjectionTab.jsx'
];

files.forEach(processFile);
console.log("Migration complete!");
