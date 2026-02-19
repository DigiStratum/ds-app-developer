package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"

	"github.com/DigiStratum/ds-app-skeleton/backend/internal/api"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/auth"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/health"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/middleware"
	"github.com/DigiStratum/ds-app-skeleton/backend/internal/session"
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
	mux.HandleFunc("GET /auth/login", auth.LoginHandler)
	mux.HandleFunc("GET /auth/callback", auth.CallbackHandler)
	mux.HandleFunc("GET /auth/logout", auth.LogoutHandler)

	// Session-aware API routes (works for both guest and authenticated users)
	// These routes allow both guest and authenticated access
	sessionMux := http.NewServeMux()
	sessionMux.HandleFunc("GET /api/session", api.GetSessionHandler)

	// Auth-required API routes
	// These require a logged-in user (not just a guest session)
	authedMux := http.NewServeMux()
	authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
	authedMux.HandleFunc("GET /api/tenant", api.GetCurrentTenantHandler)

	// Wrap session routes with session + auth middleware
	// Session middleware creates/loads sessions
	// Auth middleware enriches context with user data if authenticated
	mux.Handle("/api/session", session.Middleware(auth.Middleware(sessionMux)))

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

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return httpAdapter.ProxyWithContext(ctx, req)
}

func main() {
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		lambda.Start(handler)
	} else {
		// Local development
		slog.Info("Starting local server", "port", 8080)
		http.ListenAndServe(":8080", nil)
	}
}
