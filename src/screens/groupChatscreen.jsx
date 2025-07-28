// GroupChatScreen.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Typography, IconButton, TextField, Dialog, DialogTitle,
  DialogContent, DialogContentText, Menu, MenuItem, DialogActions,
  Button, InputLabel, Select, FormControl
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import CryptoJS from 'crypto-js';

const BASE_URL = 'http://172.20.10.9:8000';
const socket = io(BASE_URL);
const SECRET_KEY = 'your_secret_key_123';

const GroupChatScreen = () => {
  const location = useLocation();
  const group = location.state?.group;
  const currentUser = JSON.parse(localStorage.getItem('user'))?.identifier;

  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const scrollRef = useRef();

  const isAdmin = group && currentUser === group.admin;
  

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
    if (!group) return;
    console.log('Joining group:', group.id);
    socket.emit('joinGroup', group.id);
    fetchMessages();
    fetchMembers();
    fetchContacts();
  }, [group]);

  useEffect(() => {
  socket.on('receiveGroupMessage', (msg) => {
    console.log("Received via socket:", msg);
    console.log("Group ID match:", parseInt(msg.groupId), "vs", parseInt(group?.id));

    if (parseInt(msg.groupId) === parseInt(group?.id)) {
      const decrypted = msg.text ? decryptMessage(msg.text) : '';
      setMessages(prev => {
        const exists = prev.some(m => m.timestamp === msg.timestamp && m.from === msg.from);
        if (exists) return prev;
        return [...prev, { ...msg, text: decrypted }];
      });
      scrollToBottom();
    }
  });
  return () => socket.off('receiveGroupMessage');
}, [group]);


  const getISTTimestamp = () => {
    const raw = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    }).replace(',', '');
    const [month, day, rest] = raw.split('/');
    const [year, time] = rest.split(' ');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}`;
  };

 const fetchMessages = async () => {
  try {
    const res = await fetch(`${BASE_URL}/group-messages/${group.id}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const recentMessages = data.filter(msg => {
      if (!msg.timestamp) return false;
      const msgDate = new Date(msg.timestamp);
      return !isNaN(msgDate) && msgDate >= fifteenDaysAgo;
    });

    const decryptedMsgs = recentMessages.map(msg => ({
      ...msg,
      text: msg.text ? decryptMessage(msg.text) : '',
    }));

    setMessages(decryptedMsgs);
    scrollToBottom();
  } catch (err) {
    console.error('Error in fetchMessages:', err);
  }
};


const fetchMembers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/group-info/${group.id}`);
    const data = await res.json();
    if (!Array.isArray(data.members)) return;

    const cleanMembers = data.members.filter(m => m); // removes null or undefined
    console.log('Fetched members:', cleanMembers);
    setMembers(cleanMembers);
  } catch (err) {
    console.error('Error in fetchMembers:', err);
  }
};


  const fetchContacts = async () => {
    try {
      const res = await fetch(`${BASE_URL}/contacts/${currentUser}`);
      const data = await res.json();
      if (!Array.isArray(data)) return;
      console.log('Fetched contacts:', data);
      setContacts(data);
    } catch (err) {
      console.error('Error in fetchContacts:', err);
    }
  };

  const handleAddMember = async () => {
  if (!selectedMember) {
    alert('Please select a member.');
    return;
  }

  console.log('Adding member:', selectedMember);

  try {
    const res = await fetch(`${BASE_URL}/add-group-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId: group.id, member: selectedMember })
    });

    const data = await res.json();
    console.log('Response from /add-group-member:', data);
    console.log('Sending payload to /add-group-member:', {
      groupId: group.id,
      member: selectedMember
    });


    if (data.success) {
      alert('Member added successfully!');
      fetchMembers();
      setAddDialogOpen(false);
      setSelectedMember('');
    } else {
      alert(data.message || 'Failed to add member');
    }
  } catch (err) {
    console.error('Add member error:', err);
    alert('Server error.');
  }
};



  const getDisplayName = (identifier) => {
    const match = contacts.find(c => c.contact === identifier);
    return match ? match.name : identifier;
  };

  const encryptMessage = (msg) => CryptoJS.AES.encrypt(msg, SECRET_KEY).toString();
  const decryptMessage = (cipher) => {
    try {
      return CryptoJS.AES.decrypt(cipher, SECRET_KEY).toString(CryptoJS.enc.Utf8);
    } catch {
      return '';
    }
  };

  const pickAttachment = (e) => {
    setAttachment(e.target.files[0]);
    e.target.value = '';
  };

const sendMessage = async () => {
  if (!message && !attachment) return;

  let uploadedUrl = null;
  if (attachment) {
    const formData = new FormData();
    formData.append('file', attachment);
    const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    uploadedUrl = data.url;
  }

  const encryptedText = encryptMessage(message);
  const timestamp = getISTTimestamp();
  const msg = {
    groupId: group.id,
    from: currentUser,
    text: encryptedText,
    attachment_url: uploadedUrl,
    timestamp
  };

  // ✅ Emit instantly
  socket.emit('groupMessage', msg);

  // ✅ Add to UI instantly
  setMessages(prev => [...prev, {
    ...msg,
    text: message  // decrypted version shown immediately
  }]);

  scrollToBottom();

  try {
    // Save to DB
    await fetch(`${BASE_URL}/group-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg)
    });
  } catch (err) {
    console.error('Failed to save group message:', err);
  }

  setMessage('');
  setAttachment(null);
};


  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const groupByDate = (msgs) => {
    const grouped = {};
    msgs.forEach(msg => {
      const date = new Date(msg.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      });
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  };

  if (!group) {
    return <Box sx={{ p: 4 }}><Typography variant="h6" color="error">Invalid group selected.</Typography></Box>;
  }

  return (
   <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#e5ddd5' }}>
  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#fff' }}>
    <Typography variant="h6" sx={{ color: '#075e54' }}>{group.name}</Typography>
    <div>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertIcon /></IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => setViewDialogOpen(true)}>View Members</MenuItem>
        {isAdmin && <MenuItem onClick={() => setAddDialogOpen(true)}>Add Member</MenuItem>}
      </Menu>
    </div>
  </Box>

  {/* ✅ View Members Dialog */}
  <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)}>
    <DialogTitle>Group Info</DialogTitle>
    <DialogContent>
      <DialogContentText>
        <strong>Group:</strong> {group.name}<br />
        <strong>Admin:</strong> {getDisplayName(group.admin)}<br />
        <strong>Members:</strong>
       <ul>
        {members.filter(Boolean).map((m, i) => (
          <li key={i}>{getDisplayName(m)}</li>
        ))}
      </ul>

      </DialogContentText>
    </DialogContent>
  </Dialog>

  {/* ✅ Add Member Dialog */}
  <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)}>
    <DialogTitle>Add Member</DialogTitle>
    <DialogContent>
      <FormControl fullWidth sx={{ mt: 2 }}>
        <InputLabel>Select Member</InputLabel>
        <Select
          value={selectedMember}
          onChange={(e) => setSelectedMember(e.target.value)}
          label="Select Member"
        >
          {contacts
          .filter(c => c.contact && !members.includes(c.contact))
          .map((c, i) => (
            <MenuItem key={i} value={c.contact}>
              {c.name} ({c.contact})
            </MenuItem>
          ))}

        </Select>
      </FormControl>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
      <Button variant="contained" onClick={handleAddMember}>Add</Button>
    </DialogActions>
  </Dialog>


      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {Object.entries(groupByDate(messages)).map(([date, msgs]) => (
          <React.Fragment key={date}>
            <Typography sx={{ textAlign: 'center', fontSize: 12, color: '#64748b', my: 1 }}>{date}</Typography>
           {msgs.map((msg, i) => {
          const sender = msg.sender || msg.from;
          const isMe = sender === currentUser;
          const time = new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const senderName = sender === currentUser ? 'You' : getDisplayName(sender);


  return (
    <Box key={i} sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMe ? 'flex-end' : 'flex-start',
      mb: 1
    }}>
      {/* ✅ Always show sender identifier or name above message */}
      <Typography sx={{ fontSize: 12, color: '#075e54', fontWeight: 'bold', mb: 0.3 }}>
        {senderName}
      </Typography>

      <Box sx={{
        bgcolor: isMe ? '#dcf8c6' : '#fff',
        borderRadius: 2,
        p: 1.5,
        maxWidth: '70%',
        boxShadow: 1,
        wordBreak: 'break-word'
      }}>
        {msg.text && <Typography>{msg.text}</Typography>}
        {msg.attachment_url && (
          msg.attachment_url.match(/\.(jpg|jpeg|png|gif)$/i)
            ? <img src={msg.attachment_url} alt="file" style={{ maxWidth: '100%', marginTop: 6, borderRadius: 8 }} />
            : <a href={msg.attachment_url} target="_blank" rel="noreferrer">📎 View File</a>
        )}
        <Typography sx={{ fontSize: 10, color: '#64748b', mt: 1, textAlign: 'right' }}>
          {time}
        </Typography>
      </Box>
    </Box>
              );
            })}
            <div ref={scrollRef} />
          </React.Fragment>
        ))}
      </Box>
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
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: '#f0f0f0', borderTop: '1px solid #ccc' }}>
        <IconButton component="label">
          <AttachFileIcon />
          <input type="file" hidden onChange={pickAttachment} />
        </IconButton>
        <TextField
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          variant="outlined"
          fullWidth size="small"
          sx={{ mx: 1, bgcolor: '#fff', borderRadius: 2 }}
        />
        <IconButton onClick={sendMessage}>
          <SendIcon sx={{ color: '#075e54' }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default GroupChatScreen;
