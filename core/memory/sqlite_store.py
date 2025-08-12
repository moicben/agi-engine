import sqlite3
from datetime import datetime
from .base import MemoryStore
from ..config import settings

class SQLiteMemoryStore(MemoryStore):
    def __init__(self):
        self.conn = sqlite3.connect(settings.memory_db_path)
        self.conn.execute("CREATE TABLE IF NOT EXISTS memory (session_id TEXT, timestamp TEXT, item TEXT)")

    def put(self, session_id: str, item: str):
        timestamp = datetime.now().isoformat()
        self.conn.execute("INSERT INTO memory VALUES (?, ?, ?)", (session_id, timestamp, item))
        self.conn.commit()

    def query(self, session_id: str, k: int = 5) -> list:
        cursor = self.conn.execute("SELECT item FROM memory WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?", (session_id, k))
        return [row[0] for row in cursor.fetchall()]

    def summarize(self, session_id: str) -> str:
        items = self.query(session_id, k=100)  # arbitrary limit
        return "Summary: " + " | ".join(items[:5])  # basic summarization, improve later
