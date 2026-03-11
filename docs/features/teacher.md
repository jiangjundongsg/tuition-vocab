# Teacher Features

## Navigation
Teachers see only the **Teacher Tools** tab in `ChildHeader`. Practice and Tricky Words tabs are hidden. The `/words` page is the central management hub.

---

## `/words` Page — Management Hub

The teacher management page contains four sections (tabs):

| Tab | Component | Purpose |
|-----|-----------|---------|
| Words | — | View/edit/delete words; filter by student |
| Upload | `WordUploader` / `PhotoUploader` / `PDFUploader` | Add new words for a student |
| Users | `TeacherUserManager` | Manage student accounts + per-student config |
| SQL | `TeacherSQLPortal` | Run raw SQL queries (SELECT/INSERT/UPDATE/DELETE; DDL blocked) |

---

## Word Management

### Viewing Words
- A **Student filter** dropdown lets the teacher pick a student; the word list updates to show only that student's words.
- Columns: lessonNumber, word, difficulty, lesson number, Zipf score, created date.
- Teacher can inline-edit `lessonNumber` and `difficulty` via `PATCH /api/words/[id]`.
- Teacher can multi-select and bulk-delete words via `DELETE /api/words`.

### Upload — CSV (`WordUploader`)
- Input format: one word per line
- Lesson numbers are default as the student's user ID + Date ("Jiang Xin Qi 251231). Date is in the format of YYMMDD
- **Student selector** at the top — teacher can select one or multiple target students to upload words to.
- Words are inserted for each selected student — if N students are selected and M words are uploaded, N×M word rows are created in total (one per student-word combination).
- Duplicate words for the same student are silently skipped (UNIQUE on `(user_id, word)`).

### Upload — Photo (`PhotoUploader`)
- Teacher uploads a photo of a word list (handwritten or printed).
- Claude Vision extracts words from the image.
- Lesson label defaults to be user ID + date same as for Upload — CSV (`WordUploader`).
- **Student selector ** — same as CSV upload.

### Upload — PDF (`PDFUploader`)
- Teacher uploads a PDF containing vocabulary.
- PDF is parsed and words are extracted.
- **Student selector ** — same as other upload methods.

All three upload routes require `targetUserId` in the request body and validate that the ID belongs to a real student.

---

## User Manager (`TeacherUserManager`)

Lists all registered users. For each student the teacher can:

### Profile fields
| Field | Description |
|-------|-------------|
| `display_name` | Student's display name shown in the UI |
| `age` | Student's age — calibrates AI difficulty |
| `passage_source` | Textbook filename for passage lookup (e.g. `TextBook_Harry_Portter`) |
| `passage_word_count` | Target word count for generated passages (default 150) |
| `comp_question_type` | Comprehension style: `mcq`, `true_false`, `mixed` |
| `num_comprehension` | Number of comprehension questions per word (default 2) |
| `num_blanks` | Fill-blank gap count (default 5) |
| `blank_zipf_max` | Max Zipf score for blank selection — lower = harder (default 4.2) |

### Question-type toggles (5 checkboxes)
| Checkbox | Column | Default |
|----------|--------|---------|
| MCQ (word meaning) | `enable_mcq_meaning` | ✅ on |
| MCQ (synonym) | `enable_mcq_synonym` | ❌ off |
| MCQ (antonym) | `enable_mcq_antonym` | ❌ off |
| Comprehension | `enable_comprehension` | ✅ on |
| Fill-in-blank | `enable_fill_blank` | ✅ on |

Changes are saved via `PATCH /api/teacher/users/[id]` and take effect on the student's **next** practice session (cached `word_sets` are not invalidated automatically).

### Delete student
`DELETE /api/teacher/users/[id]` — removes the user and their associated words (cascaded).

---

## SQL Portal (`TeacherSQLPortal`)

- Free-form SQL input; results displayed as a table.
- Allowed: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- Blocked: all DDL (`CREATE`, `DROP`, `ALTER`, `TRUNCATE`, etc.)
- Useful for: checking `SELECT * FROM words WHERE user_id = X`, manual data fixes, reporting.

---

## API Endpoints Used by Teachers

| Endpoint | Purpose |
|----------|---------|
| `GET /api/words?userId=` | Fetch words for a specific student |
| `PATCH /api/words/[id]` | Edit a word's lesson/difficulty |
| `DELETE /api/words` | Bulk delete words |
| `POST /api/words/upload` | CSV upload → `targetUserId` required |
| `POST /api/words/upload-photo` | Photo upload → `targetUserId` required |
| `POST /api/words/upload-pdf` | PDF upload → `targetUserId` required |
| `GET /api/lessons?userId=` | Fetch lessons for a specific student |
| `GET /api/teacher/users` | List all users with full config |
| `PATCH /api/teacher/users/[id]` | Update student profile + question-type flags |
| `DELETE /api/teacher/users/[id]` | Delete a student account |
| `POST /api/teacher/sql` | Execute raw SQL |

---

## Landing Page (`/`)
Teacher landing shows quick-access links to:
- Upload words (CSV / Photo / PDF)
- Manage users
- SQL portal

Student landing shows practice-oriented content (lesson picker shortcut, wrong-bank summary).
