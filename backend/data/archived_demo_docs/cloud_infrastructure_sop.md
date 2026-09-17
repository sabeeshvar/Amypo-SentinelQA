# Cloud Infrastructure & Disaster Recovery Standard Operating Procedure (SOP-OPS-88)

## 1. Automated Backups & Disaster Recovery (DR)
1.1. **Snapshot Cadence**: Automated full database snapshots for PostgreSQL and SQLite cluster replicas execute every 6 hours. Write-Ahead Logs (WAL) are streamed continuously to secondary storage with a Recovery Point Objective (RPO) of under 5 minutes.
1.2. **Disaster Recovery Failover**: In the event of an unrecoverable failure in the primary region (`us-east-1`), traffic will automatically failover via DNS Route53 health checks to the secondary region (`eu-central-1` or `us-west-2`). The Recovery Time Objective (RTO) is guaranteed within 15 minutes.
1.3. **Quarterly DR Drill**: Disaster recovery simulated failover drills are executed on the first Sunday of every quarter at 02:00 UTC.

## 2. Server Resource Thresholds & Auto-Scaling
2.1. **CPU & Memory Scaling**: Horizontal Pod Autoscalers (HPA) trigger replica scale-outs when average CPU utilization exceeds 75% or memory utilization exceeds 80% for 3 consecutive minutes.
2.2. **Degraded Server Protocol**: Any server reporting packet loss above 2% or disk I/O wait times over 500ms is automatically marked as 'DEGRADED' and removed from the active load balancer pool.
2.3. **Maximum Fleet Capacity**: The production cluster is capped at a maximum of 40 active nodes to prevent runaway cloud expenditures unless an emergency override is authorized by the VP of Engineering.
