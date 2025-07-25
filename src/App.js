// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginScreen from './screens/Loginscreen';
import UserListScreen from './screens/UserListScreen';
import PrivateChatScreen from './screens/PrivateChatScreen';
import Registerscreen from './screens/Registerscreen';
import GroupChatScreen from './screens/groupChatscreen';
const App = () => {
  return (
    <Routes>
      <Route path="/register" element={<Registerscreen/>} />
      <Route path="/" element={<LoginScreen />} />
      <Route path="/userlist" element={<UserListScreen />} />
      <Route path="/privatechat" element={<PrivateChatScreen />} />
      <Route path="/groupchat" element={<GroupChatScreen />} />
    </Routes>
  );
};

export default App;