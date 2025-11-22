import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useChatContext } from '../context/ChatContext';
import { getSystemStats } from '../services/apiService';
import type { SystemStats } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const health = useHealthCheck();
  const { messages } = useChatContext();
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  useEffect(() => {
    const loadSystemStats = async () => {
      try {
        const stats = await getSystemStats();
        setSystemStats(stats);
      } catch (error) {
        console.error('[Dashboard] Failed to load system stats:', error);
      }
    };

    if (health.online) {
      loadSystemStats();
      // Refresh stats every 10 seconds
      const interval = setInterval(loadSystemStats, 10000);
      return () => clearInterval(interval);
    }
  }, [health.online]);

  const stats = [
    { 
      label: 'Backend Status', 
      value: health.online ? 'Online' : 'Offline', 
      icon: '💬', 
      color: health.online ? 'text-green-400' : 'text-red-400' 
    },
    { 
      label: 'Messages Sent', 
      value: messages.length.toString(), 
      icon: '📨', 
      color: 'text-joey-accent' 
    },
    { 
      label: 'Active Model', 
      value: health.model || 'None', 
      icon: '🤖', 
      color: 'text-joey-accent' 
    },
    { 
      label: 'CPU Load', 
      value: systemStats ? `${systemStats.cpu_load.toFixed(1)}%` : 'N/A', 
      icon: '⚡', 
      color: 'text-joey-accent' 
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-joey-accent mb-6">
        Joey AI Dashboard
      </h1>

      {/* Health status banner */}
      {!health.online && (
        <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-medium">
            ⚠️ Backend is offline. Please check your connection and ensure the backend server is running.
          </p>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-joey-secondary rounded-lg p-6 border border-joey-accent hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{stat.icon}</span>
              <span className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </span>
            </div>
            <p className="text-joey-text/70">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* System Resources */}
      {systemStats && (
        <div className="bg-joey-secondary rounded-lg p-6 border border-joey-accent mb-8">
          <h2 className="text-xl font-semibold text-joey-accent mb-4">
            System Resources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-joey-text/70">CPU Load</span>
                <span className="text-joey-accent font-medium">{systemStats.cpu_load.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-joey-main rounded-full overflow-hidden">
                <div
                  className="h-full bg-joey-accent transition-all duration-300"
                  style={{ width: `${Math.min(systemStats.cpu_load, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-joey-text/70">RAM Usage</span>
                <span className="text-joey-accent font-medium">
                  {systemStats.ram_usage.toFixed(1)} / {systemStats.ram_total.toFixed(1)} GB
                </span>
              </div>
              <div className="h-2 bg-joey-main rounded-full overflow-hidden">
                <div
                  className="h-full bg-joey-accent transition-all duration-300"
                  style={{ width: `${(systemStats.ram_usage / systemStats.ram_total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-joey-text/70">GPU Load</span>
                <span className="text-joey-accent font-medium">{systemStats.gpu_load.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-joey-main rounded-full overflow-hidden">
                <div
                  className="h-full bg-joey-accent transition-all duration-300"
                  style={{ width: `${Math.min(systemStats.gpu_load, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-joey-text/70">GPU Mode</span>
                <span className="text-joey-accent font-medium">{systemStats.gpu_mode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-joey-secondary rounded-lg p-6 border border-joey-accent mb-8">
        <h2 className="text-xl font-semibold text-joey-accent mb-4">
          Connection Info
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 py-2 border-b border-joey-accent/30">
            <div className={`w-2 h-2 rounded-full ${health.online ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-joey-text/80">
              Backend: {health.online ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-joey-accent/30">
            <div className="w-2 h-2 rounded-full bg-joey-accent" />
            <span className="text-joey-text/80">
              Last checked: {health.lastChecked.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center gap-3 py-2 border-b border-joey-accent/30">
            <div className="w-2 h-2 rounded-full bg-joey-accent" />
            <span className="text-joey-text/80">
              Active model: {health.model || 'None loaded'}
            </span>
          </div>
          <div className="flex items-center gap-3 py-2">
            <div className="w-2 h-2 rounded-full bg-joey-accent" />
            <span className="text-joey-text/80">
              Messages in session: {messages.length}
            </span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/')}
          disabled={!health.online}
          className="bg-joey-accent text-joey-main rounded-lg p-4 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start New Chat
        </button>
        <button
          onClick={() => navigate('/models')}
          className="bg-joey-secondary border border-joey-accent text-joey-text rounded-lg p-4 font-medium hover:bg-joey-accent/10 transition-colors"
        >
          View Models
        </button>
        <button
          onClick={() => navigate('/system')}
          className="bg-joey-secondary border border-joey-accent text-joey-text rounded-lg p-4 font-medium hover:bg-joey-accent/10 transition-colors"
        >
          System Status
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
