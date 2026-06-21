/**
 * Upload comm_word_list to xinqi & xintai in batches of 10.
 * Lesson numbers: 260701, 260702, ... (YYMMDD, +1 day each batch).
 */
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const DB = process.env.DATABASE_URL;
if (!DB) { console.error('DATABASE_URL not set.'); process.exit(1); }
if (DRY_RUN) console.log('DRY RUN.\n');

const sql = neon(DB);

const WORD_FILE = path.join(__dirname, '..', 'public', 'comm_word_list');
const NAMES = ['xinqi', 'xintai'];
const BATCH = 10;
const START = '260701';

function lessonNumbers(start, count) {
  const base = new Date(2000 + +start.slice(0,2), +start.slice(2,4)-1, +start.slice(4,6));
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    out.push(`${String(d.getFullYear()).slice(2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  return out;
}

async function retry(fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      if (i === tries - 1) throw e;
      console.log(`  Retry ${i+1}/${tries}...`);
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
}

(async () => {
  const raw = fs.readFileSync(WORD_FILE, 'utf-8');
  const words = raw.split('\n').map(l => l.trim().toLowerCase()).filter(w => w.length > 0);
  console.log(`Loaded ${words.length} words.\n`);

  console.log('Finding students...');
  const users = await retry(() => sql`SELECT id, display_name FROM users WHERE role='student' AND display_name = ANY(${NAMES})`);
  if (!users.length) { console.error('No students found.'); process.exit(1); }
  users.forEach(u => console.log(`  ${u.display_name} (id=${u.id})`));

  const count = Math.ceil(words.length / BATCH);
  const lessons = lessonNumbers(START, count);
  console.log(`\n${words.length} words → ${count} batches of ${BATCH}`);
  console.log(`Lessons: ${lessons[0]} → ${lessons[lessons.length-1]}\n`);

  for (const u of users) {
    console.log(`Uploading to ${u.display_name}...`);
    let total = 0;
    for (let b = 0; b < count; b++) {
      const batch = words.slice(b * BATCH, (b + 1) * BATCH);
      const lesson = lessons[b];

      if (DRY_RUN) {
        total += batch.length;
        console.log(`  [DRY] ${batch.length} words → ${lesson}`);
      } else {
        await retry(() => sql`
          INSERT INTO words (word, user_id, lesson_number, difficulty)
          SELECT * FROM UNNEST(
            ${batch}::text[],
            ${batch.map(() => u.id)}::int[],
            ${batch.map(() => lesson)}::text[],
            ${batch.map(() => 'unknown')}::text[]
          )
          ON CONFLICT (user_id, word) WHERE user_id IS NOT NULL DO NOTHING
        `, 2);
        total += batch.length;
        console.log(`  ${batch.length} words → ${lesson}`);
      }
    }
    console.log(`  Total: ${total}\n`);
  }
  console.log('Done!');
})().catch(e => { console.error(e); process.exit(1); });
