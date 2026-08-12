import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/ui/Icon';

function AuthPage() {
  const { user, signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  // If user is already signed in, redirect to dashboard
  if (user) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-sm w-full bg-surface rounded-card border border-border p-8 transition-opacity duration-150">
        {/* Brand mark */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-primary-subtle flex items-center justify-center">
            <Icon name="shield" size={40} className="text-primary" />
          </div>
        </div>

        {/* App name */}
        <h1 className="mt-4 text-center text-xl font-semibold text-text">
          custodr
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-center text-sm text-muted">
          Know what renews, what expires, and when.
        </p>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Auth actions */}
        <div className="space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-negative-subtle border border-negative text-negative px-4 py-3 rounded-btn text-sm"
            >
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            aria-label="Sign in with Google"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-btn text-sm font-medium text-text bg-surface hover:bg-background focus:outline-none focus:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-150"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted">
          By signing in, you agree to our Terms &amp; Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
