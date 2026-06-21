/**
 * Repack P3_ words into batches of 10 and rename lessons sequentially.
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/repack-p3.cjs [--dry-run]
 */
const { createPool } = require('@vercel/postgres');

const DRY_RUN = process.argv.includes('--dry-run');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL env var not set.');
  process.exit(1);
}

if (DRY_RUN) console.log('DRY RUN — no writes.\n');

const pool = createPool({ connectionString: DATABASE_URL });

async function findUsers(names) {
  const result = await pool.query(
    `SELECT id, display_name FROM users
     WHERE role = 'student'
       AND display_name ILIKE ANY($1::text[])
     ORDER BY id`,
    [names.map((n) => `%${n}%`)]
  );
  return result.rows;
}

async function fetchP3Words(userIds) {
  const result = await pool.query(
    `SELECT id, word, user_id, zipf_score, difficulty, lesson_number
     FROM words
     WHERE user_id = ANY($1::int[])
       AND lesson_number LIKE 'P3_%'
     ORDER BY user_id, lesson_number, id`,
    [userIds]
  );
  return result.rows;
}

async function deleteWords(ids) {
  if (ids.length === 0) return;
  await pool.query('DELETE FROM words WHERE id = ANY($1::int[])', [ids]);
}

async function insertWords(userId, words, lessonNumber) {
  if (words.length === 0) return 0;
  try {
    await pool.query(
      `INSERT INTO words (word, user_id, zipf_score, difficulty, lesson_number)
       SELECT * FROM UNNEST($1::text[], $2::int[], $3::real[], $4::text[], $5::text[])
       ON CONFLICT (user_id, word) WHERE user_id IS NOT NULL DO UPDATE
         SET zipf_score    = EXCLUDED.zipf_score,
             difficulty    = EXCLUDED.difficulty,
             lesson_number = EXCLUDED.lesson_number`,
      [
        words.map((w) => w.word),
        words.map(() => userId),
        words.map((w) => w.zipf),
        words.map((w) => w.difficulty),
        words.map(() => lessonNumber),
      ]
    );
    return words.length;
  } catch (err) {
    console.error(`  Failed to insert batch for ${lessonNumber}:`, err);
    return 0;
  }
}

function generateLessonNumbers(start, count) {
  const match = start.match(/^P3_(\d{4})(\d{2})(\d{2})$/);
  if (!match) throw new Error(`Invalid format: ${start}`);
  const base = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  const result = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    result.push(`P3_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`);
  }
  return result;
}

async function main() {
  console.log('Finding students xinqi / xintai...');
  const users = await findUsers(['xinqi', 'xintai']);

  if (users.length === 0) {
    console.error('No students found.');
    process.exit(1);
  }

  console.log(`Found ${users.length} student(s):`);
  for (const u of users) console.log(`  - ${u.display_name} (id=${u.id})`);

  const userIds = users.map((u) => u.id);
  console.log('\nFetching P3_ words...');
  const allWords = await fetchP3Words(userIds);

  if (allWords.length === 0) {
    console.log('No P3_ words found. Done.');
    process.exit(0);
  }

  console.log(`Found ${allWords.length} P3_ rows.\n`);

  const wordsByUser = new Map();
  for (const w of allWords) {
    const arr = wordsByUser.get(w.user_id) || [];
    arr.push(w);
    wordsByUser.set(w.user_id, arr);
  }

  for (const user of users) {
    const userWords = wordsByUser.get(user.id) || [];
    if (userWords.length === 0) {
      console.log(`${user.display_name}: no P3_ words — skipped.`);
      continue;
    }

    const seen = new Set();
    const uniqueWords = [];
    for (const w of userWords) {
      if (!seen.has(w.word)) { seen.add(w.word); uniqueWords.push(w); }
    }

    const BATCH = 10;
    const count = Math.ceil(uniqueWords.length / BATCH);
    const lessonNumbers = generateLessonNumbers('P3_20260601', count);

    console.log(`${user.display_name}: ${uniqueWords.length} unique → ${count} batches`);
    console.log(`  New: ${lessonNumbers.join(', ')}`);

    const oldIds = userWords.map((w) => w.id);
    if (DRY_RUN) {
      console.log(`  [DRY-RUN] Would delete ${oldIds.length} old rows`);
    } else {
      console.log(`  Deleting ${oldIds.length} old rows...`);
      await deleteWords(oldIds);
    }

    let total = 0;
    for (let b = 0; b < count; b++) {
      const batch = uniqueWords.slice(b * BATCH, (b + 1) * BATCH);
      const lesson = lessonNumbers[b];
      const items = batch.map((w) => ({ word: w.word, zipf: w.zipf_score, difficulty: w.difficulty }));

      if (DRY_RUN) {
        total += batch.length;
        console.log(`  [DRY-RUN] Would insert ${batch.length} → ${lesson}`);
      } else {
        const n = await insertWords(user.id, items, lesson);
        total += n;
        console.log(`  Batch ${b+1}: ${n} → ${lesson}`);
      }
    }
    console.log(`  Total: ${total}\n`);
  }

  console.log('All done!');
  await pool.end();
}

main().catch((err) => { console.error('Fatal:', err); pool.end().finally(() => process.exit(1)); });
