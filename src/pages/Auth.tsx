import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Card, CardContent, Link, TextField, Typography, Avatar } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { supabase } from '../lib/supabase';

const MIN_PASSWORD_LENGTH = 8;

type Mode = 'signin' | 'signup';

function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/already registered|already exists/i.test(message)) return 'An account with this email already exists. Try signing in instead.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a moment and try again.';
  if (/fetch|network/i.test(message)) return 'Could not reach the server. Check your connection and try again.';
  return message;
}

export default function Auth() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  const validate = (): string | null => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (isSignup && password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    const trimmedEmail = email.trim();
    if (isSignup) {
      const { data, error: err } = await supabase.auth.signUp({ email: trimmedEmail, password });
      if (err) {
        setError(friendlyAuthError(err.message));
      } else if (!data.session) {
        setInfo('Account created. Check your email to confirm it, then sign in.');
        setMode('signin');
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (err) setError(friendlyAuthError(err.message));
    }
    setSubmitting(false);
  };

  const switchMode = () => {
    setMode(isSignup ? 'signin' : 'signup');
    setError(null);
    setInfo(null);
    setConfirmPassword('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 4,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48, mb: 1.5 }}>
              <CurrencyRupeeIcon />
            </Avatar>
            <Typography variant="h5">{isSignup ? 'Create your account' : 'Welcome back'}</Typography>
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 0.5 }}>
              {isSignup ? 'Your financial data stays private to your account.' : 'Sign in to view your finances.'}
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {info && <Alert severity="success" sx={{ mb: 2 }}>{info}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText={isSignup ? `At least ${MIN_PASSWORD_LENGTH} characters` : undefined}
              sx={{ mb: isSignup ? 2 : 3 }}
            />
            {isSignup && (
              <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                fullWidth
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={{ mb: 3 }}
              />
            )}
            <Button type="submit" variant="contained" fullWidth disabled={submitting} sx={{ minHeight: 44 }}>
              {submitting ? 'Please wait...' : isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 3 }}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <Link component="button" type="button" onClick={switchMode} sx={{ fontWeight: 600, verticalAlign: 'baseline' }}>
              {isSignup ? 'Sign in' : 'Create one'}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
