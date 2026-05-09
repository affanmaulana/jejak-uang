export const tokens = {
  shadows: {
    soft: "var(--shadow-md)",
    medium: "var(--shadow-lg)",
    strong: "var(--shadow-strong)",
    modal: "var(--shadow-modal)",
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    display: { fontSize: "var(--text-display-size)", fontWeight: "var(--text-subtitle-weight)", lineHeight: "var(--text-display-line-height)", letterSpacing: "var(--text-display-letter-spacing)" },
    h1: { fontSize: "var(--text-h1-size)", fontWeight: "var(--text-subtitle-weight)", lineHeight: "var(--text-h1-line-height)", letterSpacing: "var(--text-h1-letter-spacing)" },
    h2: { fontSize: "var(--text-h2-size)", fontWeight: "var(--text-caption-weight)", lineHeight: "var(--text-h2-line-height)", letterSpacing: "0" },
    eyebrow: { fontSize: "var(--text-caption-size)", fontWeight: "var(--text-subtitle-weight)", lineHeight: "var(--text-caption-line-height)", letterSpacing: "var(--text-eyebrow-letter-spacing)", textTransform: "uppercase" },
    bodyRegular: { fontSize: "var(--text-subtitle-size)", fontWeight: "var(--text-body-weight)", lineHeight: "var(--text-subtitle-line-height)", letterSpacing: "0" },
    bodyBold: { fontSize: "var(--text-subtitle-size)", fontWeight: "var(--text-caption-weight)", lineHeight: "var(--text-subtitle-line-height)", letterSpacing: "0" },
    interactive: { fontSize: "var(--text-body-size)", fontWeight: "var(--text-caption-weight)", lineHeight: "var(--text-h1-line-height)", letterSpacing: "0" },
  },
};
