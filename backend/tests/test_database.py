import pytest
from app.services.database_engine import database_engine

def test_database_initialization_and_schema():
    schema = database_engine.get_schema_summary()
    assert "servers" in schema
    assert "incident_tickets" in schema
    assert "security_compliance_audits" in schema

def test_safe_select_query_execution():
    sql = "SELECT server_id, hostname, status FROM servers WHERE status = 'ONLINE';"
    cols, rows, err = database_engine.execute_safe_query(sql)
    assert err is None
    assert "server_id" in cols
    assert len(rows) > 0

def test_destructive_query_blocked_guardrail():
    destructive_sql = "DROP TABLE servers;"
    cols, rows, err = database_engine.execute_safe_query(destructive_sql)
    assert err is not None
    assert "Security Violation" in err
    assert len(rows) == 0

def test_non_select_blocked_guardrail():
    update_sql = "UPDATE servers SET status = 'OFFLINE' WHERE server_id = 'SRV-101';"
    cols, rows, err = database_engine.execute_safe_query(update_sql)
    assert err is not None
    assert "Security Violation" in err
