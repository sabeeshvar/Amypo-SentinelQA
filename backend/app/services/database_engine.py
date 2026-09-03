import sqlite3
import os
import re
import time
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path
from app.config import settings

class LocalDatabaseEngine:
    """PS7: Offline SQL Database Introspection and Safe Execution Engine."""
    def __init__(self, db_path: str = settings.SAMPLE_DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._ensure_sample_database()

    def _ensure_sample_database(self):
        """Creates a rich, realistic local SQLite business database for PS7 if not present."""
        if not os.path.exists(self.db_path) or os.path.getsize(self.db_path) == 0:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Create tables: employees, servers, incident_tickets, cost_centers
            cursor.executescript("""
            CREATE TABLE IF NOT EXISTS servers (
                server_id TEXT PRIMARY KEY,
                hostname TEXT NOT NULL,
                ip_address TEXT UNIQUE NOT NULL,
                datacenter_region TEXT NOT NULL,
                os_version TEXT NOT NULL,
                ram_gb INTEGER NOT NULL,
                cpu_cores INTEGER NOT NULL,
                status TEXT NOT NULL, -- 'ONLINE', 'MAINTENANCE', 'DEGRADED', 'DECOMMISSIONED'
                uptime_days INTEGER NOT NULL,
                monthly_cost_usd REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS incident_tickets (
                ticket_id TEXT PRIMARY KEY,
                server_id TEXT,
                severity TEXT NOT NULL, -- 'P1-CRITICAL', 'P2-HIGH', 'P3-MEDIUM', 'P4-LOW'
                title TEXT NOT NULL,
                status TEXT NOT NULL, -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
                assigned_engineer TEXT NOT NULL,
                created_at TEXT NOT NULL,
                resolved_at TEXT,
                resolution_time_hrs REAL,
                FOREIGN KEY (server_id) REFERENCES servers(server_id)
            );

            CREATE TABLE IF NOT EXISTS security_compliance_audits (
                audit_id TEXT PRIMARY KEY,
                server_id TEXT,
                compliance_framework TEXT NOT NULL, -- 'SOC2', 'HIPAA', 'ISO27001', 'PCI-DSS'
                vulnerability_score REAL NOT NULL, -- 0.0 to 10.0
                patch_status TEXT NOT NULL, -- 'COMPLIANT', 'PENDING_PATCH', 'NON_COMPLIANT'
                last_scanned TEXT NOT NULL,
                FOREIGN KEY (server_id) REFERENCES servers(server_id)
            );

            -- Seed Realistic Data
            INSERT OR REPLACE INTO servers VALUES
            ('SRV-101', 'prod-db-primary-us-east', '10.0.1.15', 'us-east-1', 'Ubuntu 22.04 LTS', 128, 32, 'ONLINE', 245, 1450.00),
            ('SRV-102', 'prod-db-replica-us-east', '10.0.1.16', 'us-east-1', 'Ubuntu 22.04 LTS', 128, 32, 'ONLINE', 180, 1450.00),
            ('SRV-103', 'prod-api-gateway-01', '10.0.2.10', 'us-east-1', 'Debian 12', 64, 16, 'ONLINE', 89, 620.00),
            ('SRV-104', 'prod-api-gateway-02', '10.0.2.11', 'us-east-1', 'Debian 12', 64, 16, 'DEGRADED', 12, 620.00),
            ('SRV-105', 'eu-app-cluster-01', '10.1.5.20', 'eu-central-1', 'RHEL 9.2', 64, 16, 'ONLINE', 310, 780.00),
            ('SRV-106', 'eu-app-cluster-02', '10.1.5.21', 'eu-central-1', 'RHEL 9.2', 64, 16, 'MAINTENANCE', 0, 780.00),
            ('SRV-107', 'apac-cache-redis-01', '10.2.3.8', 'ap-southeast-1', 'Alpine Linux', 32, 8, 'ONLINE', 142, 340.00),
            ('SRV-108', 'analytics-spark-worker-01', '10.0.9.50', 'us-east-1', 'Ubuntu 22.04 LTS', 256, 64, 'ONLINE', 45, 2900.00);

            INSERT OR REPLACE INTO incident_tickets VALUES
            ('INC-4091', 'SRV-104', 'P1-CRITICAL', 'Memory leak causing packet loss in API Gateway 02', 'IN_PROGRESS', 'Alex Chen', '2026-08-30 14:20:00', NULL, NULL),
            ('INC-4088', 'SRV-106', 'P2-HIGH', 'Kernel security patch update required reboot', 'RESOLVED', 'Maria Garcia', '2026-08-28 09:15:00', '2026-08-28 11:30:00', 2.25),
            ('INC-4075', 'SRV-101', 'P3-MEDIUM', 'Slow query execution on user profile table', 'RESOLVED', 'Alex Chen', '2026-08-20 16:00:00', '2026-08-20 18:45:00', 2.75),
            ('INC-4062', 'SRV-107', 'P4-LOW', 'SSL Certificate expiry warning (14 days)', 'RESOLVED', 'David Kim', '2026-08-15 10:00:00', '2026-08-15 10:30:00', 0.50),
            ('INC-4100', 'SRV-108', 'P2-HIGH', 'Spark job out-of-memory during nightly ETL', 'OPEN', 'Sarah Jenkins', '2026-09-02 02:15:00', NULL, NULL);

            INSERT OR REPLACE INTO security_compliance_audits VALUES
            ('AUD-801', 'SRV-101', 'SOC2', 0.2, 'COMPLIANT', '2026-08-15'),
            ('AUD-802', 'SRV-101', 'HIPAA', 0.0, 'COMPLIANT', '2026-08-15'),
            ('AUD-803', 'SRV-104', 'SOC2', 6.8, 'PENDING_PATCH', '2026-08-30'),
            ('AUD-804', 'SRV-106', 'ISO27001', 1.5, 'COMPLIANT', '2026-08-28'),
            ('AUD-805', 'SRV-107', 'PCI-DSS', 0.5, 'COMPLIANT', '2026-08-10'),
            ('AUD-806', 'SRV-108', 'SOC2', 4.2, 'PENDING_PATCH', '2026-09-01');
            """)
            conn.commit()
            conn.close()
            print(f"[DatabaseEngine] Seeded local SQLite sample database at {self.db_path}")

    def get_schema_summary(self) -> str:
        """Extracts table names, column structures, and foreign keys."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = cursor.fetchall()
            
            schema_lines = []
            for (table_name,) in tables:
                cursor.execute(f"PRAGMA table_info({table_name});")
                cols = cursor.fetchall()
                col_strs = [f"{c[1]} ({c[2]})" for c in cols]
                schema_lines.append(f"Table '{table_name}': " + ", ".join(col_strs))
            
            conn.close()
            return "\n".join(schema_lines)
        except Exception as e:
            return f"Error reading schema: {e}"

    def get_table_preview(self, table_name: str, limit: int = 5) -> Dict[str, Any]:
        """Returns column names and first few rows of a table."""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info({table_name});")
            cols = [c[1] for c in cursor.fetchall()]
            
            cursor.execute(f"SELECT * FROM {table_name} LIMIT {limit};")
            rows = cursor.fetchall()
            conn.close()
            return {"columns": cols, "rows": rows}
        except Exception as e:
            return {"error": str(e), "columns": [], "rows": []}

    def execute_safe_query(self, query: str) -> Tuple[List[str], List[List[Any]], Optional[str]]:
        """Executes read-only SQL queries with guardrails preventing destructive commands."""
        # Sanitize query: allow only SELECT
        cleaned = query.strip().rstrip(";")
        forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "ATTACH", "DETACH", "PRAGMA"]
        
        for token in forbidden:
            if re.search(rf"\b{token}\b", cleaned, re.IGNORECASE):
                return [], [], f"Security Violation: Destructive command '{token}' is blocked in read-only offline database mode."

        if not cleaned.upper().startswith("SELECT") and not cleaned.upper().startswith("WITH"):
            return [], [], "Security Violation: Only SELECT/CTE queries are permissible."

        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(cleaned)
            rows_data = cursor.fetchall()
            
            if rows_data:
                columns = list(rows_data[0].keys())
                rows = [list(r) for r in rows_data]
            else:
                columns = [d[0] for d in cursor.description] if cursor.description else []
                rows = []
                
            conn.close()
            return columns, rows, None
        except Exception as e:
            return [], [], str(e)

database_engine = LocalDatabaseEngine()
