// Generator: quet toan bo file .md trong docs/, nhung noi dung vao docs-data.js
// de portal index.html doc duoc khi mo bang file:// (double-click), khong can server.
// Chay lai moi khi tai lieu thay doi:  node build-docs-site.mjs
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url)); // = docs/

// File cua chinh portal -> khong dua vao danh sach tai lieu
const SELF = new Set(['index.html', 'docs-data.js', 'build-docs-site.mjs']);

// Ten than thien + icon cho tung thu muc (fallback = ten thu muc)
const SECTION_META = {
  '.':                    { title: 'Tổng hợp / Trang gốc', icon: '📄', order: 0 },
  '00-overview':          { title: 'Tổng quan hệ thống',   icon: '🏗️', order: 10 },
  '01-business':          { title: 'Nghiệp vụ',            icon: '💼', order: 20 },
  '02-technical':         { title: 'Kỹ thuật',             icon: '⚙️', order: 30 },
  '02-technical/api-contracts':    { title: 'Kỹ thuật · API contracts',    icon: '🔗', order: 31 },
  '02-technical/sequence-diagrams':{ title: 'Kỹ thuật · Sequence diagram', icon: '📈', order: 32 },
  '03-operations':        { title: 'Vận hành',             icon: '🚀', order: 40 },
  '03-reports':           { title: 'Báo cáo',              icon: '📊', order: 50 },
  '04-decisions':         { title: 'Quyết định kiến trúc (ADR)', icon: '🧭', order: 60 },
  'api-parity':           { title: 'Đối chiếu API (parity)',     icon: '🔌', order: 70 },
  'api-parity/admin':     { title: 'Parity · App Admin',         icon: '🖥️', order: 71 },
  'api-parity/customer':  { title: 'Parity · App Khách',         icon: '📱', order: 72 },
  'review':               { title: 'Review bảo mật & ổn định',   icon: '🔒', order: 80 },
  'review/admin':         { title: 'Review · App Admin',         icon: '🖥️', order: 81 },
  'review/customer':      { title: 'Review · App Khách',         icon: '📱', order: 82 },
  'review/fix-verification': { title: 'Review · Kiểm tra bản vá', icon: '✅', order: 83 },
  'superpowers':          { title: 'Kế hoạch & nghiên cứu',      icon: '🧪', order: 90 },
  'superpowers/plans':    { title: 'Kế hoạch',                   icon: '📋', order: 91 },
  'superpowers/research': { title: 'Nghiên cứu',                 icon: '🔬', order: 92 },
  'superpowers/specs':    { title: 'Thiết kế (spec)',            icon: '📐', order: 93 },
};

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const toPosix = (p) => p.split('\\').join('/');

function titleFromMd(md, fallback) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (m) return m[1].replace(/[*_`]/g, '').trim();
  return fallback;
}

function sectionOf(relPath) {
  const dir = toPosix(dirname(relPath));
  return dir === '' ? '.' : dir;
}

const allFiles = walk(ROOT).map((f) => toPosix(relative(ROOT, f)));

// Map: html theo thu muc + basename de gan "ban truc quan" cho md tuong ung
const htmlByKey = new Map(); // key = dir/basename(no ext) -> relPath.html
for (const rel of allFiles) {
  if (SELF.has(rel)) continue;
  if (extname(rel).toLowerCase() === '.html') {
    const key = toPosix(join(dirname(rel), basename(rel, extname(rel))));
    htmlByKey.set(key, rel);
  }
}

const usedHtml = new Set();
const files = [];

for (const rel of allFiles) {
  if (SELF.has(rel)) continue;
  const ext = extname(rel).toLowerCase();
  if (ext !== '.md') continue;
  const md = readFileSync(join(ROOT, rel), 'utf8');
  const fname = basename(rel);
  const key = toPosix(join(dirname(rel), basename(rel, ext)));
  const visualHtml = htmlByKey.get(key) || null;
  if (visualHtml) usedHtml.add(visualHtml);
  files.push({
    path: rel,
    type: 'md',
    section: sectionOf(rel),
    title: titleFromMd(md, fname),
    bytes: Buffer.byteLength(md, 'utf8'),
    visualHtml,
    md,
  });
}

// Cac trang HTML "truc quan" KHONG co .md di kem -> liet ke nhu trang rieng
for (const rel of allFiles) {
  if (SELF.has(rel)) continue;
  if (extname(rel).toLowerCase() !== '.html') continue;
  if (usedHtml.has(rel)) continue;
  const fname = basename(rel, '.html');
  files.push({
    path: rel,
    type: 'html',
    section: sectionOf(rel),
    title: fname.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    bytes: statSync(join(ROOT, rel)).size,
    visualHtml: rel,
    md: null,
  });
}

// Sap xep theo section.order roi theo path
function sectionOrder(sec) {
  return SECTION_META[sec]?.order ?? 500;
}
files.sort((a, b) => {
  const so = sectionOrder(a.section) - sectionOrder(b.section);
  if (so !== 0) return so;
  return a.path.localeCompare(b.path);
});

// Danh sach section co xuat hien (giu thu tu)
const seen = new Set();
const sections = [];
for (const f of files) {
  if (seen.has(f.section)) continue;
  seen.add(f.section);
  const meta = SECTION_META[f.section] || { title: f.section, icon: '📁', order: sectionOrder(f.section) };
  sections.push({ dir: f.section, title: meta.title, icon: meta.icon, order: meta.order });
}
sections.sort((a, b) => a.order - b.order);

const data = {
  generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
  stats: {
    docs: files.filter((f) => f.type === 'md').length,
    visuals: [...new Set(files.filter((f) => f.visualHtml).map((f) => f.visualHtml))].length,
    sections: sections.length,
  },
  sections,
  files,
};

const out = `// AUTO-GENERATED by build-docs-site.mjs — KHONG sua tay.\n` +
  `// Chay lai: node build-docs-site.mjs\n` +
  `window.DOCS_DATA = ${JSON.stringify(data)};\n`;

writeFileSync(join(ROOT, 'docs-data.js'), out, 'utf8');
console.log(`OK -> docs-data.js`);
console.log(`  ${data.stats.docs} tai lieu .md, ${data.stats.visuals} ban truc quan HTML, ${data.stats.sections} muc`);
console.log(`  ${(Buffer.byteLength(out, 'utf8') / 1024).toFixed(0)} KB`);
