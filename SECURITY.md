# Security

## How credentials are handled

- Every server reads platform credentials **only from environment variables** set by your MCP client config. Nothing is written to disk, logged, or sent anywhere except the platform's own API host.
- Access tokens are held in process memory and refreshed before expiry.
- The Naver Commerce client secret is a bcrypt salt; it is used locally to sign the token request and never transmitted.

## Write tools

Tools that change live data (`*_update_*`, `*_create_*`, `*_send_*`) are annotated with `destructiveHint: true` and accept an `approveWrite` hook so a client or an external approval service can require human confirmation before they run.

## Reporting a vulnerability

Email **security@appmonster.co.kr** with details. Please do not open a public issue for security reports. You will get a reply within 3 business days.

## Data retention

The local (stdio) servers retain nothing. The hosted gateway (when available) keeps per-request logs for 30 days for billing and debugging; request/response bodies are not stored.
