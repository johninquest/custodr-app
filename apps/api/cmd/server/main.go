package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/custodr-app/api/internal/auth"
	"github.com/custodr-app/api/internal/shared/config"
	"github.com/custodr-app/api/internal/shared/database"
	"github.com/custodr-app/api/internal/shared/logger"
	appMiddleware "github.com/custodr-app/api/internal/shared/middleware"
	"github.com/custodr-app/api/internal/users"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	echoSwagger "github.com/swaggo/echo-swagger"

	// Swagger docs (generated)
	_ "github.com/custodr-app/api/docs"
)

// @title Custodr API
// @version 1.0
// @description API for managing recurring commitments and renewal obligations
// @description
// @description All endpoints except /auth/* require a valid Firebase ID token in the Authorization header.

// @contact.name API Support
// @contact.email support@example.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Firebase ID token (format: "Bearer <token>")

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load config: %v\n", err)
		os.Exit(1)
	}

	// Initialize logger
	log, err := logger.New(cfg.LogLevel)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync()

	// Initialize database
	db, err := database.New(cfg.DBPath)
	if err != nil {
		log.Fatal("Failed to initialize database", "error", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.Migrate(db, cfg.DBPath); err != nil {
		log.Fatal("Failed to run migrations", "error", err)
	}

	// Initialize Echo
	e := echo.New()
	e.HideBanner = true

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{cfg.FrontendURL},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// Health check
	// @Summary Health check
	// @Description Returns the server health status and current time
	// @Tags Health
	// @Produce json
	// @Success 200 {object} map[string]string "Server is healthy"
	// @Router /health [get]
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status": "ok",
			"time":   time.Now().Format(time.RFC3339),
		})
	})

	// Swagger UI (public, no auth required)
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// Initialize Firebase token verifier
	var tokenVerifier auth.TokenVerifier
	if cfg.FirebaseProjectID != "" && cfg.FirebaseCredentialsPath != "" {
		firebaseProvider, err := auth.NewFirebaseProvider(context.Background(), cfg.FirebaseProjectID, cfg.FirebaseCredentialsPath)
		if err != nil {
			log.Warn("Failed to initialize Firebase, auth will be disabled", "error", err)
		} else {
			tokenVerifier = firebaseProvider
			log.Info("Firebase authentication initialized")
		}
	} else {
		log.Warn("Firebase credentials not configured, auth will be disabled")
	}

	// Initialize repositories and services
	authRepo := auth.NewRepository(db)
	usersRepo := users.NewRepository(db)

	var authHandler *auth.Handler
	if tokenVerifier != nil {
		authService := auth.NewService(authRepo, tokenVerifier)
		usersService := users.NewService(usersRepo)
		authHandler = auth.NewHandler(authService, usersService)

		// API routes
		api := e.Group("/api/v1")

		// Public routes (no auth required)
		api.POST("/auth/login", authHandler.Login)

		// Protected routes (auth required)
		protected := api.Group("")
		protected.Use(appMiddleware.AuthMiddleware(tokenVerifier, authRepo))
		protected.GET("/users/me", authHandler.GetProfile)
		protected.DELETE("/users/me", authHandler.DeleteAccount)

		log.Info("Authentication routes registered")
	} else {
		log.Warn("Authentication disabled - no routes registered")
	}

	// Start server
	go func() {
		addr := fmt.Sprintf("%s:%s", cfg.ServerHost, cfg.ServerPort)
		log.Info("Starting server", "address", addr)
		if err := e.Start(addr); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server failed", "error", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown", "error", err)
	}

	log.Info("Server stopped")
}
