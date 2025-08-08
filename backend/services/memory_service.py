import sqlite3
from typing import List, Dict, Optional, Any
import os

DB_PATH = os.getenv("MEMORY_DB_PATH", "memory.db")

# Note schema for reference
# id INTEGER PRIMARY KEY AUTOINCREMENT
# ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP
# kind TEXT
# text TEXT
# tags TEXT (nullable, comma-separated)

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Create notes table if not exists
    c.execute('''CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        kind TEXT,
        text TEXT
    )''')
    # Add tags column if missing
    c.execute("PRAGMA table_info(notes)")
    columns = [row[1] for row in c.fetchall()]
    if "tags" not in columns:
        c.execute("ALTER TABLE notes ADD COLUMN tags TEXT")
    # FTS table for search
    c.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(text, content='notes', content_rowid='id')''')
    # Triggers for FTS
    c.execute('''CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, text) VALUES (new.id, new.text);
    END''')
    c.execute('''CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
        UPDATE notes_fts SET text = new.text WHERE rowid = new.id;
    END''')
    c.execute('''CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
        DELETE FROM notes_fts WHERE rowid = old.id;
    END''')
    conn.commit()
    conn.close()

# Add a note
def add_note(kind: str, text: str, tags: Optional[str] = None) -> Dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO notes (kind, text, tags) VALUES (?, ?, ?)", (kind, text, tags))
    note_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_note(note_id)

def get_note(note_id: int) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, ts, kind, text, tags FROM notes WHERE id = ?", (note_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(zip(["id", "ts", "kind", "text", "tags"], row))
    return None

# Update a note
def update_note(id: int, kind: Optional[str] = None, text: Optional[str] = None, tags: Optional[str] = None) -> Optional[Dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    fields = []
    values = []
    if kind is not None:
        fields.append("kind = ?")
        values.append(kind)
    if text is not None:
        fields.append("text = ?")
        values.append(text)
    if tags is not None:
        fields.append("tags = ?")
        values.append(tags)
    if not fields:
        conn.close()
        return None
    values.append(id)
    sql = f"UPDATE notes SET {', '.join(fields)} WHERE id = ?"
    c.execute(sql, tuple(values))
    conn.commit()
    conn.close()
    return get_note(id)

# Delete a note
def delete_note(id: int) -> Dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("DELETE FROM notes WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"ok": True}

# Get stats
def stats() -> Dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT COUNT(*), kind FROM notes GROUP BY kind")
    by_kind = {row[1]: row[0] for row in c.fetchall()}
    c.execute("SELECT COUNT(*) FROM notes")
    count = c.fetchone()[0]
    conn.close()
    return {"count": count, "by_kind": by_kind}

# Export notes
def export_notes() -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, ts, kind, text, tags FROM notes ORDER BY ts DESC")
    notes = [dict(zip(["id", "ts", "kind", "text", "tags"], row)) for row in c.fetchall()]
    conn.close()
    return notes

# Import notes (upsert by id if provided)
def import_notes(notes: List[Dict]) -> Dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    imported = 0
    skipped = 0
    for note in notes:
        id_ = note.get("id")
        kind = note.get("kind")
        text = note.get("text")
        tags = note.get("tags")
        if not kind or not text:
            skipped += 1
            continue
        if id_:
            c.execute("SELECT id FROM notes WHERE id = ?", (id_,))
            if c.fetchone():
                c.execute("UPDATE notes SET kind = ?, text = ?, tags = ? WHERE id = ?", (kind, text, tags, id_))
            else:
                c.execute("INSERT INTO notes (id, kind, text, tags) VALUES (?, ?, ?, ?)", (id_, kind, text, tags))
        else:
            c.execute("INSERT INTO notes (kind, text, tags) VALUES (?, ?, ?)", (kind, text, tags))
        imported += 1
    conn.commit()
    conn.close()
    return {"imported": imported, "skipped": skipped}

# Recent notes (pagination)
def recent_notes(page: int = 1, page_size: int = 25) -> List[Dict]:
    offset = (page - 1) * page_size
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, ts, kind, text, tags FROM notes ORDER BY ts DESC LIMIT ? OFFSET ?", (page_size, offset))
    notes = [dict(zip(["id", "ts", "kind", "text", "tags"], row)) for row in c.fetchall()]
    conn.close()
    return notes

# Search notes
def search_notes(q: str, kind: Optional[str] = None, tags: Optional[str] = None, page: int = 1, page_size: int = 25) -> List[Dict]:
    offset = (page - 1) * page_size
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    sql = "SELECT n.id, n.ts, n.kind, n.text, n.tags FROM notes n JOIN notes_fts fts ON n.id = fts.rowid WHERE fts.text MATCH ?"
    params = [q]
    if kind:
        sql += " AND n.kind = ?"
        params.append(kind)
    if tags:
        sql += " AND n.tags LIKE ?"
        params.append(f"%{tags}%")
    sql += " ORDER BY n.ts DESC LIMIT ? OFFSET ?"
    params.extend([page_size, offset])
    c.execute(sql, tuple(params))
    notes = [dict(zip(["id", "ts", "kind", "text", "tags"], row)) for row in c.fetchall()]
    conn.close()
    return notes

# Call init_db on import
init_db()
