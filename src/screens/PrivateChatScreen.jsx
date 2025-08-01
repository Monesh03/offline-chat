import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, TextField, Dialog,
  DialogTitle, DialogContent, DialogContentText,} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';


const BASE_URL = 'http://172.20.10.9:8000';
const socket = io(BASE_URL);
const SECRET_KEY = 'your_secret_key_123'; // Use a stronger key and keep it secret

const PrivateChatScreen = () => {
const location = useLocation();
const to = location.state?.to || 'Unknown';
const passedName = location.state?.name || null;



   const [contactName, setContactName] = useState(passedName || to);
  const [currentUser, setCurrentUser] = useState('');

  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const scrollRef = useRef();

  const open = Boolean(anchorEl);
  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  
  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.id = 'screenshot-blocker';
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'black';
    overlay.style.color = 'white';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 9999;
    overlay.style.fontSize = '20px';
    overlay.style.fontWeight = 'bold';
    overlay.style.flexDirection = 'column';
    overlay.style.display = 'none'; // Hidden initially
  
    overlay.innerHTML = `
      <div>📸 Screenshot Blocked</div>
      <div style="font-size: 14px; margin-top: 8px;">For your privacy, screenshots are not allowed.</div>
    `;
  
    document.body.appendChild(overlay);
  
    const disableRightClick = (e) => e.preventDefault();
  
    const disableClipboard = (e) => {
      // Block Ctrl+C, Ctrl+V
      if ((e.ctrlKey || e.metaKey) && ['c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        alert('Clipboard operations are disabled!');
      }
    };
  
    const detectPrintScreen = (e) => {
      if (e.key === 'PrintScreen') {
        // Show overlay
        overlay.style.display = 'flex';
  
        // Hide after 3 seconds
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 3000);
      }
    };
  
    document.addEventListener('contextmenu', disableRightClick);
    document.addEventListener('keydown', disableClipboard);
    document.addEventListener('keyup', detectPrintScreen);
  
    return () => {
      document.removeEventListener('contextmenu', disableRightClick);
      document.removeEventListener('keydown', disableClipboard);
      document.removeEventListener('keyup', detectPrintScreen);
      document.body.removeChild(overlay);
    };
  }, []);
  

 useEffect(() => {
  const stored = localStorage.getItem('user');
  if (stored) {
    try {
      const parsed = JSON.parse(stored); // { identifier: "...", name: "..." }
      const identifier = parsed?.identifier;
      if (identifier) {
        setCurrentUser(identifier);
        socket.emit('registerUser', identifier);
        if (to) {
          fetchMessages(identifier, to);
          fetchContactName(identifier, to);
        }
      }
    } catch (err) {
      console.error('Invalid user object in localStorage', err);
    }
  }
}, [to]);


 useEffect(() => {
  const receive = (msg) => {
    const isRelevant =
      (msg.from === to && msg.to === currentUser) ||
      (msg.from === currentUser && msg.to === to);

    if (isRelevant) {
      const decryptedText = msg.text ? decryptMessage(msg.text) : '';
      setMessages((prev) => [...prev, { ...msg, text: decryptedText }]);
      scrollToBottom();
    }
  };

  socket.on('receivePrivateMessage', receive);

  return () => {
    socket.off('receivePrivateMessage', receive);
  };
}, [currentUser, to]);


  const fetchMessages = async (fromUser, toUser) => {
  try {
    const res = await fetch(`${BASE_URL}/messages`);
    const data = await res.json();

    const filtered = (Array.isArray(data) ? data : []).filter(
      conv =>
        (conv.sender === fromUser && conv.receiver === toUser) ||
        (conv.sender === toUser && conv.receiver === fromUser)
    );

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const allMessages = [];
    filtered.forEach(conv => {
      (conv.conversation || []).forEach(msg => {
        const msgDate = new Date(msg.timestamp);
        if (msgDate >= fifteenDaysAgo) {
          const decrypted = msg.text ? decryptMessage(msg.text) : '';
          allMessages.push({ ...msg, to: toUser, text: decrypted });
        }
      });
    });

    setMessages(allMessages);
    scrollToBottom();
  } catch (err) {
    console.error(err);
  }
};


  const fetchContactName = async (owner, contact) => {
    try {
      const res = await fetch(`${BASE_URL}/contacts/${owner}`);
      const contacts = await res.json();
      const match = contacts.find(c => c.contact === contact);
      if (match?.name) setContactName(match.name);
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const encryptMessage = (msg) => CryptoJS.AES.encrypt(msg, SECRET_KEY).toString();

  const decryptMessage = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || '';
    } catch {
      return '';
    }
  };

  const pickAttachment = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachment(file);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() && !attachment) return;

    let uploadedUrl = null;
    if (attachment) {
      try {
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await fetch(`${BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        uploadedUrl = data.url;
      } catch (err) {
        return;
      }
    }

    const encryptedText = encryptMessage(message.trim());

    const msg = {
      from: currentUser,
      to,
      text: encryptedText,
      attachment_url: uploadedUrl,
      timestamp: new Date().toISOString(),
    };

    socket.emit('privateMessage', msg);
    setMessage('');
    setAttachment(null);
  };


  const groupMessagesByDate = (msgs) => {
    const grouped = {};
    msgs.forEach((msg) => {
      const date = new Date(msg.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#e5ddd5' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#fff' }}>
        <Typography variant="h6" sx={{ color: '#075e54' }}>{contactName}</Typography>
        <div>
          <IconButton onClick={handleMenuOpen}><MoreVertIcon /></IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
            <MenuItem onClick={() => setViewDialogOpen(true)}>View Contact</MenuItem>
            <MenuItem onClick={() => alert('Blocked')}>Block User</MenuItem>
          </Menu>
        </div>
      </Box>

      {/* View Contact Modal */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)}>
        <DialogTitle>Contact Info</DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>Name:</strong> {contactName}<br />
            <strong>Contact:</strong> {to}
          </DialogContentText>
        </DialogContent>
      </Dialog>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {Object.entries(groupMessagesByDate(messages)).map(([date, msgs]) => (
          <React.Fragment key={date}>
            <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#64748b', my: 1 }}>{date}</Typography>
            {msgs.map((msg, i) => {
              const isMe = msg.from === currentUser;
              const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });

              return (
                <Box
                  key={i}
                  sx={{
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    bgcolor: isMe ? '#dcf8c6' : '#fff',
                    borderRadius: 2,
                    p: 1.5,
                    mb: 1,
                    maxWidth: '70%',
                    boxShadow: 1,
                    ml: isMe ? 'auto' : 0,
                    mr: isMe ? 0 : 'auto',
                  }}
                >
                  {msg.text && <Typography>{msg.text}</Typography>}
                  {msg.attachment_url && (
                    msg.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <img
                        src={msg.attachment_url}
                        alt="preview"
                        style={{ maxWidth: '100%', borderRadius: 8, marginTop: 6 }}
                      />
                    ) : (
                      <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" style={{ color: '#1e40af' }}>
                        📎 View File
                      </a>
                    )
                  )}
                  <Typography sx={{ fontSize: 10, color: '#64748b', mt: 1, textAlign: 'right' }}>{time}</Typography>
                </Box>
              );
            })}
          </React.Fragment>
        ))}
        <div ref={scrollRef} />
      </Box>

      {/* Attachment Preview */}
      {attachment && (
        <Box sx={{ bgcolor: '#fff', p: 2, position: 'relative', borderTop: '1px solid #ccc' }}>
          <IconButton
            sx={{ position: 'absolute', top: 4, right: 4 }}
            onClick={() => setAttachment(null)}
          >
            <CloseIcon sx={{ color: '#dc2626' }} />
          </IconButton>
          {attachment.type?.startsWith('image') ? (
            <img
              src={URL.createObjectURL(attachment)}
              alt="preview"
              style={{ width: 120, height: 120, borderRadius: 12 }}
            />
          ) : (
            <Typography sx={{ mt: 1 }}>📎 {attachment.name}</Typography>
          )}
        </Box>
      )}

      {/* Input Field */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        p: 1,
        bgcolor: '#f0f0f0',
        borderTop: '1px solid #ccc',
      }}>
        <IconButton component="label">
          <AttachFileIcon />
          <input type="file" hidden onChange={pickAttachment} />
        </IconButton>
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          variant="outlined"
          fullWidth
          size="small"
          sx={{ mx: 1, bgcolor: '#fff', borderRadius: 2 }}
        />
        <IconButton onClick={sendMessage}>
          <SendIcon sx={{ color: '#075e54' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default PrivateChatScreen;