import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useHealthCheck } from '../hooks/useHealthCheck';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const health = useHealthCheck();

  const features = [
    {
      icon: '💬',
      title: 'Natural Conversations',
      description: 'Chat with AI models using natural language',
    },
    {
      icon: '🤖',
      title: 'Multiple Models',
      description: 'Choose from various AI models for different tasks',
    },
    {
      icon: '⚡',
      title: 'Fast Response',
      description: 'Get quick, intelligent responses to your queries',
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'Your conversations are secure and private',
    },
  ];

  return (
    <div className="min-h-full flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-joey-accent mb-4">
            Welcome to Joey AI
          </h1>
          <p className="text-xl text-joey-text/70 mb-8">
            Your intelligent AI assistant powered by advanced language models
          </p>
          {!health.online && (
            <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                ⚠️ Backend is offline. Please ensure the backend server is running.
              </p>
            </div>
          )}
          <button
            onClick={() => navigate('/')}
            disabled={!health.online}
            className="px-8 py-4 bg-joey-accent text-joey-main rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {health.online ? 'Start Chatting' : 'Backend Offline'}
          </button>
          {health.online && health.model && (
            <p className="text-sm text-joey-text/60 mt-2">
              Using model: <span className="text-joey-accent font-medium">{health.model}</span>
            </p>
          )}
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-joey-secondary rounded-lg p-6 border border-joey-accent hover:shadow-lg transition-shadow"
            >
              <div className="text-4xl mb-3">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-joey-accent mb-2">
                {feature.title}
              </h3>
              <p className="text-joey-text/70">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Getting started */}
        <div className="bg-joey-secondary rounded-lg p-6 border border-joey-accent">
          <h2 className="text-2xl font-semibold text-joey-accent mb-4">
            Getting Started
          </h2>
          <ol className="space-y-3 text-joey-text/80">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-joey-accent text-joey-main flex items-center justify-center text-sm font-bold">
                1
              </span>
              <span>Click "Start Chatting" to begin a conversation</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-joey-accent text-joey-main flex items-center justify-center text-sm font-bold">
                2
              </span>
              <span>Type your message or question in the input box</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-joey-accent text-joey-main flex items-center justify-center text-sm font-bold">
                3
              </span>
              <span>Get intelligent responses from AI models</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-joey-accent text-joey-main flex items-center justify-center text-sm font-bold">
                4
              </span>
              <span>Explore dashboard, models, and settings options</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
