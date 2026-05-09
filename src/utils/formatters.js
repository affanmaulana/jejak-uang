export const formatIDR = (v) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

export const formatCompact = (v) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}Rp ${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}Rp ${(abs / 1e9).toFixed(1)}M`;
  if (abs >= 1e6) return `${sign}Rp ${(abs / 1e6).toFixed(1)}Jt`;
  return `${sign}Rp ${Math.round(abs).toLocaleString("id-ID")}`;
};

export const parseExpression = (str) => {
  // Strip semua karakter selain angka, titik, koma, spasi, +, -
  const cleaned = str.replace(/[^\d+\-.,\s]/g, "").trim();
  if (!cleaned) return null;
  // Tokenize: pisahkan jadi angka dan operator, awali dengan + implisit
  const tokenMatches = cleaned.match(/[+\-]?[\d.,\s]+/g);
  if (!tokenMatches) return null;
  const result = tokenMatches.reduce((sum, token) => {
    const num = Number(token.replace(/[.,\s]/g, ""));
    return isNaN(num) ? sum : sum + num;
  }, 0);
  return result >= 0 ? result : null;
};

export const formatWhileTyping = (str) => {
  if (!str) return "";
  // Split by + atau -, tapi pertahankan operatornya sebagai separator
  const parts = str.split(/([+\-])/);
  return parts.map((part) => {
    // Kalau part adalah operator, kembalikan apa adanya
    if (part === "+" || part === "-") return part;
    // Kalau angka: strip non-digit dulu, lalu format
    const digits = part.replace(/\D/g, "");
    if (!digits) return part; // jaga spasi/string kosong
    return new Intl.NumberFormat("id-ID").format(Number(digits));
  }).join("");
};

export const afterTaxReturn = (cls, overrideReturn) => {
  const r = overrideReturn !== undefined ? overrideReturn : cls.return;
  if (cls.id === "saham") return r * 0.97;
  // Emas: kurangi biaya efektif tahunan 1.5% langsung dari return
  // (mencakup: spread fisik/digital ~1.25%/thn + PPh buyback ~0.30%/thn − buffer)
  if (cls.isGold) return r - 1.5;
  if (cls.taxRate === 0) return r;
  return r * (1 - cls.taxRate);
};
