// src/screens/UserListScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, TextField, Typography, Button, Snackbar, Paper
} from '@mui/material';
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
      px: { xs: 2, sm: 4 },
      py: 3,
      maxWidth:1600,
      mx: 'auto',
      bgcolor: '#ece5dd',
      minHeight: '100vh',
      borderRadius: 2,
      boxShadow: 5,
    }}
    >
  <Box
    sx={{
      px: { xs: 2, sm: 4 },
      py: 3,
      maxWidth:1200,
      mx: 'auto',
      bgcolor: '#ece5dd',
      minHeight: '100vh',
    }}
  >
    <Typography variant="h5" fontWeight="bold" color="primary" gutterBottom>
      Add New Contact
    </Typography>

    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
      <TextField
        label="Name"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        size="small"
        sx={{ bgcolor: '#fff', borderRadius: 1 }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="Email or Phone"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          fullWidth
          size="small"
          sx={{ bgcolor: '#fff', borderRadius: 1 }}
        />
        <Button
          variant="contained"
          onClick={() => handleAddContact()}
          sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1EBE5D' }, px: 3 }}
        >
          Add
        </Button>
      </Box>
    </Box>

    {/* Contacts Section */}
    <Typography variant="h6" fontWeight="bold" mb={1}>
      My Contacts
    </Typography>
    <TextField
      label="Search Contacts"
      value={searchText}
      onChange={(e) => handleSearch(e.target.value)}
      fullWidth
      size="small"
      sx={{ mb: 1.5, bgcolor: '#fff', borderRadius: 1 }}
    />

    <Box sx={{ maxHeight: 180, overflowY: 'auto', mb: 3 }}>
      {filteredContacts.map((item) => (
        <Paper
          key={item.contact}
          elevation={1}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            mb: 1,
            borderRadius: 2,
            bgcolor: '#fff',
          }}
        >
          <Box onClick={() => navigateToChat(item)} sx={{ cursor: 'pointer' }}>
            <Typography>{item.name || item.contact}</Typography>
          </Box>
          <Typography sx={{ color: onlineUsers.includes(item.contact) ? 'green' : 'gray' }}>
            {onlineUsers.includes(item.contact) ? 'Online' : 'Offline'}
          </Typography>
          <Button
            onClick={() => handleDeleteContact(item.contact)}
            color="error"
            size="small"
            sx={{ fontWeight: 'bold' }}
          >
            Remove
          </Button>
        </Paper>
      ))}
    </Box>

    {/* Unknown Users */}
    <Typography variant="h6" fontWeight="bold" mb={1}>
      Messages from Unknown Users
    </Typography>
    <Box sx={{ maxHeight: 160, overflowY: 'auto', mb: 3 }}>
      {unknownSenders.map((item) => (
        <Paper
          key={item}
          elevation={1}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            mb: 1,
            borderRadius: 2,
            bgcolor: '#fff',
          }}
        >
          <Box onClick={() => navigateToChat(item)} sx={{ cursor: 'pointer' }}>
            <Typography>{item}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={() => handleAddFromUnknownUser(item)}
              color="success"
              variant="outlined"
              size="small"
            >
              Add
            </Button>
            <Button
              onClick={() => handleDeleteUnknownSender(item)}
              color="error"
              variant="outlined"
              size="small"
            >
              Delete
            </Button>
          </Box>
        </Paper>
      ))}
    </Box>

    {/* Groups Section */}
    <Typography variant="h6" fontWeight="bold" mb={1}>
      Groups
    </Typography>
    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
      <TextField
        label="Group Name"
        value={newGroupName}
        onChange={(e) => setNewGroupName(e.target.value)}
        fullWidth
        size="small"
        sx={{ bgcolor: '#fff', borderRadius: 1 }}
      />
      <Button
        variant="contained"
        onClick={handleCreateGroup}
        sx={{ bgcolor: '#25D366', '&:hover': { bgcolor: '#1EBE5D' }, px: 3 }}
      >
        Create
      </Button>
    </Box>

    <Box sx={{ maxHeight: 160, overflowY: 'auto' }}>
      {Array.isArray(groups) &&
        groups.map((group) => (
          <Paper
            key={group.id}
            elevation={1}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: 1.5,
              mb: 1,
              borderRadius: 2,
              bgcolor: '#fff',
            }}
          >
            <Box onClick={() => navigateToGroup(group)} sx={{ cursor: 'pointer' }}>
              <Typography fontWeight="medium">{group.name}</Typography>
              <Typography variant="caption" color="textSecondary">
                Admin: {group.admin}
              </Typography>
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
