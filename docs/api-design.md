# API Design

All routes live under `src/app/api/`. Auth is cookie-based (`vocab_user_id`). Role is checked server-side via `getCurrentUser()` from `src/lib/auth.ts`.

---

## Auth

### `POST /api/auth/register`
Register a new account.

**Body**
```json
{
  "email": "student@example.com",
  "password": "secret",
  "displayName": "Alice",
  "teacherCode": "VOCAB_TEACHER"   // optional — grants teacher role if correct
}
```

**Response** `201` — sets `vocab_user_id` cookie.

---

### `POST /api/auth/login`
**Body** `{ "email": string, "password": string }`
**Response** `200` — sets `vocab_user_id` cookie.

---

### `POST /api/auth/logout`
Clears `vocab_user_id` cookie. No body required.

---

## Words

### `GET /api/words`
Returns word list.
- **Student**: automatically filters `WHERE user_id = currentUser.id`.
- **Teacher**: accepts `?userId=<id>` to filter by student; omit to see all words.

**Response**
```json
{
  "words": [
    { "id": 1, "word": "benevolent", "userId": 42, "difficulty": "hard",
      "lessonNumber": "20240101", "zipfScore": 3.1, "createdAt": "..." }
  ],
  "lessonNumbers": ["20240101", "20240108"]
}
```

---

### `PATCH /api/words/[id]`
Teacher only. Update a word's lesson label or difficulty.

**Body** `{ "lessonNumber"?: string, "difficulty"?: string }`
**Response** `200 { "word": { ... } }`

---

### `DELETE /api/words`
Teacher only. Bulk delete words.

**Body** `{ "ids": [1, 2, 3] }`
**Response** `200 { "deleted": 3 }`

---

### `POST /api/words/upload`
Teacher only. Upload words from CSV text for a specific student.

**Body**
```json
{
  "words": "20240101 benevolent\n20240101 tenacious\n20240108 ephemeral",
  "targetUserId": 42
}
```

Format: `<lessonLabel> <word>` — one per line. Lesson label is optional (defaults to `"0"`).
**Response** `200 { "inserted": 3, "skipped": 0 }`

---

### `POST /api/words/upload-photo`
Teacher only. Upload a photo; Claude Vision extracts words.

**Body**
```json
{
  "image": "<base64-encoded image>",
  "targetUserId": 42
}
```

Lesson label defaults to today's date (`yyyymmdd`).
**Response** `200 { "inserted": N, "words": ["word1", ...] }`

---

### `POST /api/words/upload-pdf`
Teacher only. Upload a PDF; words are extracted from text content.

**Body** `{ "pdf": "<base64-encoded PDF>", "targetUserId": 42 }`
**Response** `200 { "inserted": N, "words": [...] }`

---

## Lessons

### `GET /api/lessons`
Returns distinct lesson labels for words.
- **Student**: only lessons containing words assigned to `currentUser.id`.
- **Teacher**: accepts `?userId=<id>` to see a specific student's lessons.

**Response** `{ "lessons": ["20240101", "20240108"] }`

---

## Practice

### `GET /api/practice/[wordId]`
Fetch (or generate) a word set for the current student.
- Checks `word_sets` cache for `(user_id, word_id)`.
- On cache miss, calls Claude with the student's full config (age, passage settings, enabled question types).
- Stores result in `word_sets`.

**Response**
```json
{
  "wordSetId": 99,
  "word": "benevolent",
  "paragraph": "The benevolent teacher...",
  "questions": {
    "meaning": { "question": "...", "options": ["A","B","C","D"], "answer": "A" },
    "synonym":  { ... },           // only if enable_mcq_synonym = true
    "antonym":  { ... },           // only if enable_mcq_antonym = true
    "comprehension": [ { ... } ]   // only if enable_comprehension = true
  },
  "fillBlank": { ... }             // only if enable_fill_blank = true
}
```

---

## Questions

### `POST /api/questions/answer`
Record whether a student answered a question correctly. Updates wrong bank.

**Body**
```json
{
  "wordSetId": 99,
  "questionKey": "meaning",
  "isCorrect": false
}
```

**Response** `200 { "ok": true }`

---

## Wrong Bank

### `GET /api/wrong-bank`
Returns the current student's wrong-bank entries.

**Response**
```json
{
  "entries": [
    { "id": 1, "word": "benevolent", "wordSetId": 99,
      "questionKey": "meaning", "wrongCount": 2, "lastWrongAt": "..." }
  ]
}
```

---

### `POST /api/wrong-bank/repractice`
Record a re-practice attempt. Decrements `wrong_count`; deletes row when it reaches 0.

**Body** `{ "wordSetId": 99, "questionKey": "meaning", "isCorrect": true }`
**Response** `200 { "ok": true, "removed": false }`

---

## Teacher — User Management

### `GET /api/teacher/users`
Teacher only. List all users with full config.

**Response**
```json
{
  "users": [
    {
      "id": 42, "email": "alice@example.com", "displayName": "Alice",
      "role": "student", "age": 10,
      "passageSource": "TextBook_Harry_Portter",
      "passageWordCount": 150,
      "compQuestionType": "mcq",
      "numComprehension": 2,
      "numBlanks": 5,
      "blankZipfMax": 4.2,
      "enableMcqMeaning": true,
      "enableMcqSynonym": false,
      "enableMcqAntonym": false,
      "enableComprehension": true,
      "enableFillBlank": true,
      "createdAt": "..."
    }
  ]
}
```

---

### `PATCH /api/teacher/users/[id]`
Teacher only. Update a student's profile and/or question-type flags.

**Body** (all fields optional)
```json
{
  "displayName": "Alice",
  "age": 10,
  "passageSource": "TextBook_Harry_Portter",
  "passageWordCount": 150,
  "compQuestionType": "mcq",
  "numComprehension": 2,
  "numBlanks": 5,
  "blankZipfMax": 4.2,
  "enableMcqMeaning": true,
  "enableMcqSynonym": false,
  "enableMcqAntonym": false,
  "enableComprehension": true,
  "enableFillBlank": true
}
```

**Response** `200 { "user": { ... } }`

---

### `DELETE /api/teacher/users/[id]`
Teacher only. Delete a student account (cascades to words and wrong_bank).
**Response** `200 { "ok": true }`

---

## Teacher — SQL Portal

### `POST /api/teacher/sql`
Teacher only. Execute a raw SQL query.

**Body** `{ "sql": "SELECT * FROM words WHERE user_id = 42" }`

Allowed statements: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
Blocked statements: `CREATE`, `DROP`, `ALTER`, `TRUNCATE`, and any other DDL.

**Response**
```json
{
  "rows": [ { "id": 1, "word": "benevolent", ... } ],
  "rowCount": 1
}
```

---

## Error Responses

All error responses follow:
```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request / validation failed |
| `401` | Not authenticated |
| `403` | Insufficient role (e.g. student accessing teacher route) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email on register) |
| `500` | Internal server error |

---

## Auth Middleware Pattern

Every protected route calls `getCurrentUser()` at the top:

```ts
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (user.role !== 'teacher' && user.role !== 'admin') {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```
