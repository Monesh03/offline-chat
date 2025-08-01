// src/screens/UserListScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Typography, Button, Snackbar, Paper, Avatar, Divider, IconButton
} from '@mui/material';
import { Add, Search, Group, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

const BASE_URL = 'http://172.20.10.9:8000';
let socket;

const UserListScreen = () => {
  const [contacts, setContacts] = useState([]);
  const [unknownSenders, setUnknownSenders] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [contactName, setContactName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const identifier = parsed?.identifier;
        if (identifier) {
          setCurrentUser(identifier);
          fetchContacts(identifier);
          fetchUnknownSenders(identifier);
          fetchGroups(identifier);

          if (!socket) {
            socket = io(BASE_URL, { transports: ['websocket'] });
            socket.emit('registerUser', identifier);

            socket.on('onlineUsers', (onlineList) => {
              setOnlineUsers(onlineList);
            });

            socket.on('newMessage', () => {
              fetchUnknownSenders(identifier);
            });
          }
        }
      } catch (err) {
        console.error('Invalid user object in localStorage', err);
      }
    }
  }, []);

  const fetchContacts = async (user) => {
    try {
      const res = await fetch(`${BASE_URL}/contacts/${user}`);
      const data = await res.json();
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async (user) => {
  try {
    const res = await fetch(`${BASE_URL}/groups/${user}`);
    const data = await res.json();
    console.log('Fetched groups:', data); // ✅ inspect the response
    setGroups(data);
  } catch (err) {
    console.error('Error fetching groups:', err);
    setGroups([]); // fallback to avoid .map crash
  }
};


  const fetchUnknownSenders = async (user) => {
    try {
      const res = await fetch(`${BASE_URL}/messages`);
      const data = await res.json();

      const senders = new Set();
      data.forEach(conv => {
        if (conv.receiver === user || conv.sender === user) {
          conv.conversation.forEach(msg => {
            if (msg.from !== user) {
              senders.add(msg.from);
            }
          });
        }
      });

      const contactRes = await fetch(`${BASE_URL}/contacts/${user}`);
      const contactList = await contactRes.json();
      const knownContacts = new Set(contactList.map(c => c.contact));
      const unknown = Array.from(senders).filter(sender => !knownContacts.has(sender));
      setUnknownSenders(unknown);
    } catch (err) {
      console.error(err);
    }
  };

 const handleAddContact = async (customContact = null, customName = null, e = null) => {
  if (e && e.preventDefault) e.preventDefault(); // optional safety
    const contactToAdd = customContact || emailInput.trim();
    const nameToAdd = customName || contactName.trim();

    if (!contactToAdd || !nameToAdd) {
      setSnackbarMessage('Both name and contact are required.');
      setSnackbarVisible(true);
      return;
    }

    const alreadyExists = contacts.some(c => c.contact === contactToAdd);
    if (alreadyExists) {
      setSnackbarMessage('Contact already exists.');
      setSnackbarVisible(true);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/add-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentUser, contact: contactToAdd, name: nameToAdd })
      });

      const data = await res.json();
      if (data.success || data.message === 'Already added') {
        setSnackbarMessage('Contact added!');
        setSnackbarVisible(true);
        setEmailInput('');
        setContactName('');
        fetchContacts(currentUser);
        fetchUnknownSenders(currentUser);
      } else {
        setSnackbarMessage(data.error || 'Something went wrong');
        setSnackbarVisible(true);
      }
    } catch (err) {
      console.error(err);
      setSnackbarMessage('Network error while adding contact');
      setSnackbarVisible(true);
    }
  };

  const handleAddFromUnknownUser = (contact) => {
    setEmailInput(contact);
    setContactName('');
    const addForm = document.getElementById('add-contact-form');
    if (addForm) {
      addForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    setFilteredContacts(contacts);
  }, [contacts]);

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  const handleDeleteUnknownSender = async (sender) => {
    try {
      await fetch(`${BASE_URL}/delete-conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user1: currentUser, user2: sender })
      });
      setSnackbarMessage('Conversation deleted');
      setSnackbarVisible(true);
      fetchUnknownSenders(currentUser);
    } catch {
      setSnackbarMessage('Failed to delete conversation');
      setSnackbarVisible(true);
    }
  };

  const handleDeleteContact = async (contactToRemove) => {
    try {
      await fetch(`${BASE_URL}/delete-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentUser, contact: contactToRemove })
      });
      fetchContacts(currentUser);
      fetchUnknownSenders(currentUser);
    } catch (err) {
      console.error(err);
    }
  };

  const navigateToChat = (userObj) => {
    navigate('/privatechat', {
      state: { to: userObj.contact || userObj, name: userObj.name || null },
    });
  };

  const navigateToGroup = (group) => {
   navigate('/groupchat', { state: { group } }); // ✅ send full group object

  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setSnackbarMessage('Enter group name');
      setSnackbarVisible(true);
      return;
    }
    try {
      const res = await fetch(`${BASE_URL}/create-group`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, admin: currentUser })
      });
      const data = await res.json();
      if (data.success) {
        setSnackbarMessage('Group created!');
        setNewGroupName('');
        fetchGroups(currentUser);
      } else {
        setSnackbarMessage(data.message || 'Failed to create group');
      }
      setSnackbarVisible(true);
    } catch (err) {
      setSnackbarMessage('Error creating group');
      setSnackbarVisible(true);
    }
  };

 return (
  <Box
    sx={{
      minHeight: '100vh',
      backgroundColor: '#0b141a',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* Header */}
    <Box sx={{
      backgroundColor: '#1f2937',
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #374151',
    }}>
      <Typography variant="h5" sx={{ color: '#e5e7eb', fontWeight: 500 }}>
        WhatsApp
      </Typography>
      <Box>
        <IconButton sx={{ color: '#9ca3af' }}>
          <Search />
        </IconButton>
      </Box>
    </Box>

    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Add Contact Section */}
      <Box sx={{ backgroundColor: '#1f2937', p: 3, borderBottom: '1px solid #374151' }}>
        <Typography variant="h6" sx={{ color: '#e5e7eb', mb: 2, display: 'flex', alignItems: 'center' }}>
          <Add sx={{ mr: 1, color: '#25d366' }} />
          Add New Contact
        </Typography>
        
        <TextField
          label="Name"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          fullWidth
          size="small"
          sx={{
            mb: 2,
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
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="Email or Phone"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            fullWidth
            size="small"
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
            variant="contained"
            onClick={() => handleAddContact()}
            sx={{
              backgroundColor: '#25d366',
              '&:hover': { backgroundColor: '#1db954' },
              px: 3,
              minWidth: 'auto',
            }}
          >
            <Add />
          </Button>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#111b21' }}>
        {/* Search Bar */}
        <Box sx={{ p: 2, backgroundColor: '#1f2937', borderBottom: '1px solid #374151' }}>
          <TextField
            label="Search conversations"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            fullWidth
            size="small"
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
        </Box>

        {/* Contacts Section */}
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ color: '#25d366', mb: 2, display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1 }} />
            Contacts ({filteredContacts.length})
          </Typography>
          
          {filteredContacts.map((item) => (
            <Box
              key={item.contact}
              onClick={() => navigateToChat(item)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': { backgroundColor: '#1f2937' },
                mb: 1,
              }}
            >
              <Avatar sx={{ bgcolor: '#25d366', mr: 2, width: 48, height: 48 }}>
                {(item.name || item.contact).charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                  {item.name || item.contact}
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: onlineUsers.includes(item.contact) ? '#25d366' : '#9ca3af' 
                }}>
                  {onlineUsers.includes(item.contact) ? 'Online' : 'Last seen recently'}
                </Typography>
              </Box>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteContact(item.contact);
                }}
                size="small"
                sx={{ color: '#ef4444', minWidth: 'auto' }}
              >
                Remove
              </Button>
            </Box>
          ))}
        </Box>

        {/* Unknown Users */}
        {unknownSenders.length > 0 && (
          <>
            <Divider sx={{ borderColor: '#374151', mx: 2 }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: '#f59e0b', mb: 2 }}>
                Unknown Contacts ({unknownSenders.length})
              </Typography>
              
              {unknownSenders.map((item) => (
                <Box
                  key={item}
                  onClick={() => navigateToChat(item)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { backgroundColor: '#1f2937' },
                    mb: 1,
                  }}
                >
                  <Avatar sx={{ bgcolor: '#f59e0b', mr: 2, width: 48, height: 48 }}>
                    {item.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                      {item}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                      Unknown contact
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddFromUnknownUser(item);
                      }}
                      size="small"
                      sx={{ color: '#25d366', minWidth: 'auto' }}
                    >
                      Add
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUnknownSender(item);
                      }}
                      size="small"
                      sx={{ color: '#ef4444', minWidth: 'auto' }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Groups Section */}
        <Divider sx={{ borderColor: '#374151', mx: 2 }} />
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ color: '#25d366', mb: 2, display: 'flex', alignItems: 'center' }}>
            <Group sx={{ mr: 1 }} />
            Groups ({groups.length})
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              label="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              fullWidth
              size="small"
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
              variant="contained"
              onClick={handleCreateGroup}
              sx={{
                backgroundColor: '#25d366',
                '&:hover': { backgroundColor: '#1db954' },
                px: 3,
                minWidth: 'auto',
              }}
            >
              <Add />
            </Button>
          </Box>

          {Array.isArray(groups) &&
            groups.map((group) => (
              <Box
                key={group.id}
                onClick={() => navigateToGroup(group)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 2,
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { backgroundColor: '#1f2937' },
                  mb: 1,
                }}
              >
                <Avatar sx={{ bgcolor: '#0ea5e9', mr: 2, width: 48, height: 48 }}>
                  <Group />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#e5e7eb', fontWeight: 500 }}>
                    {group.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                    Admin: {group.admin}
                  </Typography>
                </Box>
              </Box>
            ))}
        </Box>
      </Box>
    </Box>

    {/* Snackbar */}
    <Snackbar
      open={snackbarVisible}
      onClose={() => setSnackbarVisible(false)}
      autoHideDuration={3000}
      message={snackbarMessage}
      sx={{
        '& .MuiSnackbarContent-root': {
          backgroundColor: '#1f2937',
          color: '#e5e7eb',
        },
      }}
    />
  </Box>
);

}

export default UserListScreen;
            </Box>
          </Paper>
        ))}
    </Box>

    {/* Snackbar */}
    <Snackbar
      open={snackbarVisible}
      onClose={() => setSnackbarVisible(false)}
      autoHideDuration={3000}
      message={snackbarMessage}
    />
  </Box>
</Box>
);

}

export default UserListScreen;
