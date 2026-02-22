// Package middleware provides common HTTP middleware functions.
package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"

	"github.com/google/uuid"
)

type contextKey string

const correlationIDKey contextKey = "correlation_id"

// responseWriter wraps http.ResponseWriter to capture status code and size
type responseWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
	size        int
}

func wrapResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, status: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHeader {
		return
	}
	rw.status = code
	rw.wroteHeader = true
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	rw.size += len(b)
	return rw.ResponseWriter.Write(b)
}

// CorrelationID adds a correlation ID to each request
// The ID is either extracted from X-Correlation-ID header or generated fresh.
func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Amzn-Request-Id")
		}
		if correlationID == "" {
			correlationID = uuid.New().String()
		}

		ctx := context.WithValue(r.Context(), correlationIDKey, correlationID)
		w.Header().Set("X-Correlation-ID", correlationID)

		slog.Info("request started",
			"correlation_id", correlationID,
			"method", r.Method,
			"path", r.URL.Path,
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
		)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Logging logs request completion with duration and status
// Produces CloudWatch-compatible structured JSON logs.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := wrapResponseWriter(w)

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		correlationID := GetCorrelationID(r.Context())

		logLevel := slog.LevelInfo
		if wrapped.status >= 500 {
			logLevel = slog.LevelError
		} else if wrapped.status >= 400 {
			logLevel = slog.LevelWarn
		}

		slog.Log(r.Context(), logLevel, "request completed",
			"correlation_id", correlationID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", wrapped.status,
			"duration_ms", duration.Milliseconds(),
			"size_bytes", wrapped.size,
		)
	})
}

// Recovery catches panics and returns a 500 error
// Logs the panic with stack trace for debugging.
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				correlationID := GetCorrelationID(r.Context())

				slog.Error("panic recovered",
					"error", fmt.Sprintf("%v", err),
					"correlation_id", correlationID,
					"method", r.Method,
					"path", r.URL.Path,
					"stack", string(debug.Stack()),
				)

				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Correlation-ID", correlationID)
				w.WriteHeader(http.StatusInternalServerError)
				_, _ = fmt.Fprintf(w, `{"error":{"code":"INTERNAL_ERROR","message":"An unexpected error occurred","request_id":"%s"}}`, correlationID)
			}
		}()

		next.ServeHTTP(w, r)
	})
}

// GetCorrelationID retrieves the correlation ID from context
func GetCorrelationID(ctx context.Context) string {
	if id, ok := ctx.Value(correlationIDKey).(string); ok {
		return id
	}
	return ""
}

// LoggerWithCorrelation returns a slog.Logger with the correlation ID pre-attached
func LoggerWithCorrelation(ctx context.Context) *slog.Logger {
	correlationID := GetCorrelationID(ctx)
	return slog.Default().With("correlation_id", correlationID)
}

// Chain combines multiple middleware functions into one
func Chain(middlewares ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
	return func(final http.Handler) http.Handler {
		for i := len(middlewares) - 1; i >= 0; i-- {
			final = middlewares[i](final)
		}
		return final
	}
}
