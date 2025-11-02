import sqlite3
import os
from typing import List, Dict, Optional, Any
from datetime import datetime

# Get the project root directory (parent of backend)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORAGE_DIR = os.path.join(PROJECT_ROOT, 'storage')
DB_PATH = os.path.join(STORAGE_DIR, 'memory.db')

def get_conn():
    # Ensure storage directory exists
    os.makedirs(STORAGE_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL;')
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    # Conversations table
    c.execute('''CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        archived BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Add archived column if it doesn't exist (migration)
    try:
        c.execute("SELECT archived FROM conversations LIMIT 1")
    except sqlite3.OperationalError:
        c.execute("ALTER TABLE conversations ADD COLUMN archived BOOLEAN DEFAULT FALSE")
        conn.commit()
    # Messages table
    c.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER,
        role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
        content TEXT NOT NULL,
        ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )''')
    # FTS5 for messages
    c.execute('''CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(content, content='messages', content_rowid='id')''')
    # Triggers for FTS
    c.execute('''CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.id, new.content);
    END''')
    c.execute('''CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
        UPDATE messages_fts SET content = new.content WHERE rowid = new.id;
    END''')
    c.execute('''CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
        DELETE FROM messages_fts WHERE rowid = old.id;
    END''')
    conn.commit()
    conn.close()

def create_conversation(title: Optional[str] = None) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("INSERT INTO conversations (title) VALUES (?)", (title,))
    conv_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_conversation(conv_id)

def get_conversation(conv_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def list_conversations(limit: int = 50, include_archived: bool = False) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    if include_archived:
        c.execute("SELECT * FROM conversations ORDER BY archived ASC, updated_at DESC LIMIT ?", (limit,))
    else:
        c.execute("SELECT * FROM conversations WHERE archived = FALSE OR archived IS NULL ORDER BY updated_at DESC LIMIT ?", (limit,))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_recent_conversations_with_snippets(limit: int = 5) -> List[Dict]:
    """
    Get recent conversations with message snippets for preview.
    Returns only non-archived conversations.
    """
    conn = get_conn()
    c = conn.cursor()
    
    # Get recent conversations
    c.execute("""
        SELECT * FROM conversations 
        WHERE archived = FALSE OR archived IS NULL 
        ORDER BY updated_at DESC 
        LIMIT ?
    """, (limit,))
    
    conversations = [dict(row) for row in c.fetchall()]
    
    # Get last message for each conversation
    for conv in conversations:
        c.execute("""
            SELECT content, role, ts 
            FROM messages 
            WHERE conversation_id = ? 
            ORDER BY ts DESC 
            LIMIT 1
        """, (conv['id'],))
        
        last_msg = c.fetchone()
        if last_msg:
            # Truncate content to first 100 chars for snippet
            content = dict(last_msg)['content']
            snippet = content[:100] + ('...' if len(content) > 100 else '')
            conv['last_message'] = {
                'content': content,
                'snippet': snippet,
                'role': dict(last_msg)['role'],
                'timestamp': dict(last_msg)['ts']
            }
        else:
            conv['last_message'] = None
    
    conn.close()
    return conversations

def archive_conversation(conv_id: int) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE conversations SET archived = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return get_conversation(conv_id)

def unarchive_conversation(conv_id: int) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE conversations SET archived = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return get_conversation(conv_id)

def rename_conversation(conv_id: int, title: str) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("UPDATE conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (title, conv_id))
    conn.commit()
    conn.close()
    return get_conversation(conv_id)

def delete_conversation(conv_id: int) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()
    return {"ok": True}

def get_messages(conversation_id: int, limit: int = 200, asc: bool = True) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    order = "ASC" if asc else "DESC"
    c.execute(f"SELECT * FROM messages WHERE conversation_id = ? ORDER BY ts {order} LIMIT ?", (conversation_id, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_message(conversation_id: int, role: str, content: str) -> Dict:
    conn = get_conn()
    c = conn.cursor()
    c.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", (conversation_id, role, content))
    c.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conversation_id,))
    msg_id = c.lastrowid
    conn.commit()
    conn.close()
    return get_message(msg_id)

def get_message(msg_id: int) -> Optional[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM messages WHERE id = ?", (msg_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def search_messages(q: str, limit: int = 100) -> List[Dict]:
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT m.conversation_id, m.id as message_id, m.content as snippet, m.ts FROM messages_fts fts JOIN messages m ON fts.rowid = m.id WHERE fts.content MATCH ? ORDER BY m.ts DESC LIMIT ?", (q, limit))
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

init_db()
