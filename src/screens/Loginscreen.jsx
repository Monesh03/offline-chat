import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Link,
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
        backgroundColor: '#dbeafe',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        padding: 2,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 300,
          height: 300,
          borderRadius: '50%',
          backgroundColor: '#93c5fd',
          opacity: 0.4,
          transform: 'rotate(45deg)',
        }}
      />
      <Card
        sx={{
          width: 410,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: 3,
          boxShadow: 8,
        }}
      >
        <CardContent>
          <Typography variant="h3" align="center" mb={1}>
            💬
          </Typography>
          <Typography variant="h5" align="center" color="primary" fontWeight="bold">
            Welcome Back
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" mb={3}>
            Login to start chatting
          </Typography>

          <TextField
            label="Phone or Email"
            value={identifier}
            fullWidth
            onChange={(e) => setIdentifier(e.target.value)}
            margin="normal"
            variant="outlined"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            fullWidth
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            variant="outlined"
          />

          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleLogin}
            disabled={loading}
            sx={{ borderRadius: 2, py: 1 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>

          <Typography mt={2} align="center">
            New user?{' '}
            <Link component="button" onClick={() => navigate('/register')}>
              Register here
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginScreen;
