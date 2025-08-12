import pytest
from core.graph.graph import app

def test_graph_invoke():
    state = {"query": "test query", "session_id": "test"}
    result = app.invoke(state)
    assert "artifacts" in result
