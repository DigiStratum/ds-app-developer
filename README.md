# DS App Skeleton

A template repository providing the standard foundation for new DigiStratum applications.

## Features

- **Go backend** with Chi-style routing on AWS Lambda
- **SSO authentication** via DSAccount integration
- **Session management** using DynamoDB
- **React/Vite frontend** with Tailwind CSS v4
- **DSNav component** for cross-app navigation
- **AWS CDK infrastructure** as code
- **GitHub Actions CI/CD** pipeline
- **Standard DS branding** and patterns

## Quick Start

### 1. Create Your App from Template

```bash
gh repo create DigiStratum/my-new-app --template DigiStratum/ds-app-skeleton --public
git clone https://github.com/DigiStratum/my-new-app.git
cd my-new-app
```

### 2. Configure Your App

1. **Update module names:**
   - `backend/go.mod`: Change `github.com/digistratum/ds-app-skeleton` to your module
   - `infra/lib/app-stack.ts`: Update stack name and resources
   - `frontend/package.json`: Update name

2. **Set up secrets in AWS Secrets Manager:**
   - `myapp/jwt-secret`: `{"JWT_SECRET":"your-secret","SSO_APP_SECRET":"from-dsaccount"}`

3. **Configure GitHub secrets:**
   - `AWS_ROLE_ARN`: IAM role ARN for OIDC deployment

4. **Register your app in DSAccount:**
   - Create app entry to get `app_id` and `app_secret`

### 3. Local Development

**Backend:**
```bash
cd backend
go mod tidy
DYNAMODB_TABLE=myapp-dev JWT_SECRET=dev-secret go run ./cmd/local
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. Deploy

```bash
cd infra
npm install
npx cdk deploy --context env=dev
```

## Project Structure

```
ds-app-skeleton/
├── backend/
│   ├── cmd/
│   │   ├── lambda/main.go      # Lambda entry point
│   │   └── local/main.go       # Local dev server
│   ├── internal/
│   │   ├── api/                # HTTP handlers & routing
│   │   ├── auth/               # Session management
│   │   ├── sso/                # DSAccount SSO client
│   │   └── repository/         # DynamoDB data access
│   ├── scripts/
│   │   └── build.sh            # Build script
│   └── go.mod
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DSNav/          # Shared navigation
│   │   ├── hooks/
│   │   │   └── useAuth.ts      # Auth hook
│   │   ├── services/
│   │   │   └── auth.ts         # Auth service
│   │   └── App.tsx             # Main app
│   ├── package.json
│   └── vite.config.ts
├── infra/
│   ├── lib/
│   │   ├── app-stack.ts        # CDK stack
│   │   └── edge-functions/     # CloudFront functions
│   └── package.json
├── .github/
│   └── workflows/
│       └── ci-cd.yml           # CI/CD pipeline
└── README.md
```

## Authentication Flow

1. User visits `/api/auth/sso` → redirected to DSAccount
2. DSAccount authenticates → redirects back with code
3. Backend exchanges code for token via `/api/sso/token`
4. Session created in DynamoDB with secure cookie
5. Frontend calls `/api/auth/me` to get user info

## Environment Variables

### Backend (Lambda)
| Variable | Description |
|----------|-------------|
| `DYNAMODB_TABLE` | DynamoDB table name |
| `JWT_SECRET` | Secret for JWT signing |
| `SSO_DSACCOUNT_URL` | DSAccount API URL |
| `SSO_APP_ID` | Your app's ID in DSAccount |
| `SSO_APP_SECRET` | Your app's secret from DSAccount |
| `SSO_REDIRECT_URI` | OAuth callback URL |

### Frontend (Build-time)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | API base URL (empty for same-origin) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/sso` | Initiate SSO login |
| GET | `/api/auth/sso/callback` | SSO callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | End session |
| POST | `/api/auth/refresh` | Refresh session |

## Customization

### Adding New Endpoints

1. Add handler in `backend/internal/api/handler.go`
2. Register route in `RegisterRoutes()`
3. Add repository method if needed

### Adding New Components

1. Create component in `frontend/src/components/`
2. Import in `App.tsx` or parent component
3. Add route if needed

### Modifying Infrastructure

1. Edit `infra/lib/app-stack.ts`
2. Run `npx cdk diff --context env=dev` to preview
3. Deploy with `npx cdk deploy`

## License

© 2016 - 2026 DigiStratum, LLC. All rights reserved.
