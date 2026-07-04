// This maintenance script is CommonJS because the package is not ESM.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
const file = 'src/app/globals.css';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/font-size:\s*(\d+)px/g, (match, p1) => `font-size: calc(${p1}px * var(--text-scale, 1))`);
fs.writeFileSync(file, content);
console.log('globals.css fonts scaled');
