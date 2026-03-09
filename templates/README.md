# DS App: {{APP_NAME}}

A DigiStratum application deployed at {{DOMAIN}}.

## Structure

```
├── backend/           # Go Lambda backend
│   ├── cmd/api/       # Lambda entry point
│   ├── internal/      # Business logic
│   └── pkg/dsauth/    # SSO validation
├── frontend/          # React frontend
│   └── src/
└── cdk/               # AWS CDK infrastructure
```

## Prerequisites

- **Go** 1.21+
- **Node.js** 20+
- **golangci-lint** (`brew install golangci-lint`)
- **AWS CLI** configured with credentials

## Development

```bash
# Backend
cd backend && go run ./cmd/api

# Frontend
cd frontend && npm install && npm run dev
```

### Local Build & Test (Pre-Push Check)

Run these before pushing to catch CI failures locally:

```bash
# Backend: lint + unit tests
cd backend && golangci-lint run ./... && go test $(go list ./... | grep -v /test/integration)

# Frontend: lint + build
cd frontend && npm run lint && npm run build
```

Or as a one-liner from repo root:

```bash
(cd backend && golangci-lint run ./... && go test $(go list ./... | grep -v /test/integration)) && \
(cd frontend && npm run lint && npm run build)
```

## Deployment

Deployment is automatic via GitHub Actions on push to `main`.

### Manual Deployment

**Frontend:**
```bash
cd frontend && npm run build
aws s3 sync dist s3://{{APP_NAME}}-frontend-{{ACCOUNT_ID}} --delete
aws cloudfront create-invalidation --distribution-id {{CLOUDFRONT_ID}} --paths "/*"
```

**Backend:**
```bash
cd backend
GOOS=linux GOARCH=arm64 go build -o bootstrap ./cmd/api
zip -j /tmp/lambda.zip bootstrap
aws lambda update-function-code --function-name {{APP_NAME}}-api --zip-file fileb:///tmp/lambda.zip
```

## SSO Integration

This app uses DigiStratum SSO via DSAccount. The `ds_session` cookie (shared across *.digistratum.com) handles authentication.

**Key endpoints:**
- `GET /api/auth/login` — Initiates SSO login
- `GET /api/auth/callback` — OAuth callback
- `GET /api/session` — Returns current session state

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DSACCOUNT_SSO_URL` | SSO provider URL |
| `DSACCOUNT_APP_ID` | App ID registered in DSAccount |
| `DSACCOUNT_APP_SECRET` | For token exchange (stored in AWS Secrets Manager) |
| `DYNAMODB_TABLE` | Main DynamoDB table name |
