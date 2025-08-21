import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Paper,
  Divider,
  Link,
  CircularProgress
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Welcome Back
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sign in to access your property portfolio
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Google Sign In */}
      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleLogin}
        disabled={loading}
        startIcon={<GoogleIcon />}
        sx={{
          mb: 3,
          py: 1.5,
          backgroundColor: '#fff',
          borderColor: '#dadce0',
          color: '#3c4043',
          fontSize: '0.875rem',
          fontWeight: 500,
          textTransform: 'none',
          '&:hover': {
            backgroundColor: '#f8f9fa',
            borderColor: '#dadce0',
          }
        }}
      >
        Continue with Google
      </Button>

      <Divider sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          or sign in with email
        </Typography>
      </Divider>

      {/* Email Sign In Form */}
      <Box component="form" onSubmit={handleEmailLogin}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          disabled={loading}
          autoComplete="email"
          sx={{ mb: 2 }}
        />
        
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          disabled={loading}
          autoComplete="current-password"
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          type="submit"
          variant="contained"
          disabled={loading}
          sx={{
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 600,
            textTransform: 'none',
            mb: 3
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
      </Box>

      {/* Switch to Register */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Don't have an account?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={onSwitchToRegister}
            sx={{
              textDecoration: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign up
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};