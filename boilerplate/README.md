# {{APP_NAME}}

{{APP_DESCRIPTION}}

## Architecture

### Tech Stack
- **Frontend:** React 18, Vite, TailwindCSS
- **Backend:** Go 1.23, AWS Lambda (arm64), HTTP API Gateway
- **Database:** DynamoDB (table: `{{APP_NAME}}`)
- **Hosting:** CloudFront → S3 + Lambda
- **Domain:** {{DOMAIN}}

### SSO Integration

This app uses DSAccount for authentication. See [ds-app-developer](https://github.com/DigiStratum/ds-app-developer) for the canonical `pkg/dsauth` implementation.

## Development

### Prerequisites

- Go 1.23+
- Node.js 20+
- AWS CLI configured
- Access to DSAccount (for SSO)

### Setup

```bash
# Clone
git clone https://github.com/DigiStratum/{{APP_NAME}}.git
cd {{APP_NAME}}

# Backend
cd backend
go mod download

# Frontend
cd frontend
npm install
```

### Running Locally

```bash
# Backend (port 8080)
cd backend && go run ./cmd/api

# Frontend (port 3000)
cd frontend && npm run dev
```

### Testing

```bash
# Backend tests
cd backend && go test ./...

# Frontend tests
cd frontend && npm test

# E2E tests
cd frontend && npm run e2e
```

## Deployment

### Frontend
```bash
cd frontend
npm run build
aws s3 sync dist s3://{{APP_NAME}}-frontend-${AWS_ACCOUNT_ID} --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Backend
```bash
cd backend
GOOS=linux GOARCH=arm64 go build -o bootstrap ./cmd/api
zip -j /tmp/{{APP_NAME}}-lambda.zip bootstrap
aws lambda update-function-code --function-name {{APP_NAME}}-api --zip-file fileb:///tmp/{{APP_NAME}}-lambda.zip
```

### Environment Variables (Lambda)

| Variable | Value | Purpose |
|----------|-------|---------|
| DSACCOUNT_SSO_URL | https://account.digistratum.com | SSO provider URL |
| DSACCOUNT_APP_ID | {{APP_NAME}} | App ID registered in DSAccount |
| DSACCOUNT_APP_SECRET | (secret) | For token exchange |
| DYNAMODB_TABLE | {{APP_NAME}} | Main DynamoDB table |

## Project Structure

```
{{APP_NAME}}/
├── backend/
│   ├── cmd/api/             # Lambda entry point
│   ├── internal/            # Private packages
│   │   ├── api/             # HTTP handlers
│   │   ├── auth/            # Auth middleware
│   │   ├── dynamo/          # DynamoDB repository
│   │   └── ...
│   └── pkg/dsauth/          # SSO validation (copy from ds-app-developer)
├── frontend/
│   └── src/
│       ├── api/             # HTTP client
│       ├── components/      # React components
│       ├── hooks/           # Custom hooks
│       ├── pages/           # Route pages
│       └── ...
└── docs/                    # Documentation
```

## Dependencies

| Dependency | Type | Location | Purpose |
|------------|------|----------|---------|
| DSAccount | Service | https://account.digistratum.com | SSO authentication |
| ds-app-developer | Reference | https://github.com/DigiStratum/ds-app-developer | Shared packages & patterns |

## Documentation

- [AGENTS.md](./AGENTS.md) — AI agent development guidelines
- [REQUIREMENTS.md](./REQUIREMENTS.md) — Application requirements
- [docs/](./docs/) — Detailed documentation

---

*Generated from ds-app-developer boilerplate. See [Creating New Apps](https://github.com/DigiStratum/ds-app-developer#creating-new-apps) for details.*
