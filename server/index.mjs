import express from 'express';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// --- Database ---
const dataDir = path.join(__dirname, 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'tennis.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS _config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// --- JWT Secret (persisted in DB) ---
const getConfig = db.prepare('SELECT value FROM _config WHERE key = ?');
const setConfig = db.prepare('INSERT OR REPLACE INTO _config (key, value) VALUES (?, ?)');

let jwtSecret;
const row = getConfig.get('jwt_secret');
if (row) {
  jwtSecret = row.value;
} else {
  jwtSecret = randomBytes(64).toString('hex');
  setConfig.run('jwt_secret', jwtSecret);
}

// --- Prepared Statements ---
const stmts = {
  insertUser: db.prepare('INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserById: db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?'),
  listTournaments: db.prepare(`
    SELECT id,
      json_extract(data, '$.name') as name,
      json_extract(data, '$.type') as type,
      json_extract(data, '$.status') as status,
      json_extract(data, '$.createdAt') as createdAt,
      updated_at
    FROM tournaments WHERE user_id = ? ORDER BY updated_at DESC
  `),
  getTournament: db.prepare('SELECT data FROM tournaments WHERE id = ? AND user_id = ?'),
  insertTournament: db.prepare('INSERT INTO tournaments (id, user_id, data) VALUES (?, ?, ?)'),
  updateTournament: db.prepare("UPDATE tournaments SET data = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"),
  deleteTournament: db.prepare('DELETE FROM tournaments WHERE id = ? AND user_id = ?'),
};

// --- Auth Middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: '認証が必要です' });
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'トークンが無効です' });
  }
}

// --- Express ---
const app = express();
app.use(express.json({ limit: '10mb' }));

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { username, password, displayName } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'ユーザー名とパスワードは必須です' });
  if (username.length < 2) return res.status(400).json({ error: 'ユーザー名は2文字以上必要です' });
  if (password.length < 4) return res.status(400).json({ error: 'パスワードは4文字以上必要です' });

  if (stmts.getUserByUsername.get(username)) {
    return res.status(409).json({ error: 'このユーザー名は既に使われています' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = stmts.insertUser.run(username, displayName || username, hash);
  const token = jwt.sign({ userId: result.lastInsertRowid }, jwtSecret, { expiresIn: '30d' });

  res.status(201).json({
    token,
    user: { id: result.lastInsertRowid, username, displayName: displayName || username },
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = stmts.getUserByUsername.get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'ユーザー名またはパスワードが正しくありません' });
  }
  const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '30d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, displayName: user.display_name },
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = stmts.getUserById.get(req.userId);
  if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
  res.json({ id: user.id, username: user.username, displayName: user.display_name });
});

// Tournament routes
app.get('/api/tournaments', auth, (req, res) => {
  res.json(stmts.listTournaments.all(req.userId));
});

app.get('/api/tournaments/:id', auth, (req, res) => {
  const row = stmts.getTournament.get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: '大会が見つかりません' });
  res.json(JSON.parse(row.data));
});

app.post('/api/tournaments', auth, (req, res) => {
  const tournament = req.body;
  if (!tournament.id) return res.status(400).json({ error: '大会IDが必要です' });
  if (!tournament.name || !tournament.name.trim()) return res.status(400).json({ error: '大会名が必要です' });
  try {
    stmts.insertTournament.run(tournament.id, req.userId, JSON.stringify(tournament));
    res.status(201).json(tournament);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'この大会は既に存在します' });
    throw e;
  }
});

app.put('/api/tournaments/:id', auth, (req, res) => {
  const result = stmts.updateTournament.run(JSON.stringify(req.body), req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '大会が見つかりません' });
  res.json(req.body);
});

app.delete('/api/tournaments/:id', auth, (req, res) => {
  const result = stmts.deleteTournament.run(req.params.id, req.userId);
  if (result.changes === 0) return res.status(404).json({ error: '大会が見つかりません' });
  res.status(204).end();
});

// --- AI Parse (Local LLM via Ollama) ---
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

app.post('/api/ai/parse-tournament', auth, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'テキストが必要です' });

  const systemPrompt = `テニス大会の設定情報をテキストから抽出してJSONで返せ。以下のフィールドを抽出する。不明なフィールドはnullにせよ。

必ず以下のJSON形式のみを返せ。説明文は不要。

{
  "name": "大会名（string or null）",
  "type": "singles, doubles, team のいずれか（string or null）",
  "format": "swiss, single_elimination, round_robin_knockout のいずれか（string or null）",
  "totalRounds": "ラウンド数（number or null）、スイスドローの場合のみ",
  "setsPerMatch": "セット数（number or null）、1, 3, 5のいずれか",
  "gamesPerSet": "1セットあたりのゲーム数（number or null）",
  "maxParticipants": "定員（number or null）",
  "participants": ["参加者名の配列（string[] or null）"],
  "thirdPlaceMatch": "3位決定戦の有無（boolean or null）",
  "hasConsolation": "コンソレーションの有無（boolean or null）",
  "groupSize": "グループの人数（number or null）、リーグ→トーナメント形式の場合",
  "advancingPerGroup": "各グループ通過人数（number or null）"
}

注意:
- "ダブルス"と言われたら type は "doubles"
- "トーナメント"と言われたら format は "single_elimination"
- "リーグ戦"と言われたら format は "round_robin_knockout"
- "スイスドロー"と言われたら format は "swiss"
- "団体"と言われたら type は "team"
- 人名が列挙されていたら participants に入れる
- "、"や"/"や改行で区切られた名前を個別に分割する
- JSONのみ返せ。前後に説明文をつけるな`;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'gpt-oss:20b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0.1,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      return res.status(502).json({ error: `LLMエラー: ${ollamaRes.status}`, detail: err });
    }

    const data = await ollamaRes.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
    if (jsonMatch) content = jsonMatch[1];

    try {
      const parsed = JSON.parse(content.trim());
      res.json({ parsed, raw: content });
    } catch {
      res.status(422).json({ error: 'LLMの応答をパースできませんでした', raw: content });
    }
  } catch (e) {
    if (e.name === 'TimeoutError') {
      return res.status(504).json({ error: 'LLMがタイムアウトしました（60秒）' });
    }
    res.status(502).json({ error: `LLM接続エラー: ${e.message}` });
  }
});

// Static files (built frontend)
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handler — prevent stack trace leakage
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'リクエストの形式が不正です' });
  }
  console.error(err);
  res.status(500).json({ error: 'サーバーエラー' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Tennis Matchmaker server on port ${PORT}`);
});
