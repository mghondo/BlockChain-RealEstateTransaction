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

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register, loginWithGoogle } = useAuth();

  const validateForm = () => {
    if (!displayName.trim()) {
      setError('Please enter your name');
      return false;
    }
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setError('');
      setLoading(true);
      await register(email, password, displayName.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Join FracEstate
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Create your account and start investing in fractional real estate
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Google Sign Up */}
      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleRegister}
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
          or create account with email
        </Typography>
      </Divider>

      {/* Email Sign Up Form */}
      <Box component="form" onSubmit={handleEmailRegister}>
        <TextField
          fullWidth
          label="Full Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          margin="normal"
          disabled={loading}
          autoComplete="name"
          sx={{ mb: 2 }}
        />

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
          autoComplete="new-password"
          helperText="Must be at least 6 characters"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          disabled={loading}
          autoComplete="new-password"
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
          {loading ? <CircularProgress size={24} /> : 'Create Account'}
        </Button>
      </Box>

      {/* Terms and Privacy */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
        By creating an account, you agree to our Terms of Service and Privacy Policy
      </Typography>

      {/* Switch to Login */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Already have an account?{' '}
          <Link
            component="button"
            variant="body2"
            onClick={onSwitchToLogin}
            sx={{
              textDecoration: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sign in
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};