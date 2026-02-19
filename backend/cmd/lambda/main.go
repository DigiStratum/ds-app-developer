package main

import (
	"context"
	"log"
	"net/http"
	"os"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/digistratum/ds-app-skeleton/internal/api"
	"github.com/digistratum/ds-app-skeleton/internal/repository"
)

var router http.Handler

func init() {
	// Initialize DynamoDB repository
	tableName := os.Getenv("DYNAMODB_TABLE")
	if tableName == "" {
		log.Fatal("DYNAMODB_TABLE environment variable required")
	}

	repo, err := repository.NewDynamoDB(tableName)
	if err != nil {
		log.Fatalf("Failed to initialize DynamoDB: %v", err)
	}

	// Load configuration
	cfg := api.Config{
		JWTSecret:       getEnvOrDefault("JWT_SECRET", "dev-secret-change-in-production"),
		SessionTimeout:  60, // minutes
		SSODSAccountURL: getEnvOrDefault("SSO_DSACCOUNT_URL", "https://account.digistratum.com"),
		SSOAppID:        getEnvOrDefault("SSO_APP_ID", "myapp"),
		SSOAppSecret:    os.Getenv("SSO_APP_SECRET"),
		SSORedirectURI:  os.Getenv("SSO_REDIRECT_URI"),
	}

	// Validate required SSO config
	if cfg.SSOAppSecret == "" {
		log.Fatal("SSO_APP_SECRET environment variable required")
	}

	// Create handler and router
	handler := api.NewHandler(repo, cfg)
	router = handler.Router()

	log.Printf("Initialized with table=%s, sso_url=%s, app_id=%s",
		tableName, cfg.SSODSAccountURL, cfg.SSOAppID)
}

func HandleRequest(ctx context.Context, event events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	req, err := convertRequest(ctx, event)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Body:       "Failed to convert request",
		}, nil
	}

	recorder := &responseRecorder{
		headers: make(http.Header),
		status:  200,
	}

	router.ServeHTTP(recorder, req)

	return events.APIGatewayProxyResponse{
		StatusCode:        recorder.status,
		Headers:           flattenHeaders(recorder.headers),
		MultiValueHeaders: multiValueHeaders(recorder.headers),
		Body:              recorder.body.String(),
		IsBase64Encoded:   false,
	}, nil
}

func main() {
	lambda.Start(HandleRequest)
}

func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

func convertRequest(ctx context.Context, event events.APIGatewayProxyRequest) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, event.HTTPMethod, event.Path, nil)
	if err != nil {
		return nil, err
	}

	for k, v := range event.Headers {
		req.Header.Set(k, v)
	}

	if event.Body != "" {
		req.Body = &stringReadCloser{s: event.Body}
	}

	q := req.URL.Query()
	for k, v := range event.QueryStringParameters {
		q.Set(k, v)
	}
	req.URL.RawQuery = q.Encode()

	return req, nil
}

type responseRecorder struct {
	headers http.Header
	body    stringBuilder
	status  int
}

func (r *responseRecorder) Header() http.Header         { return r.headers }
func (r *responseRecorder) Write(b []byte) (int, error) { return r.body.Write(b) }
func (r *responseRecorder) WriteHeader(statusCode int)  { r.status = statusCode }

type stringBuilder struct{ data []byte }

func (sb *stringBuilder) Write(b []byte) (int, error) {
	sb.data = append(sb.data, b...)
	return len(b), nil
}
func (sb *stringBuilder) String() string { return string(sb.data) }

type stringReadCloser struct {
	s string
	i int
}

func (r *stringReadCloser) Read(p []byte) (n int, err error) {
	if r.i >= len(r.s) {
		return 0, nil
	}
	n = copy(p, r.s[r.i:])
	r.i += n
	return
}
func (r *stringReadCloser) Close() error { return nil }

func flattenHeaders(h http.Header) map[string]string {
	flat := make(map[string]string)
	for k, v := range h {
		if len(v) > 0 && k != "Set-Cookie" {
			flat[k] = v[0]
		}
	}
	return flat
}

func multiValueHeaders(h http.Header) map[string][]string {
	mv := make(map[string][]string)
	for k, v := range h {
		if len(v) > 0 {
			mv[k] = v
		}
	}
	return mv
}
