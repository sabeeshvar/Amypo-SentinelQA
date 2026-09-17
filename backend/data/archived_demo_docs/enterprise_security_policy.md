# Enterprise Cybersecurity & Access Control Policy (POL-SEC-2026)

## 1. Authentication & Access Governance
1.1. **Multi-Factor Authentication (MFA)**: MFA is mandatory for all employee and contractor accounts accessing corporate networks, VPNs, and production infrastructure. SMS-based authentication is strictly prohibited; hardware security keys (FIDO2) or TOTP authenticator apps must be used.
1.2. **Password Rotation**: Master passwords must contain at least 16 characters with uppercase, lowercase, numbers, and symbols. Passwords must be rotated every 90 days. Accounts are locked after 5 consecutive failed login attempts.
1.3. **Zero Trust Network Access (ZTNA)**: Access to internal production databases (e.g. SRV-101, SRV-102) requires ephemeral bastion credentials with a maximum session time of 4 hours.

## 2. Data Encryption & Storage Standards
2.1. **Data at Rest**: All databases, object storage buckets, and server volumes must be encrypted using AES-256 or ChaCha20-Poly1305. Unencrypted data storage in production environments constitutes a P1 security violation.
2.2. **Data in Transit**: All API communication and internal RPCs must mandate TLS 1.3. TLS 1.0 and 1.1 are completely disabled across all edge gateways.
2.3. **Data Retention**: Customer transaction records must be retained for 7 years to comply with financial regulatory standards. Internal system audit logs must be retained for 365 days in immutable cold storage.

## 3. Security Incident Response SLAs
3.1. **Severity Classification**:
- **P1 (Critical)**: Active security breach, unauthorized root access, or total outage of production payment gateway. Response SLA: 15 minutes. Resolution target: 4 hours.
- **P2 (High)**: Degraded security posture, critical unpatched CVE with public exploit, or single redundant server failure. Response SLA: 1 hour. Resolution target: 12 hours.
- **P3 (Medium)**: Non-exploitable vulnerability or minor bug. Response SLA: 8 hours.
- **P4 (Low)**: Informational advisory or minor SSL cert renewal notice. Response SLA: 24 hours.
