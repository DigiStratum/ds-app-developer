package main

import (
	"log"
	"net/http"
	"os"

	"github.com/digistratum/ds-app-skeleton/internal/api"
	"github.com/digistratum/ds-app-skeleton/internal/repository"
)

func main() {
	// Initialize repository (DynamoDB for local, uses AWS credentials)
	tableName := os.Getenv("DYNAMODB_TABLE")
	if tableName == "" {
		tableName = "ds-app-dev"
	}

	repo, err := repository.NewDynamoDB(tableName)
	if err != nil {
		log.Fatalf("Failed to initialize DynamoDB: %v", err)
	}

	// Load configuration
	cfg := api.Config{
		JWTSecret:       getEnvOrDefault("JWT_SECRET", "dev-secret-change-in-production"),
		SessionTimeout:  60,
		SSODSAccountURL: getEnvOrDefault("SSO_DSACCOUNT_URL", "https://account.digistratum.com"),
		SSOAppID:        getEnvOrDefault("SSO_APP_ID", "myapp"),
		SSOAppSecret:    getEnvOrDefault("SSO_APP_SECRET", "dev-secret"),
		SSORedirectURI:  getEnvOrDefault("SSO_REDIRECT_URI", "http://localhost:3000/api/auth/sso/callback"),
	}

	handler := api.NewHandler(repo, cfg)
	router := handler.Router()

	port := getEnvOrDefault("PORT", "8080")
	log.Printf("Starting local server on :%s", port)
	log.Printf("  DynamoDB table: %s", tableName)
	log.Printf("  SSO URL: %s", cfg.SSODSAccountURL)

	if err := http.ListenAndServe(":"+port, router); err != nil {
		log.Fatal(err)
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}
