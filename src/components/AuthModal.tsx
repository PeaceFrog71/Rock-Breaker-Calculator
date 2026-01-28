import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthView = 'signIn' | 'signUp';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signUp, signIn, signInWithGoogle } = useAuth();

  const [view, setView] = useState<AuthView>('signIn');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset form when modal opens/closes or view changes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setDisplayName('');
      setPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
      setView('signIn');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail('');
    setDisplayName('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const switchView = (newView: AuthView) => {
    resetForm();
    setView(newView);
  };

  const clearError = () => {
    if (error) setError('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error: authError } = await signIn(email, password);
    setSubmitting(false);

    if (authError) {
      setError(authError.message);
    } else {
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    setSubmitting(true);
    const { error: authError } = await signUp(email, password, displayName.trim());
    setSubmitting(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Account created! Check your email to confirm your account.');
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    const { error: authError } = await signInWithGoogle();
    setSubmitting(false);

    if (authError) {
      setError(authError.message);
    }
    // Google OAuth redirects the page, so no need to close modal
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>

        {success ? (
          <>
            <h2>Check Your Email</h2>
            <p className="auth-success">{success}</p>
            <div className="auth-toggle" style={{ marginTop: '1.5rem' }}>
              <span>Already confirmed?</span>
              <button onClick={() => switchView('signIn')}>Sign In</button>
            </div>
          </>
        ) : view === 'signIn' ? (
          <>
            <h2>Sign In</h2>
            <p className="auth-subtitle">Sign in to save your setups to the cloud</p>

            {error && <p className="auth-error">{error}</p>}

            <form className="auth-form" onSubmit={handleSignIn}>
              <div className="auth-field">
                <label htmlFor="auth-email">Email</label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <button
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={submitting}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-toggle">
              <span>Don't have an account?</span>
              <button onClick={() => switchView('signUp')}>Sign Up</button>
            </div>
          </>
        ) : (
          <>
            <h2>Create Account</h2>
            <p className="auth-subtitle">Sign up to save your setups to the cloud</p>

            {error && <p className="auth-error">{error}</p>}

            <form className="auth-form" onSubmit={handleSignUp}>
              <div className="auth-field">
                <label htmlFor="auth-signup-name">Display Name</label>
                <input
                  id="auth-signup-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); clearError(); }}
                  placeholder="Your display name"
                  required
                  autoComplete="name"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="auth-signup-email">Email</label>
                <input
                  id="auth-signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="auth-signup-password">Password</label>
                <input
                  id="auth-signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <p className="password-hint">Minimum 8 characters</p>
              </div>

              <div className="auth-field">
                <label htmlFor="auth-signup-confirm">Confirm Password</label>
                <input
                  id="auth-signup-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="auth-submit-btn"
                disabled={submitting}
              >
                {submitting ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <button
              className="auth-google-btn"
              onClick={handleGoogleSignIn}
              disabled={submitting}
            >
              <svg className="google-icon" viewBox="0 0 24 24" width="18" height="18">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-toggle">
              <span>Already have an account?</span>
              <button onClick={() => switchView('signIn')}>Sign In</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
