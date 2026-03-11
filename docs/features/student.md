# Student Features

## Navigation
Students see three tabs in `ChildHeader`:
- **Practice** — start a new session
- **Tricky Words** — review wrong-bank items
- **Dictation** — pick a lesson and practice dictation independently

Teachers and management tabs are hidden from students.

---

## Practice Session (`/practice`)

### Lesson Selection
- Student picks a lesson from the lesson picker.
- Only lessons containing words assigned to that student (`user_id`) are shown.
- Lessons are identified by `lesson_number` (a text label, e.g. `"JohnSmith260311"`).
- The most recent picked lesson is marked in the lesson picker page.

### Session Flow
Each session picks all the words from the chosen lesson and for each word:

1. **Passage generation** 
— Claude generates a short paragraph containing the word. Passage length is set by `passage_word_count` in the student's config (default 150 words). Source can be a real textbook paragraph (if `passage_source` is set) or AI-generated.
— Student can click a button to regenerate the passage

2. **Enabled question types** (teacher-configurable per student):

   | Question Type | Default | Description |
   |---------------|---------|-------------|
   | MCQ — word meaning | ✅ on | 4-option multiple choice about the word's meaning |
   | MCQ — synonym | ❌ off | 4-option MCQ asking for a synonym |
   | MCQ — antonym | ❌ off | 4-option MCQ asking for an antonym |
   | Comprehension | ✅ on | MCQ / true-false / mixed Qs about the passage |
   | Fill-in-blank | ✅ on | Passage with blanks; first-letter hints provided |

3. **Dictation round** — After all 5 words are reviewed, a TTS dictation round plays each word via browser speech synthesis; student types it in.

### Immediate Feedback
- Each MCQ answer is evaluated immediately (green ✓ / red ✗).
- Correct answers on first attempt do not add to wrong bank.
- Wrong answers are recorded to the wrong bank automatically via `POST /api/questions/answer`.

### Question Caching
- Generated passages and questions are cached in `word_sets` per `(user_id, word_id)`.
- Re-opening the same lesson reuses cached questions (no extra API call).
- Cache is invalidated when the word is deleted and re-added.

---

## Wrong Bank / Tricky Words (`/wrong-bank`)

### What it shows
A table of all words where the student has answered at least one question wrong. Columns: word, question type, wrong count, last wrong date.

### Re-practice
- Student clicks **Re-practice** to start a `RepracticeSession`.
- Only the specific question(s) they got wrong are shown — not the full word session.
- Answering correctly decrements `wrong_count` by 1.
- When `wrong_count` reaches 0, the entry is removed from the wrong bank.
- Only the qeustions(s) that is tagged under the students are shown
---

## Student Config (read-only — teacher sets it)

The following settings affect the student's experience. Only the teacher can change them via User Manager:

| Setting | Default | Effect |
|---------|---------|--------|
| `age` | — | Calibrates Claude passage/question difficulty |
| `passage_source` | — | Use a specific textbook file for passages |
| `passage_word_count` | 150 | Target word count for generated passages |
| `comp_question_type` | mcq | Comprehension question style: `mcq`, `true_false`, `mixed` |
| `num_comprehension` | 2 | Number of comprehension questions per word |
| `num_blanks` | 5 | Number of fill-in-the-blank gaps |
| `blank_zipf_max` | 4.2 | Zipf score ceiling — only common words become blanks |
| `enable_mcq_meaning` | true | Show MCQ meaning question |
| `enable_mcq_synonym` | false | Show MCQ synonym question |
| `enable_mcq_antonym` | false | Show MCQ antonym question |
| `enable_comprehension` | true | Show comprehension questions |
| `enable_fill_blank` | true | Show fill-in-the-blank exercise |

---

## Dictation (`/dictation`)

### Lesson Selection
- Student picks a lesson from the lesson list.
- Only lessons containing words assigned to that student are shown.

### Session Flow
- All words in the chosen lesson are displayed on a single page.
- Each word has a TTS button — student clicks to hear the word spoken via browser speech synthesis.
- Student types each word into the input field next to it.
- Immediate feedback shown per word (correct / incorrect).

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `GET /api/dictation/lessons` | List lessons available for dictation |
| `GET /api/dictation/[lessonNumber]` | Fetch all words in the chosen lesson |

---

## API Endpoints Used by Students

| Endpoint | Purpose |
|----------|---------|
| `GET /api/lessons` | Fetch lessons for current student's words |
| `GET /api/practice/[wordId]` | Load (or generate) a word's passage + questions |
| `POST /api/questions/answer` | Record whether each answer was correct |
| `GET /api/wrong-bank` | Fetch wrong-bank entries for current user |
| `POST /api/wrong-bank/repractice` | Record re-practice answer |
| `GET /api/dictation/lessons` | List lessons available for dictation |
| `GET /api/dictation/[lessonNumber]` | Fetch all words in the chosen lesson for dictation |
