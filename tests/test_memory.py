import pytest
from core.memory.sqlite_store import SQLiteMemoryStore

@pytest.fixture
def store():
    return SQLiteMemoryStore()

def test_put_query(store):
    store.put("test", "item1")
    assert "item1" in store.query("test", 1)
