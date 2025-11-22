import React from 'react';

const Dashboard: React.FC = () => {
  // Placeholder data - will be connected to backend in next phase
  const stats = [
    { label: 'Total Conversations', value: '24', icon: '💬' },
    { label: 'Messages Sent', value: '156', icon: '📨' },
    { label: 'Models Available', value: '3', icon: '🤖' },
    { label: 'Uptime', value: '99.9%', icon: '⚡' },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-joey-accent mb-6">
        Joey AI Dashboard
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="bg-joey-secondary rounded-lg p-6 border border-joey-accent hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl">{stat.icon}</span>
              <span className="text-2xl font-bold text-joey-accent">
                {stat.value}
              </span>
            </div>
            <p className="text-joey-text/70">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-joey-secondary rounded-lg p-6 border border-joey-accent">
        <h2 className="text-xl font-semibold text-joey-accent mb-4">
          Recent Activity
        </h2>
        <div className="space-y-3">
          {[
            'Chat session started - 2 minutes ago',
            'Model llama3.2 loaded - 15 minutes ago',
            'System check completed - 1 hour ago',
            'Settings updated - 3 hours ago',
          ].map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 py-2 border-b border-joey-accent/30 last:border-0"
            >
              <div className="w-2 h-2 rounded-full bg-joey-accent" />
              <span className="text-joey-text/80">{activity}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <button className="bg-joey-accent text-joey-main rounded-lg p-4 font-medium hover:opacity-90 transition-opacity">
          Start New Chat
        </button>
        <button className="bg-joey-secondary border border-joey-accent text-joey-text rounded-lg p-4 font-medium hover:bg-joey-accent/10 transition-colors">
          View Models
        </button>
        <button className="bg-joey-secondary border border-joey-accent text-joey-text rounded-lg p-4 font-medium hover:bg-joey-accent/10 transition-colors">
          System Status
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
