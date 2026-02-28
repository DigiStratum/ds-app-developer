# Security Standards - DS App Developer

> Comprehensive security standards for all DigiStratum applications.
> Based on OWASP Top 10 (2021) compliance requirements.
> Applications based on ds-app-developer inherit these patterns.

---

## Table of Contents
1. [OWASP Top 10 Compliance](#owasp-top-10-compliance)
2. [Input Validation](#input-validation)
3. [Output Encoding](#output-encoding)
4. [CORS Configuration](#cors-configuration)
5. [Content Security Policy](#content-security-policy)
6. [Secrets Management](#secrets-management)
7. [Dependency Scanning](#dependency-scanning)
8. [Security Checklist](#security-checklist)

---

## OWASP Top 10 Compliance

### Requirements Traceability

| Requirement | Description | Status |
|-------------|-------------|--------|
| NFR-SEC-001 | OWASP Top 10 compliance | 🚧 In Progress |
| NFR-SEC-002 | All data encrypted in transit (TLS 1.2+) | ✅ Implemented |
| NFR-SEC-003 | Secrets stored in AWS Secrets Manager | ✅ Implemented |
| NFR-SEC-004 | Input validation on all endpoints | ⚠️ Partial |
| NFR-SEC-005 | CORS configured for allowed origins only | ✅ Implemented |

### A01:2021 – Broken Access Control

**Risk:** Users acting outside their intended permissions.

**Mitigations:**
- ✅ Deny by default for all API endpoints
- ✅ Authentication required via DSAccount SSO
- ✅ Tenant isolation enforced at data layer
- ✅ All DynamoDB queries scoped to tenant partition key
- ⚠️ Rate limiting on authentication endpoints (TODO)

**Implementation:**
```go
// backend/internal/auth/middleware.go
func RequireAuth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        session, err := validateSession(r)
        if err != nil {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }
        // Inject session into context for tenant-scoped queries
        ctx := context.WithValue(r.Context(), SessionKey, session)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// All data access uses tenant from session
func (r *Repository) GetItems(ctx context.Context) ([]Item, error) {
    session := ctx.Value(SessionKey).(*Session)
    // Query is automatically scoped to tenant
    return r.queryByTenant(session.TenantID)
}
```

### A02:2021 – Cryptographic Failures

**Risk:** Exposure of sensitive data due to weak or missing cryptography.

**Mitigations:**
- ✅ TLS 1.2+ enforced via CloudFront
- ✅ HTTPS-only cookies in production
- ✅ Secrets stored in AWS Secrets Manager (never in code)
- ✅ JWT tokens validated with proper signature verification
- ✅ DynamoDB encryption at rest (AWS managed keys)

**Cookie Configuration:**
```go
// Secure cookie settings
http.SetCookie(w, &http.Cookie{
    Name:     "ds_session",
    Value:    sessionToken,
    HttpOnly: true,                    // Prevent XSS access
    Secure:   env != "development",    // HTTPS only in prod
    SameSite: http.SameSiteLaxMode,    // CSRF protection
    Path:     "/",
    MaxAge:   86400,                   // 24 hours
})
```

### A03:2021 – Injection

**Risk:** SQL, NoSQL, OS, or LDAP injection attacks.

**Mitigations:**
- ✅ DynamoDB uses parameterized expressions (no raw queries)
- ✅ No SQL databases in architecture
- ✅ Input validation on all user-provided data
- ✅ No shell command execution from user input

**DynamoDB Safe Query Pattern:**
```go
// Always use expression builders - never string concatenation
input := &dynamodb.QueryInput{
    TableName:              aws.String(tableName),
    KeyConditionExpression: aws.String("PK = :pk AND begins_with(SK, :sk)"),
    ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
        ":pk": {S: aws.String(tenantID)},      // Parameterized
        ":sk": {S: aws.String("ITEM#")},       // Parameterized
    },
}
```

### A04:2021 – Insecure Design

**Risk:** Missing or ineffective control design.

**Mitigations:**
- ✅ Security requirements defined in REQUIREMENTS.md
- ✅ Threat modeling for authentication flows
- ✅ Secure defaults (deny by default, fail closed)
- ✅ Multi-tenant isolation by design

**Design Principles:**
1. Defense in depth (multiple security layers)
2. Least privilege (minimal permissions)
3. Fail secure (errors deny access, not grant)
4. Separation of duties (auth vs. data access)

### A05:2021 – Security Misconfiguration

**Risk:** Missing or incorrect security hardening.

**Mitigations:**
- ✅ CDK infrastructure as code (repeatable, auditable)
- ✅ Minimal IAM permissions for Lambda
- ✅ CloudFront security headers configured
- ✅ No debug information exposed in production
- ✅ CORS restricted to allowed origins

**CDK Security Configuration:**
```typescript
// cdk/lib/constructs/api-lambda.ts
const lambdaRole = new iam.Role(this, 'LambdaRole', {
    assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    // Minimal permissions
    managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole'
        ),
    ],
});

// Only the specific table, not dynamodb:*
table.grantReadWriteData(lambdaRole);
```

### A06:2021 – Vulnerable and Outdated Components

**Risk:** Known vulnerabilities in dependencies.

**Mitigations:**
- ✅ Dependabot enabled for automated updates
- ✅ npm audit in CI pipeline
- ✅ govulncheck for Go vulnerabilities
- ✅ Regular dependency updates (at least monthly)

See [Dependency Scanning](#dependency-scanning) for detailed configuration.

### A07:2021 – Identification and Authentication Failures

**Risk:** Weak authentication implementation.

**Mitigations:**
- ✅ Centralized authentication via DSAccount SSO
- ✅ No custom password storage
- ✅ Session tokens with expiration
- ✅ HttpOnly cookies prevent token theft
- ⚠️ Rate limiting on auth endpoints (TODO)

**Session Validation:**
```go
func validateSession(r *http.Request) (*Session, error) {
    cookie, err := r.Cookie("ds_session")
    if err != nil {
        return nil, ErrNoSession
    }
    
    // Validate token signature and expiration
    claims, err := verifyToken(cookie.Value)
    if err != nil {
        return nil, ErrInvalidToken
    }
    
    // Check expiration
    if time.Now().After(claims.ExpiresAt) {
        return nil, ErrExpiredToken
    }
    
    return &Session{
        UserID:   claims.UserID,
        TenantID: claims.TenantID,
    }, nil
}
```

### A08:2021 – Software and Data Integrity Failures

**Risk:** Code and infrastructure without integrity verification.

**Mitigations:**
- ✅ Signed commits recommended
- ✅ Branch protection on main
- ✅ CI/CD pipeline validates all changes
- ✅ CDK diff review before deployment
- ✅ Canary deployment with automatic rollback

### A09:2021 – Security Logging and Monitoring Failures

**Risk:** Insufficient logging for security events.

**Mitigations:**
- ✅ Structured logging to CloudWatch
- ✅ Request correlation IDs
- ⚠️ Authentication event logging (partial)
- ⚠️ Security alerts on anomalies (TODO)

**Logging Pattern:**
```go
// Log security events without sensitive data
log.Info("auth_event",
    "event", "login_success",
    "user_id", session.UserID,
    "tenant_id", session.TenantID,
    "correlation_id", r.Header.Get("X-Request-ID"),
    // Never log: tokens, passwords, full session data
)

// Log security failures
log.Warn("auth_event",
    "event", "login_failure",
    "reason", "invalid_token",
    "ip", getClientIP(r),
    "correlation_id", r.Header.Get("X-Request-ID"),
)
```

### A10:2021 – Server-Side Request Forgery (SSRF)

**Risk:** Server makes requests to unintended locations.

**Mitigations:**
- ✅ No user-controlled URLs in server requests
- ✅ DSAccount SSO URL hardcoded in configuration
- ✅ Lambda has no VPC access by default (isolated)
- ✅ Outbound requests only to known services

---

## Input Validation

### Validation Principles

1. **Validate on the server** - Never trust client-side validation alone
2. **Allowlist over blocklist** - Define what IS allowed, not what isn't
3. **Validate early** - Check inputs before any processing
4. **Fail fast** - Reject invalid input immediately
5. **Type coercion** - Convert to expected types safely

### Go Backend Validation

```go
// backend/internal/validation/validation.go
package validation

import (
    "regexp"
    "strings"
    "unicode/utf8"
)

// MaxLength validates string length
func MaxLength(s string, max int) bool {
    return utf8.RuneCountInString(s) <= max
}

// MinLength validates minimum string length
func MinLength(s string, min int) bool {
    return utf8.RuneCountInString(s) >= min
}

// SafeString validates string contains only safe characters
// Allows: alphanumeric, spaces, common punctuation
var safeStringPattern = regexp.MustCompile(`^[\p{L}\p{N}\s\-_.,!?@#$%&*()[\]{}:;"']+$`)

func SafeString(s string) bool {
    return safeStringPattern.MatchString(s)
}

// Email validates email format
var emailPattern = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func Email(s string) bool {
    return emailPattern.MatchString(s) && len(s) <= 254
}

// UUID validates UUID format
var uuidPattern = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)

func UUID(s string) bool {
    return uuidPattern.MatchString(strings.ToLower(s))
}

// Slug validates URL-safe slug
var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

func Slug(s string) bool {
    return slugPattern.MatchString(s) && len(s) <= 100
}

// Numeric validates numeric string (for IDs, etc.)
var numericPattern = regexp.MustCompile(`^[0-9]+$`)

func Numeric(s string) bool {
    return numericPattern.MatchString(s)
}

// InRange validates integer is within range
func InRange(n, min, max int) bool {
    return n >= min && n <= max
}
```

### Request Validation Example

```go
// backend/internal/handlers/items.go
type CreateItemRequest struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Priority    int    `json:"priority"`
}

func (h *Handler) CreateItem(w http.ResponseWriter, r *http.Request) {
    var req CreateItemRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }
    
    // Validate all fields
    errors := make(map[string]string)
    
    // Name: required, 1-100 chars, safe characters
    req.Name = strings.TrimSpace(req.Name)
    if !validation.MinLength(req.Name, 1) {
        errors["name"] = "Name is required"
    } else if !validation.MaxLength(req.Name, 100) {
        errors["name"] = "Name must be 100 characters or less"
    } else if !validation.SafeString(req.Name) {
        errors["name"] = "Name contains invalid characters"
    }
    
    // Description: optional, max 1000 chars
    req.Description = strings.TrimSpace(req.Description)
    if !validation.MaxLength(req.Description, 1000) {
        errors["description"] = "Description must be 1000 characters or less"
    }
    
    // Priority: 1-100
    if !validation.InRange(req.Priority, 1, 100) {
        errors["priority"] = "Priority must be between 1 and 100"
    }
    
    if len(errors) > 0 {
        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusBadRequest)
        json.NewEncoder(w).Encode(map[string]interface{}{
            "error":  "Validation failed",
            "fields": errors,
        })
        return
    }
    
    // Proceed with validated data...
}
```

### TypeScript Frontend Validation

```typescript
// frontend/src/utils/validation.ts

export const validators = {
    required: (value: string): boolean => value.trim().length > 0,
    
    maxLength: (value: string, max: number): boolean => value.length <= max,
    
    minLength: (value: string, min: number): boolean => value.length >= min,
    
    email: (value: string): boolean => {
        const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return pattern.test(value) && value.length <= 254;
    },
    
    uuid: (value: string): boolean => {
        const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return pattern.test(value);
    },
    
    slug: (value: string): boolean => {
        const pattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        return pattern.test(value) && value.length <= 100;
    },
    
    numeric: (value: string): boolean => /^[0-9]+$/.test(value),
    
    inRange: (value: number, min: number, max: number): boolean => 
        value >= min && value <= max,
    
    // Sanitize for safe display (doesn't trust backend)
    safeString: (value: string): boolean => {
        // Reject obvious XSS attempts
        const dangerous = /<script|javascript:|on\w+=/i;
        return !dangerous.test(value);
    }
};

// Form validation helper
export function validateForm<T extends Record<string, unknown>>(
    data: T,
    rules: Record<keyof T, (value: unknown) => string | null>
): Record<string, string> | null {
    const errors: Record<string, string> = {};
    
    for (const [field, validator] of Object.entries(rules)) {
        const error = validator(data[field as keyof T]);
        if (error) {
            errors[field] = error;
        }
    }
    
    return Object.keys(errors).length > 0 ? errors : null;
}
```

---

## Output Encoding

### Encoding Principles

1. **Context-aware encoding** - HTML, JavaScript, URL, CSS each need different encoding
2. **Encode on output** - Encode data when rendering, not when storing
3. **Use framework defaults** - React auto-escapes JSX, Go templates auto-escape HTML
4. **Double-check dangerous contexts** - href, src, event handlers need extra care

### React (Frontend)

React automatically escapes values in JSX, preventing most XSS:

```tsx
// ✅ SAFE: React auto-escapes this
function UserProfile({ user }: { user: User }) {
    return (
        <div>
            <h1>{user.name}</h1>           {/* Auto-escaped */}
            <p>{user.bio}</p>              {/* Auto-escaped */}
        </div>
    );
}

// ❌ DANGEROUS: dangerouslySetInnerHTML bypasses escaping
function UnsafeComponent({ html }: { html: string }) {
    // NEVER use with user-controlled content
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ⚠️ CAREFUL: URLs need validation
function UserLink({ user }: { user: User }) {
    // Validate URL protocol to prevent javascript: URLs
    const safeUrl = user.website?.startsWith('https://') 
        ? user.website 
        : '#';
    
    return <a href={safeUrl}>{user.website}</a>;
}
```

### Go HTML Templates (if used)

```go
// Go html/template auto-escapes by default
// ✅ SAFE
tmpl := template.Must(template.New("").Parse(`
    <h1>{{.Name}}</h1>
    <p>{{.Description}}</p>
`))

// ❌ DANGEROUS: template.HTML bypasses escaping
// Only use for trusted, pre-sanitized content
type UnsafeData struct {
    HTML template.HTML
}
```

### JSON API Responses

```go
// backend/internal/handlers/response.go

// Always use json.Marshal which properly escapes strings
func respondJSON(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    
    // json.Marshal escapes <, >, & to prevent injection in HTML contexts
    jsonBytes, err := json.Marshal(data)
    if err != nil {
        http.Error(w, "Internal error", http.StatusInternalServerError)
        return
    }
    
    w.Write(jsonBytes)
}

// For extra safety, set nosniff header
func respondJSONSafe(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("X-Content-Type-Options", "nosniff")
    
    json.NewEncoder(w).Encode(data)
}
```

### URL Encoding

```typescript
// frontend/src/utils/encoding.ts

// Encode user data for URL parameters
export function encodeQueryParam(value: string): string {
    return encodeURIComponent(value);
}

// Build safe query strings
export function buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
        .map(([key, value]) => 
            `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
        )
        .join('&');
}

// Example usage
const searchUrl = `/api/search?${buildQueryString({
    q: userQuery,      // Properly encoded
    page: '1'
})}`;
```

---

## CORS Configuration

### Overview

Cross-Origin Resource Sharing (CORS) controls which domains can make requests to the API.

### AWS API Gateway HTTP API Configuration

```typescript
// cdk/lib/developer-stack.ts

const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
    apiName: `${props.appName}-api`,
    corsPreflight: {
        allowOrigins: getAllowedOrigins(props.environment),
        allowMethods: [
            apigwv2.CorsHttpMethod.GET,
            apigwv2.CorsHttpMethod.POST,
            apigwv2.CorsHttpMethod.PUT,
            apigwv2.CorsHttpMethod.DELETE,
            apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Tenant-ID',
            'X-Request-ID',
        ],
        allowCredentials: true,  // Required for cookies
        maxAge: cdk.Duration.hours(1),
    },
});

function getAllowedOrigins(env: string): string[] {
    switch (env) {
        case 'prod':
            return [
                'https://app.digistratum.com',
                'https://www.digistratum.com',
            ];
        case 'staging':
            return [
                'https://staging.digistratum.com',
            ];
        case 'dev':
            return [
                'http://localhost:5173',        // Vite dev server
                'http://localhost:3000',
                'https://dev.digistratum.com',
            ];
        default:
            return [];  // Deny all unknown environments
    }
}
```

### Backend CORS Middleware (Fallback)

```go
// backend/internal/middleware/cors.go
package middleware

import (
    "net/http"
    "os"
    "strings"
)

var allowedOrigins = map[string][]string{
    "prod":    {"https://app.digistratum.com", "https://www.digistratum.com"},
    "staging": {"https://staging.digistratum.com"},
    "dev":     {"http://localhost:5173", "http://localhost:3000", "https://dev.digistratum.com"},
}

func CORS(next http.Handler) http.Handler {
    env := os.Getenv("ENVIRONMENT")
    origins := allowedOrigins[env]
    
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        
        // Check if origin is allowed
        allowed := false
        for _, o := range origins {
            if origin == o {
                allowed = true
                break
            }
        }
        
        if allowed {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID, X-Request-ID")
            w.Header().Set("Access-Control-Max-Age", "3600")
        }
        
        // Handle preflight
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

### CORS Security Checklist

- ✅ Never use `Access-Control-Allow-Origin: *` with credentials
- ✅ Explicitly list allowed origins (no wildcards in production)
- ✅ Limit allowed methods to what's actually needed
- ✅ Limit allowed headers to what's actually needed
- ✅ Set reasonable `Access-Control-Max-Age` (1 hour)
- ✅ Validate Origin header on server side

---

## Content Security Policy

### Overview

Content Security Policy (CSP) prevents XSS by controlling what resources can load.

### CloudFront Response Headers Policy

```typescript
// cdk/lib/constructs/spa-hosting.ts

const securityHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
    this, 'SecurityHeaders', {
        responseHeadersPolicyName: `${props.appName}-security-headers`,
        securityHeadersBehavior: {
            contentSecurityPolicy: {
                contentSecurityPolicy: buildCSP(props.environment),
                override: true,
            },
            contentTypeOptions: {
                override: true,  // X-Content-Type-Options: nosniff
            },
            frameOptions: {
                frameOption: cloudfront.HeadersFrameOption.DENY,
                override: true,
            },
            referrerPolicy: {
                referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
                override: true,
            },
            strictTransportSecurity: {
                accessControlMaxAge: cdk.Duration.days(365),
                includeSubdomains: true,
                preload: true,
                override: true,
            },
            xssProtection: {
                protection: true,
                modeBlock: true,
                override: true,
            },
        },
    }
);

function buildCSP(env: string): string {
    const apiUrl = env === 'dev' 
        ? 'http://localhost:3001' 
        : 'https://api.digistratum.com';
    
    const directives = [
        // Default: deny everything not explicitly allowed
        "default-src 'self'",
        
        // Scripts: self only, no inline (except for Vite in dev)
        env === 'dev' 
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"  // Vite HMR needs this
            : "script-src 'self'",
        
        // Styles: self + inline (for CSS-in-JS, Tailwind)
        "style-src 'self' 'unsafe-inline'",
        
        // Images: self + data URLs (for inline images)
        "img-src 'self' data: https:",
        
        // Fonts: self + Google Fonts if used
        "font-src 'self'",
        
        // API connections
        `connect-src 'self' ${apiUrl} https://account.digistratum.com`,
        
        // Frames: deny all
        "frame-src 'none'",
        
        // Forms: only submit to self
        "form-action 'self'",
        
        // Base URI: prevent base tag hijacking
        "base-uri 'self'",
        
        // Object/embed: deny
        "object-src 'none'",
        
        // Upgrade insecure requests in production
        ...(env !== 'dev' ? ["upgrade-insecure-requests"] : []),
    ];
    
    return directives.join('; ');
}
```

### CSP for Development vs Production

| Directive | Development | Production |
|-----------|-------------|------------|
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval'` | `'self'` |
| `style-src` | `'self' 'unsafe-inline'` | `'self' 'unsafe-inline'` |
| `connect-src` | `'self' localhost:* wss://localhost:*` | `'self' api.domain.com` |
| `upgrade-insecure-requests` | Omitted | Included |

### CSP Violation Reporting (Optional)

```typescript
// Add to CSP for violation monitoring
"report-uri /api/csp-report",
"report-to csp-endpoint"

// Backend handler
func (h *Handler) CSPReport(w http.ResponseWriter, r *http.Request) {
    var report struct {
        CSPReport struct {
            DocumentURI        string `json:"document-uri"`
            Referrer          string `json:"referrer"`
            ViolatedDirective string `json:"violated-directive"`
            BlockedURI        string `json:"blocked-uri"`
        } `json:"csp-report"`
    }
    
    json.NewDecoder(r.Body).Decode(&report)
    
    log.Warn("csp_violation",
        "document_uri", report.CSPReport.DocumentURI,
        "violated_directive", report.CSPReport.ViolatedDirective,
        "blocked_uri", report.CSPReport.BlockedURI,
    )
    
    w.WriteHeader(http.StatusNoContent)
}
```

---

## Secrets Management

### Overview

All secrets are stored in AWS Secrets Manager. Never commit secrets to code.

### Secret Structure

```
Secrets Manager
├── ds-app-developer/prod/
│   ├── dsaccount-sso         # DSAccount SSO credentials
│   │   ├── client_id
│   │   ├── client_secret
│   │   └── jwt_public_key
│   └── app-secrets           # Application-specific secrets
│       ├── session_key
│       └── ...
├── ds-app-developer/staging/
│   └── ...
└── ds-app-developer/dev/
    └── ...
```

### CDK Secret Creation

```typescript
// cdk/lib/developer-stack.ts
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Reference existing secrets (created manually or by another stack)
const ssoSecret = secretsmanager.Secret.fromSecretNameV2(
    this, 'SSOSecret',
    `ds-app-developer/${props.environment}/dsaccount-sso`
);

// Create new secret with auto-generated value
const sessionSecret = new secretsmanager.Secret(this, 'SessionSecret', {
    secretName: `ds-app-developer/${props.environment}/session-key`,
    generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'key',
        excludeCharacters: '"@/\\',
        passwordLength: 64,
    },
});

// Grant Lambda access
ssoSecret.grantRead(lambdaFunction);
sessionSecret.grantRead(lambdaFunction);
```

### Lambda Secret Access

```go
// backend/internal/secrets/secrets.go
package secrets

import (
    "context"
    "encoding/json"
    "sync"
    "time"

    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/service/secretsmanager"
)

type SecretCache struct {
    client    *secretsmanager.Client
    cache     map[string]*cachedSecret
    mu        sync.RWMutex
    cacheTTL  time.Duration
}

type cachedSecret struct {
    value     map[string]string
    expiresAt time.Time
}

func NewSecretCache(client *secretsmanager.Client) *SecretCache {
    return &SecretCache{
        client:   client,
        cache:    make(map[string]*cachedSecret),
        cacheTTL: 5 * time.Minute,
    }
}

func (c *SecretCache) GetSecret(ctx context.Context, secretName string) (map[string]string, error) {
    c.mu.RLock()
    cached, ok := c.cache[secretName]
    c.mu.RUnlock()
    
    if ok && time.Now().Before(cached.expiresAt) {
        return cached.value, nil
    }
    
    // Fetch from Secrets Manager
    result, err := c.client.GetSecretValue(ctx, &secretsmanager.GetSecretValueInput{
        SecretId: aws.String(secretName),
    })
    if err != nil {
        return nil, err
    }
    
    var value map[string]string
    if err := json.Unmarshal([]byte(*result.SecretString), &value); err != nil {
        return nil, err
    }
    
    // Cache the result
    c.mu.Lock()
    c.cache[secretName] = &cachedSecret{
        value:     value,
        expiresAt: time.Now().Add(c.cacheTTL),
    }
    c.mu.Unlock()
    
    return value, nil
}

// Usage example
func GetSSOCredentials(ctx context.Context, cache *SecretCache, env string) (*SSOCredentials, error) {
    secretName := fmt.Sprintf("ds-app-developer/%s/dsaccount-sso", env)
    secret, err := cache.GetSecret(ctx, secretName)
    if err != nil {
        return nil, err
    }
    
    return &SSOCredentials{
        ClientID:     secret["client_id"],
        ClientSecret: secret["client_secret"],
        JWTPublicKey: secret["jwt_public_key"],
    }, nil
}
```

### Secrets Management Checklist

- ✅ Never commit secrets to git (use `.gitignore`)
- ✅ Use AWS Secrets Manager for all secrets
- ✅ Environment-specific secret paths
- ✅ Automatic secret rotation where supported
- ✅ Minimal IAM permissions (only specific secrets)
- ✅ Cache secrets in Lambda to reduce API calls
- ✅ Audit secret access in CloudTrail

### Local Development

For local development, use environment files (not committed):

```bash
# .env.local (gitignored)
DSACCOUNT_CLIENT_ID=dev-client-id
DSACCOUNT_CLIENT_SECRET=dev-secret
SESSION_KEY=local-dev-key-for-testing-only

# Load in development
source .env.local
```

---

## Dependency Scanning

### Overview

Automated scanning catches known vulnerabilities in dependencies before they reach production.

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # Go modules
  - package-ecosystem: "gomod"
    directory: "/backend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      aws-sdk:
        patterns:
          - "github.com/aws/aws-sdk-go-v2*"
    commit-message:
      prefix: "deps(go):"
    labels:
      - "dependencies"
      - "go"

  # npm packages
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 5
    groups:
      react:
        patterns:
          - "react*"
          - "@types/react*"
      testing:
        patterns:
          - "@testing-library/*"
          - "vitest*"
          - "@playwright/*"
    commit-message:
      prefix: "deps(npm):"
    labels:
      - "dependencies"
      - "javascript"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "deps(actions):"
    labels:
      - "dependencies"
      - "ci"

  # CDK npm packages
  - package-ecosystem: "npm"
    directory: "/cdk"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      aws-cdk:
        patterns:
          - "aws-cdk*"
          - "@aws-cdk/*"
    commit-message:
      prefix: "deps(cdk):"
    labels:
      - "dependencies"
      - "infrastructure"
```

### CI Pipeline Security Scanning

```yaml
# .github/workflows/ci.yml (security job excerpt)
security:
  name: Security Scan
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4

    # Go vulnerability check
    - name: Install govulncheck
      run: go install golang.org/x/vuln/cmd/govulncheck@latest

    - name: Run govulncheck
      working-directory: backend
      run: govulncheck ./...

    # npm audit
    - name: npm audit (frontend)
      working-directory: frontend
      run: npm audit --audit-level=high
      continue-on-error: false  # Fail on high/critical vulnerabilities

    - name: npm audit (cdk)
      working-directory: cdk
      run: npm audit --audit-level=high
      continue-on-error: false

    # CodeQL analysis
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: go, javascript

    - name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
```

### Manual Scanning Commands

```bash
# Go vulnerabilities
cd backend
govulncheck ./...

# npm vulnerabilities (frontend)
cd frontend
npm audit
npm audit --fix  # Auto-fix where possible

# npm vulnerabilities (cdk)
cd cdk
npm audit

# Check for outdated packages
npm outdated

# Go module updates
cd backend
go list -u -m all  # List available updates
go get -u ./...    # Update all dependencies
go mod tidy        # Clean up go.mod
```

### Vulnerability Response Process

1. **Critical/High Severity**
   - Immediate fix required
   - Create DSKanban issue with priority 1
   - Patch and deploy within 24 hours

2. **Medium Severity**
   - Fix within 1 week
   - Create DSKanban issue with priority 30

3. **Low Severity**
   - Fix with next regular update cycle
   - Can be grouped with other updates

### Dependabot Merge Policy

```yaml
# Auto-merge low-risk updates (optional)
# .github/workflows/dependabot-auto-merge.yml
name: Dependabot auto-merge
on: pull_request

permissions:
  contents: write
  pull-requests: write

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Fetch Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
      
      # Only auto-merge patch updates
      - name: Enable auto-merge for patch updates
        if: steps.metadata.outputs.update-type == 'version-update:semver-patch'
        run: gh pr merge --auto --squash "$PR_URL"
        env:
          PR_URL: ${{ github.event.pull_request.html_url }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Security Checklist

### Pre-Deployment Checklist

#### Authentication & Authorization
- [ ] DSAccount SSO integration configured
- [ ] Session cookies use HttpOnly, Secure, SameSite
- [ ] Token validation verifies signature and expiration
- [ ] Tenant isolation enforced at data layer
- [ ] All endpoints require authentication (except /health)

#### Input/Output Security
- [ ] Input validation on all API endpoints
- [ ] Output encoding via framework defaults (React, json.Marshal)
- [ ] No dangerouslySetInnerHTML with user content
- [ ] URL parameters properly encoded

#### Headers & CORS
- [ ] CORS configured for specific allowed origins
- [ ] CSP header configured and tested
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Strict-Transport-Security enabled

#### Secrets Management
- [ ] All secrets in AWS Secrets Manager
- [ ] No secrets in git repository
- [ ] Lambda has minimal secret access permissions
- [ ] Secret caching implemented to reduce API calls

#### Dependencies
- [ ] Dependabot enabled
- [ ] npm audit passes (no high/critical)
- [ ] govulncheck passes
- [ ] CodeQL enabled in CI

#### Logging & Monitoring
- [ ] Authentication events logged
- [ ] Security failures logged with context
- [ ] No sensitive data in logs
- [ ] CloudWatch alarms for error rates

### Ongoing Security Tasks

| Task | Frequency | Owner |
|------|-----------|-------|
| Review Dependabot PRs | Weekly | Development |
| Run manual npm audit | Monthly | Development |
| Review CloudWatch security logs | Weekly | Operations |
| Rotate secrets | Quarterly | Operations |
| Security training refresh | Annually | All team |

---

## References

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [AWS Security Best Practices](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
- [CSP Reference](https://content-security-policy.com/)
- [Go Security Guidelines](https://go.dev/doc/security/best-practices)
- [React Security](https://react.dev/learn/thinking-in-react#step-5-add-inverse-data-flow)

---

*Last updated: 2026-02-19*
*Document owner: Security Team*
*Review cycle: Quarterly*
