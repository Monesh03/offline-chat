import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Link,
  Paper,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const socket = io('http://172.20.10.9:8000');

const LoginScreen = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      alert('Please enter phone/email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://172.20.10.9:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name: data.name, identifier }));
      socket.emit('registerUser', identifier);
      navigate('/userlist');
    } catch (error) {
      alert('Login Failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#0b141a',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
      }}
    >
      <Paper
        sx={{
          width: 400,
          backgroundColor: '#1f2937',
          borderRadius: 2,
          p: 4,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#25d366',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '2rem',
            }}
          >
            💬
          </Box>
          <Typography variant="h4" sx={{ color: '#e5e7eb', fontWeight: 300, mb: 1 }}>
            WhatsApp
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Sign in to continue messaging
          </Typography>
        </Box>

        <TextField
          label="Phone or Email"
          value={identifier}
          fullWidth
          onChange={(e) => setIdentifier(e.target.value)}
          margin="normal"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#374151',
              color: '#e5e7eb',
              '& fieldset': { borderColor: '#4b5563' },
              '&:hover fieldset': { borderColor: '#25d366' },
              '&.Mui-focused fieldset': { borderColor: '#25d366' },
            },
            '& .MuiInputLabel-root': { color: '#9ca3af' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#25d366' },
          }}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          fullWidth
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#374151',
              color: '#e5e7eb',
              '& fieldset': { borderColor: '#4b5563' },
              '&:hover fieldset': { borderColor: '#25d366' },
              '&.Mui-focused fieldset': { borderColor: '#25d366' },
            },
            '& .MuiInputLabel-root': { color: '#9ca3af' },
            '& .MuiInputLabel-root.Mui-focused': { color: '#25d366' },
          }}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleLogin}
          disabled={loading}
          sx={{
            mt: 3,
            mb: 2,
            py: 1.5,
            backgroundColor: '#25d366',
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#1db954' },
            '&:disabled': { backgroundColor: '#4b5563' },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
        </Button>

        <Typography sx={{ textAlign: 'center', color: '#9ca3af' }}>
          New to WhatsApp?{' '}
          <Link
            component="button"
            onClick={() => navigate('/register')}
            sx={{ color: '#25d366', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Create Account
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default LoginScreen;
