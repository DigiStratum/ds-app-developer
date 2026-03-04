# Component Artifacts Storage

> S3 bucket for versioned component artifact storage.
> Part of the shared runtime infrastructure for DS apps.

---

## Overview

Component artifacts are stored in S3 and accessed via presigned URLs from the API. This provides secure, scalable storage for component tarballs without public access.

### Bucket Structure

```
s3://ds-component-artifacts/
├── {component-name}/
│   ├── {version}.tar.gz     # Component tarball (e.g., 1.0.0.tar.gz)
│   └── manifest.json        # Version manifest for this component
└── registry.json            # Global registry of all components
```

### Schema

**registry.json** (bucket root):
```json
{
  "components": ["appshell", "branding", "auth-widget"]
}
```

**manifest.json** (per component):
```json
{
  "name": "appshell",
  "latest": "1.2.0",
  "versions": ["1.0.0", "1.1.0", "1.2.0"],
  "updated": "2026-03-04T08:21:00Z"
}
```

---

## Infrastructure

### CDK Construct

The bucket is deployed via the `ComponentArtifacts` construct in the `DSSharedRuntimeStack`:

```typescript
import { ComponentArtifacts } from './constructs';

const artifacts = new ComponentArtifacts(this, 'ComponentArtifacts', {
  bucketName: 'ds-component-artifacts',
  environment: 'prod',
});

// Grant Lambda function read/write access
artifacts.grantReadWrite(myLambda);
```

### Configuration

| Property | Value | Notes |
|----------|-------|-------|
| Bucket Name | `ds-component-artifacts` | Global DS bucket |
| Region | us-west-2 | Same as other DS infra |
| Versioning | Enabled | Maintains artifact history |
| Public Access | Blocked | All access via presigned URLs |
| Encryption | S3-Managed (SSE-S3) | At-rest encryption |
| Removal Policy | RETAIN (prod) | Prevents accidental deletion |

### Lifecycle Rules

- Non-current versions transition to Infrequent Access after 30 days
- Non-current versions expire after 365 days

---

## Access Patterns

### Read Access (Download Components)

The API generates presigned URLs for component downloads:

```go
// API handler example
func (h *Handler) GetComponentURL(ctx context.Context, name, version string) (string, error) {
    key := fmt.Sprintf("%s/%s.tar.gz", name, version)
    
    presignClient := s3.NewPresignClient(h.s3Client)
    req, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
        Bucket: aws.String("ds-component-artifacts"),
        Key:    aws.String(key),
    }, s3.WithPresignExpires(15*time.Minute))
    
    return req.URL, err
}
```

### Write Access (Publish Components)

Publishing requires authentication and generates a presigned PUT URL:

```go
// API handler example  
func (h *Handler) PublishComponentURL(ctx context.Context, name, version string) (string, error) {
    key := fmt.Sprintf("%s/%s.tar.gz", name, version)
    
    presignClient := s3.NewPresignClient(h.s3Client)
    req, err := presignClient.PresignPutObject(ctx, &s3.PutObjectInput{
        Bucket: aws.String("ds-component-artifacts"),
        Key:    aws.String(key),
    }, s3.WithPresignExpires(15*time.Minute))
    
    return req.URL, err
}
```

---

## Operations

### Manual Upload (CLI)

```bash
# Upload a component tarball
aws s3 cp mycomponent-1.0.0.tar.gz s3://ds-component-artifacts/mycomponent/1.0.0.tar.gz

# Update manifest
cat > /tmp/manifest.json << 'EOF'
{"name":"mycomponent","latest":"1.0.0","versions":["1.0.0"],"updated":"2026-03-04T12:00:00Z"}
EOF
aws s3 cp /tmp/manifest.json s3://ds-component-artifacts/mycomponent/manifest.json \
  --content-type "application/json"

# Update registry
aws s3 cp s3://ds-component-artifacts/registry.json /tmp/registry.json
# Edit to add component...
aws s3 cp /tmp/registry.json s3://ds-component-artifacts/registry.json \
  --content-type "application/json"
```

### List Contents

```bash
# List all top-level items
aws s3 ls s3://ds-component-artifacts/

# List specific component versions
aws s3 ls s3://ds-component-artifacts/mycomponent/
```

### Download Artifact

```bash
aws s3 cp s3://ds-component-artifacts/mycomponent/1.0.0.tar.gz ./
```

---

## Security

### Access Control

- **No public access**: All bucket access is blocked by default
- **Presigned URLs**: Short-lived (15min) URLs for authorized access
- **IAM policies**: Lambda functions granted specific permissions

### Required IAM Permissions

For API Lambda functions that read components:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject"],
  "Resource": "arn:aws:s3:::ds-component-artifacts/*"
}
```

For API Lambda functions that publish components:
```json
{
  "Effect": "Allow",
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::ds-component-artifacts/*"
}
```

---

## Related Documentation

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Overall infrastructure patterns
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- CDK construct: `cdk/lib/constructs/component-artifacts.ts`
