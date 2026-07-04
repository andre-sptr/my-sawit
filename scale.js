// This maintenance script is CommonJS because the package is not ESM.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
const files = [
  'src/app/page.tsx',
  'src/app/kapling/[id]/page.tsx',
  'src/components/summary-cards.tsx',
  'src/components/kapling/activity-tabs.tsx',
  'src/components/kapling/inactive-page.tsx',
  'src/components/kapling/add-kapling-modal.tsx',
  'src/components/nav/sidebar.tsx',
  'src/components/nav/mobile-top-bar.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/fontSize:\s*(\d+)/g, (match, p1) => `fontSize: 'calc(${p1}px * var(--text-scale, 1))'`);
  fs.writeFileSync(file, content);
}
console.log('Fonts scaled');
