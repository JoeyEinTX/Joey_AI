import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Chat from '../pages/Chat';
import Dashboard from '../pages/Dashboard';
import Welcome from '../pages/Welcome';
import Models from '../components/views/Models';
import System from '../components/views/System';
import Settings from '../components/views/Settings';

const AppRouter: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Chat />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/models" element={<Models />} />
      <Route path="/system" element={<System />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
};

export default AppRouter;
