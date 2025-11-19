
import React from 'react';
import type { View } from '../../types';
import { useAppContext } from '../../hooks/useAppContext';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavItem: React.FC<{
  view: View;
  label: string;
  icon: React.ReactElement;
  currentView: View;
  onClick: (view: View) => void;
}> = ({ view, label, icon, currentView, onClick }) => {
  const isActive = currentView === view;
  return (
    <button
      onClick={() => onClick(view)}
      className={`flex items-center w-full px-4 py-3 text-left transition-all duration-200 rounded-lg ${
        isActive
          ? 'bg-joey-accent text-white shadow-neon-sm'
          : 'text-joey-text-darker hover:bg-joey-secondary hover:text-joey-text'
      }`}
    >
      <span className="mr-4">{icon}</span>
      <span className="font-semibold">{label}</span>
    </button>
  );
};

const RightDrawer: React.FC<RightDrawerProps> = ({ isOpen, onClose, currentView, setCurrentView }) => {
  const { 
    chatSessions, 
    currentChatId, 
    setCurrentChatId, 
    createNewChat, 
    deleteChat, 
    isLoadingSessions 
  } = useAppContext();

  const handleSelectChat = (id: string) => {
    setCurrentChatId(id);
    setCurrentView('chat');
    onClose();
  }

  const handleNewChat = () => {
    createNewChat();
    setCurrentView('chat');
    onClose();
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm('Are you sure you want to delete this chat?')) {
        deleteChat(id);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      ></div>

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-72 bg-joey-secondary/90 backdrop-blur-md p-4 flex flex-col border-l border-joey-accent/20 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-joey-text">Chat History</h2>
          <button onClick={handleNewChat} className="p-2 rounded-md hover:bg-joey-accent/20">
            <NewChatIcon />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-2">
            {isLoadingSessions && <p className="text-joey-text-darker">Loading chats...</p>}
            {!isLoadingSessions && chatSessions.map(session => (
                <div key={session.id} 
                    onClick={() => handleSelectChat(session.id)}
                    className={`group w-full p-3 text-left rounded-lg cursor-pointer transition-colors ${
                        currentChatId === session.id && currentView === 'chat'
                        ? 'bg-joey-accent/20'
                        : 'hover:bg-joey-main'
                    }`}>
                    <div className="flex justify-between items-start">
                        <p className="font-semibold text-joey-text text-sm truncate pr-2">{session.title}</p>
                        <button onClick={(e) => handleDelete(e, session.id)} className="opacity-0 group-hover:opacity-100 text-joey-text-darker hover:text-joey-danger transition-opacity flex-shrink-0">
                            <TrashIcon />
                        </button>
                    </div>
                    <p className="text-xs text-joey-text-darker mt-1">
                        {new Date(session.created_at).toLocaleDateString()}
                    </p>
                </div>
            ))}
        </div>

        <div className="pt-4 border-t border-joey-accent/20">
             <nav className="flex flex-col space-y-2">
              <NavItem
                view="dashboard"
                label="Dashboard"
                icon={<DashboardIcon />}
                currentView={currentView}
                onClick={setCurrentView}
              />
              <NavItem
                view="models"
                label="Models"
                icon={<ModelsIcon />}
                currentView={currentView}
                onClick={setCurrentView}
              />
              <NavItem
                view="system"
                label="System Tools"
                icon={<SystemIcon />}
                currentView={currentView}
                onClick={setCurrentView}
              />
              <NavItem
                view="settings"
                label="Settings"
                icon={<SettingsIcon />}
                currentView={currentView}
                onClick={setCurrentView}
              />
            </nav>
        </div>

        <div className="mt-4 text-center text-joey-text-darker text-sm">
            <p>UI v1.2.0</p>
        </div>
      </aside>
    </>
  );
};

// SVG Icons
const NewChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
const ModelsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
const SystemIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 16v-2m8-8h2M4 12H2m15.364 6.364l1.414 1.414M5.636 5.636l1.414 1.414m12.728 0l-1.414 1.414M6.343 17.657l-1.414 1.414" /></svg>;


export default RightDrawer;