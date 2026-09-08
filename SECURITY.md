# Security

Please report vulnerabilities through GitHub's private vulnerability reporting for this repository. Do not include private media, recording links, family data, or credentials in a public issue.

Deployers should use HTTPS, a dedicated PostgreSQL database, a **Private** Blob store, strong stable secrets, backups, and `ALLOWED_EMAILS` for private installations. Share links and guest recording links are bearer capabilities: treat them as secrets.

Heirloom encrypts saved personal AI keys at rest but does not provide end-to-end encryption. The operator of a deployment controls the server secret and can access data. Only enter keys into a deployment you trust.
