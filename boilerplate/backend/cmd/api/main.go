package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"github.com/DigiStratum/ds-app-developer/backend/internal/api"
	"github.com/DigiStratum/ds-app-developer/backend/internal/auth"
	"github.com/DigiStratum/ds-app-developer/backend/internal/components"
	"github.com/DigiStratum/ds-app-developer/backend/internal/dynamo"
	"github.com/DigiStratum/ds-app-developer/backend/internal/featureflags"
	"github.com/DigiStratum/ds-app-developer/backend/internal/health"
	"github.com/DigiStratum/ds-app-developer/backend/internal/middleware"
	"github.com/DigiStratum/ds-app-developer/backend/internal/session"
	"github.com/DigiStratum/ds-app-developer/backend/internal/theme"
)

var httpAdapter *httpadapter.HandlerAdapterV2

func init() {
	// Configure structured JSON logging for CloudWatch [NFR-MON-001]
	logLevel := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		logLevel = slog.LevelDebug
	}
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
	slog.SetDefault(logger)

	// Build the HTTP handler
	mux := http.NewServeMux()

	// Health check - shallow is unauthenticated, deep requires auth [NFR-AVAIL-003]
	// For deep health checks, we need session/auth context for superadmin check
	healthMux := http.NewServeMux()
	healthMux.HandleFunc("GET /health", health.Handler)
	mux.Handle("/health", session.Middleware(auth.Middleware(healthMux)))

	// Auth routes (no session middleware - they manage sessions directly)
	// Note: Routes are under /api/auth/* so CloudFront routes them to API Gateway
	mux.HandleFunc("GET /api/auth/login", auth.LoginHandler)
	mux.HandleFunc("GET /api/auth/callback", auth.CallbackHandler)
	mux.HandleFunc("GET /api/auth/logout", auth.LogoutHandler)

	// Session-aware API routes (works for both guest and authenticated users)
	// These routes allow both guest and authenticated access
	sessionMux := http.NewServeMux()
	sessionMux.HandleFunc("GET /api/session", api.GetSessionHandler)
	sessionMux.HandleFunc("GET /api/theme", theme.Handler) // Theme endpoint [FR-THEME-004]

	// Feature flags - evaluate endpoint is public (works for guests too)
	sessionMux.HandleFunc("GET /api/flags/evaluate", featureflags.EvaluateHandler)

	// Auth-required API routes
	// These require a logged-in user (not just a guest session)
	authedMux := http.NewServeMux()
	authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
	authedMux.HandleFunc("GET /api/tenant", api.GetCurrentTenantHandler)

	// Feature flags admin routes (require authentication)
	authedMux.HandleFunc("GET /api/flags", featureflags.ListHandler)
	authedMux.HandleFunc("PUT /api/flags/", featureflags.UpdateHandler)
	authedMux.HandleFunc("DELETE /api/flags/", featureflags.DeleteHandler)

	// Component registry routes
	// Initialize component handler with dependencies
	componentHandler := initComponentHandler()
	if componentHandler != nil {
		// GET /api/components - list all components (public)
		sessionMux.HandleFunc("GET /api/components", componentHandler.ListComponentsHandler)

		// POST /api/components - register new component (auth required)
		authedMux.HandleFunc("POST /api/components", componentHandler.RegisterComponentHandler)

		// GET /api/components/{name} - get component with versions (public)
		// Note: This handles paths like /api/components/my-component
		sessionMux.HandleFunc("GET /api/components/", componentHandler.GetComponentHandler)

		// PUT /api/components/{name}/{version} - publish version (auth required)
		authedMux.HandleFunc("PUT /api/components/", componentHandler.PublishVersionHandler)

		// DELETE /api/components/{name}/{version} - deprecate/delete version (auth required)
		authedMux.HandleFunc("DELETE /api/components/", componentHandler.DeleteVersionHandler)
	}

	// Wrap session routes with session + auth + featureflags middleware
	// Session middleware creates/loads sessions
	// Auth middleware enriches context with user data if authenticated
	// Feature flags middleware adds evaluation context
	// NOTE: /api/session bypasses local middleware - it calls DSAccount directly
	mux.HandleFunc("GET /api/session", api.GetSessionHandler)
	mux.Handle("/api/theme", session.Middleware(auth.Middleware(featureflags.Middleware(sessionMux))))
	mux.Handle("/api/flags/evaluate", session.Middleware(auth.Middleware(featureflags.Middleware(sessionMux))))
	
	// Component registry - list and get are public (session middleware only)
	mux.Handle("/api/components", session.Middleware(auth.Middleware(featureflags.Middleware(sessionMux))))

	// Wrap auth-required routes with session + auth + require-auth middleware
	mux.Handle("/api/", session.Middleware(auth.Middleware(session.RequireAuth(authedMux))))

	// Apply middleware stack (order matters - outermost first):
	// 1. Recovery - catch panics at the outermost layer
	// 2. Correlation ID - assign ID for tracing
	// 3. Logging - log request completion with timing
	var handler http.Handler = mux
	handler = middleware.LoggingMiddleware(handler)
	handler = middleware.CorrelationIDMiddleware(handler)
	handler = middleware.RecoveryMiddleware(handler)

	httpAdapter = httpadapter.NewV2(handler)
}

// initComponentHandler creates the component handler with its dependencies.
// Returns nil if initialization fails (e.g., missing config).
func initComponentHandler() *components.Handler {
	// Get S3 bucket name from environment
	bucketName := os.Getenv("COMPONENT_ARTIFACTS_BUCKET")
	if bucketName == "" {
		bucketName = "ds-component-artifacts" // Default bucket name
	}

	// Initialize DynamoDB repository
	repo, err := dynamo.NewRepository(os.Getenv("DYNAMODB_TABLE"))
	if err != nil {
		slog.Error("failed to initialize DynamoDB repository for components", "error", err)
		return nil
	}

	// Initialize S3 service
	s3Service, err := components.NewS3Service(bucketName)
	if err != nil {
		slog.Error("failed to initialize S3 service for components", "error", err)
		return nil
	}

	// Create component repository and handler
	componentRepo := components.NewRepository(repo)
	return components.NewHandler(componentRepo, s3Service)
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return httpAdapter.ProxyWithContext(ctx, req)
}

func main() {
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		lambda.Start(handler)
	} else {
		// Local development
		slog.Info("Starting local server", "port", 8080)
		_ = http.ListenAndServe(":8080", nil)
	}
}
