import pytest
from core.graph.graph import app

@pytest.mark.asyncio
async def test_identity_payment():
    state = {"query": "Extract identity then process payment", "session_id": "e2e1"}
    result = app.invoke(state)
    assert "artifacts" in result

@pytest.mark.asyncio
async def test_whatsapp_send():
    state = {"query": "Send WhatsApp message", "session_id": "e2e2"}
    result = app.invoke(state)
    assert "artifacts" in result
