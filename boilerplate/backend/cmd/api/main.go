// Package main is the Lambda entry point for the {{APP_NAME}} API.
package main

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
)

func main() {
	// Configure structured logging
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})))

	// Build router
	mux := http.NewServeMux()

	// Health check (unauthenticated)
	mux.HandleFunc("GET /api/health", healthHandler)

	// TODO: Add your routes here
	// mux.HandleFunc("GET /api/example", exampleHandler)

	// Start Lambda or local server
	if os.Getenv("AWS_LAMBDA_FUNCTION_NAME") != "" {
		lambda.Start(httpadapter.New(mux).ProxyWithContext)
	} else {
		addr := ":8080"
		slog.Info("starting local server", "addr", addr)
		if err := http.ListenAndServe(addr, mux); err != nil {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
