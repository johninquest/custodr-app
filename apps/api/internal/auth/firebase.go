package auth

import (
	"context"
	"fmt"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

// FirebaseProvider implements TokenVerifier using Firebase Admin SDK.
// It only verifies ID tokens — no session management, no auth state.
type FirebaseProvider struct {
	client *auth.Client
}

// NewFirebaseProvider creates a new Firebase token verifier.
// It initializes the Firebase app using the service account credentials file
// and returns a provider that can verify Firebase ID tokens.
func NewFirebaseProvider(ctx context.Context, projectID, credentialsPath string) (*FirebaseProvider, error) {
	conf := &firebase.Config{
		ProjectID: projectID,
	}

	opts := []option.ClientOption{
		option.WithCredentialsFile(credentialsPath),
	}

	app, err := firebase.NewApp(ctx, conf, opts...)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get firebase auth client: %w", err)
	}

	return &FirebaseProvider{client: client}, nil
}

// VerifyToken verifies a Firebase ID token and returns the user's UID and email.
// Returns an error if the token is invalid, expired, or cannot be verified.
func (f *FirebaseProvider) VerifyToken(ctx context.Context, token string) (string, string, error) {
	t, err := f.client.VerifyIDToken(ctx, token)
	if err != nil {
		return "", "", fmt.Errorf("failed to verify firebase token: %w", err)
	}

	uid := t.UID
	email, _ := t.Claims["email"].(string)

	return uid, email, nil
}
