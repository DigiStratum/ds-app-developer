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
)

var httpAdapter *httpadapter.HandlerAdapterV2

func init() {
	// Configure structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	// Build the HTTP handler
	mux := http.NewServeMux()

	// Health check (no auth required)
	mux.HandleFunc("GET /health", api.HealthHandler)

	// API routes (auth required)
	authedMux := http.NewServeMux()
	authedMux.HandleFunc("GET /api/me", api.GetCurrentUserHandler)
	authedMux.HandleFunc("GET /api/tenant", api.GetCurrentTenantHandler)

	// Wrap with auth middleware
	mux.Handle("/api/", auth.Middleware(authedMux))

	// SSO callbacks (no auth middleware)
	mux.HandleFunc("GET /auth/callback", auth.CallbackHandler)
	mux.HandleFunc("GET /auth/logout", auth.LogoutHandler)

	httpAdapter = httpadapter.NewV2(mux)
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
