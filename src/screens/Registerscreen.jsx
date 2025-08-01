import React, { useState } from 'react';
import {
  Box, TextField, Button, Typography, Card, CardContent, CircularProgress
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
    <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <Card sx={{ width: 400, p: 3 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>Register</Typography>

          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone or Email"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            margin="normal"
          />

          {/* ✅ OTP Verification Flow */}
          {identifier && !isOtpVerified && (
            <Box sx={{ mt: 2 }}>
              <OTPFlow
                secretKey={SECRET_KEY}
                apiEndpoint={OTP_API}
                phoneNumber={identifier}
                initialTheme="light"
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
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Register'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterScreen;
