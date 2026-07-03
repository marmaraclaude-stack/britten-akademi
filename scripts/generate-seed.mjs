// content/placement-questions.json -> supabase/migrations/0002_seed_questions.sql
// Kullanım: npm run generate:seed
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(
  readFileSync(join(root, 'content', 'placement-questions.json'), 'utf8')
);

const esc = (s) => String(s).replace(/'/g, "''");

// --- Doğrulama ---
const errors = [];
const ids = new Set();
const validLevels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const validSections = new Set(['grammar', 'vocabulary', 'usage', 'reading']);
const passageRefs = new Set(data.passages.map((p) => p.ref));

for (const q of data.questions) {
  if (ids.has(q.id)) errors.push(`Tekrarlanan id: ${q.id}`);
  ids.add(q.id);
  if (!validSections.has(q.section)) errors.push(`Geçersiz bölüm (${q.id}): ${q.section}`);
  if (!validLevels.has(q.level)) errors.push(`Geçersiz seviye (${q.id}): ${q.level}`);
  if (!Array.isArray(q.options) || q.options.length !== 4)
    errors.push(`Seçenek sayısı 4 değil (${q.id})`);
  if (!Number.isInteger(q.answer_index) || q.answer_index < 0 || q.answer_index > 3)
    errors.push(`Geçersiz cevap indeksi (${q.id})`);
  if (q.section === 'reading' && !passageRefs.has(q.passage_ref))
    errors.push(`Pasaj bulunamadı (${q.id}): ${q.passage_ref}`);
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4)
    errors.push(`Yinelenen seçenek (${q.id})`);
}
if (data.questions.length !== 100)
  errors.push(`Soru sayısı 100 değil: ${data.questions.length}`);

if (errors.length) {
  console.error('DOĞRULAMA HATALARI:');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}

// --- SQL üretimi ---
let sql = `-- Seviye tespit sınavı soru bankası (otomatik üretildi: scripts/generate-seed.mjs)
-- ${data.questions.length} soru, ${data.passages.length} okuma pasajı

delete from public.test_questions;
delete from public.test_passages;

`;

for (const p of data.passages) {
  sql += `insert into public.test_passages (ref, level, title, body) values ('${esc(p.ref)}', '${esc(p.level)}', '${esc(p.title)}', '${esc(p.text)}');\n`;
}
sql += '\n';

for (const q of data.questions) {
  const passage = q.passage_ref ? `'${esc(q.passage_ref)}'` : 'null';
  const explanation = q.explanation ? `'${esc(q.explanation)}'` : 'null';
  const options = `'${esc(JSON.stringify(q.options))}'::jsonb`;
  sql += `insert into public.test_questions (id, section, level, passage_ref, question, options, answer_index, explanation) values (${q.id}, '${esc(q.section)}', '${esc(q.level)}', ${passage}, '${esc(q.question)}', ${options}, ${q.answer_index}, ${explanation});\n`;
}

const out = join(root, 'supabase', 'migrations', '0002_seed_questions.sql');
writeFileSync(out, sql);
console.log(`✓ ${data.questions.length} soru, ${data.passages.length} pasaj -> ${out}`);

const bySection = {};
const byLevel = {};
for (const q of data.questions) {
  bySection[q.section] = (bySection[q.section] ?? 0) + 1;
  byLevel[q.level] = (byLevel[q.level] ?? 0) + 1;
}
console.log('Bölümler:', bySection);
console.log('Seviyeler:', byLevel);
