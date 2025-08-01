import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Paper, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import OTPFlow  from 'raj-otp';

const SECRET_KEY = "9D941AF69FAA5E041172D29A8B459BB4"; // Replace with a secure one
const OTP_API = 'http://192.168.162.221:3002/api/check-otp-availability'; // Update if needed

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false); // 🔐 OTP verification state
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !identifier || !password) {
      alert('Please fill all fields');
      return;
    }

    if (!isOtpVerified) {
      alert('Please verify your OTP first');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://172.20.10.9:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ name, identifier }));
      alert('Registered successfully');
      navigate('/');
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      minHeight: '100vh',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0b141a',
      padding: 2,
    }}>
      <Paper sx={{
        width: 400,
        backgroundColor: '#1f2937',
        borderRadius: 2,
        p: 4,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}>
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
            Join WhatsApp
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Create your account to start messaging
          </Typography>
        </Box>

        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          margin="normal"
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
          fullWidth
          label="Phone or Email"
          value={identifier}
          onChange={e => setIdentifier(e.target.value)}
          margin="normal"
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
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          margin="normal"
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

        {/* ✅ OTP Verification Flow */}
        {identifier && !isOtpVerified && (
          <Box sx={{ mt: 2 }}>
            <OTPFlow
              secretKey={SECRET_KEY}
              apiEndpoint={OTP_API}
              phoneNumber={identifier}
              initialTheme="dark"
              onVerified={() => {
                alert('OTP Verified Successfully!');
                setIsOtpVerified(true);
              }}
              onFailed={() => {
                alert('OTP Verification Failed');
                setIsOtpVerified(false);
              }}
            />
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          onClick={handleRegister}
          disabled={loading || !isOtpVerified}
          sx={{
            mt: 3,
            py: 1.5,
            backgroundColor: '#25d366',
            borderRadius: 2,
            fontSize: '1rem',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#1db954' },
            '&:disabled': { backgroundColor: '#4b5563' },
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Create Account'}
        </Button>
      </Paper>
    </Box>
  );
};

export default RegisterScreen;
