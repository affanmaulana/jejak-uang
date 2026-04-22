const fs = require('fs');
const files = ['src/App.jsx', 'src/components/InputTab.jsx', 'src/components/ProjectionTab.jsx'];
const results = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.match(/fontSize\s*:\s*[^,}]+|fontWeight\s*:\s*[^,}]+|lineHeight\s*:\s*[^,}]+|letterSpacing\s*:\s*[^,}]+|textTransform\s*:\s*[^,}]+/g);
  if(matches) matches.forEach(m => results.add(m.trim()));
});
console.log(Array.from(results).sort().join('\n'));
