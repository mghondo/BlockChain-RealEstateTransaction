import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, Divider } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { cleanupClassCPendingProperties, checkClassCPendingCount } from '../../utils/cleanupClassCPending';

export const AuthTest: React.FC = () => {
  const [email, setEmail] = useState('test2@example.com');
  const [password, setPassword] = useState('testpassword123');
  const [displayName, setDisplayName] = useState('Test User');
  const [message, setMessage] = useState('');
  
  // Use the AuthContext
  const { 
    user, 
    userProfile, 
    loading, 
    register, 
    login, 
    loginWithGoogle,
    logout, 
    linkWallet,
    isAuthenticated,
    isPremium 
  } = useAuth();

  const handleRegister = async () => {
    try {
      await register(email, password, displayName);
      setMessage(`✅ User registered with profile!`);
    } catch (error: any) {
      setMessage(`❌ Registration failed: ${error.message}`);
    }
  };

  const handleLogin = async () => {
    try {
      await login(email, password);
      setMessage(`✅ User logged in!`);
    } catch (error: any) {
      setMessage(`❌ Login failed: ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      setMessage(`✅ Google login successful!`);
    } catch (error: any) {
      setMessage(`❌ Google login failed: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setMessage('✅ User logged out');
    } catch (error: any) {
      setMessage(`❌ Logout failed: ${error.message}`);
    }
  };

  const handleLinkWallet = async () => {
    try {
      const mockWalletAddress = '0x1234567890123456789012345678901234567890';
      await linkWallet(mockWalletAddress);
      setMessage(`✅ Wallet linked: ${mockWalletAddress}`);
    } catch (error: any) {
      setMessage(`❌ Wallet linking failed: ${error.message}`);
    }
  };

  const handleCheckClassCPending = async () => {
    try {
      const count = await checkClassCPendingCount();
      setMessage(`📊 Found ${count} Class C pending properties`);
    } catch (error: any) {
      setMessage(`❌ Check failed: ${error.message}`);
    }
  };

  const handleCleanupClassCPending = async () => {
    try {
      await cleanupClassCPendingProperties();
      setMessage(`✅ Class C pending properties cleaned up!`);
    } catch (error: any) {
      setMessage(`❌ Cleanup failed: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        🧪 AuthContext Test
      </Typography>
      
      {message && (
        <Alert severity={message.includes('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Auth Status:
        </Typography>
        <Typography variant="body2">
          🔐 Authenticated: {isAuthenticated ? '✅' : '❌'}
        </Typography>
        <Typography variant="body2">
          👑 Premium: {isPremium ? '✅' : '❌'}
        </Typography>
        <Typography variant="body2">
          📧 Email: {user?.email || 'None'}
        </Typography>
        <Typography variant="body2">
          👤 Name: {userProfile?.displayName || 'None'}
        </Typography>
        <Typography variant="body2">
          💰 Wallet: {userProfile?.walletAddress || 'Not linked'}
        </Typography>
      </Box>

      <TextField
        fullWidth
        label="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          variant="contained"
          onClick={handleRegister}
          disabled={loading}
          color="primary"
        >
          📝 Register New User
        </Button>

        <Button
          variant="contained"
          onClick={handleLogin}
          disabled={loading}
          color="success"
        >
          🔑 Email Login
        </Button>

        <Button
          variant="contained"
          onClick={handleGoogleLogin}
          disabled={loading}
          sx={{
            backgroundColor: '#4285f4',
            color: 'white',
            '&:hover': {
              backgroundColor: '#3367d6'
            }
          }}
        >
          🔍 Sign in with Google
        </Button>

        <Button
          variant="outlined"
          onClick={handleLogout}
          disabled={loading}
          color="error"
        >
          🚪 Logout
        </Button>

        <Button
          variant="outlined"
          onClick={handleLinkWallet}
          disabled={loading || !isAuthenticated}
          color="info"
        >
          🔗 Link Test Wallet
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        🧹 Property Cleanup Tools
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        <Button
          variant="outlined"
          onClick={handleCheckClassCPending}
          disabled={loading}
          color="info"
        >
          📊 Check Class C Pending Count
        </Button>

        <Button
          variant="contained"
          onClick={handleCleanupClassCPending}
          disabled={loading}
          color="warning"
        >
          🧹 Cleanup Class C Pending Properties
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Test with email: test2@example.com, password: testpassword123
      </Typography>
    </Box>
  );
};