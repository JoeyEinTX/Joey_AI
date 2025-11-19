import React from 'react';
import { useAppContext } from '../context/AppContext';

const Header: React.FC = () => {
  const { backendStatus } = useAppContext();

  const getStatusColor = () => {
    switch (backendStatus) {
      case 'ok': return 'green';
      case 'error': return 'red';
      case 'loading': return 'gray';
      default: return 'gray';
    }
  };

  return (
    <header id="topbar" className="header">
      <div className="brand">
        <img className="brand-logo" src="/static/img/joey_ai_main_logo.png" alt="JoeyAI" />
        <span className="brand-name">JoeyAI</span>
      </div>

      {/* Inline Ollama Status Badge - positioned left of model controls */}
      <span id="ollama-status-badge" className="connected">Ollama Connected</span>

      <div className="model-controls">
        <div className="control-group">
          <label htmlFor="model-select">Model:</label>
          <div className="model-selector">
            <select id="model-select" className="control-input">
              <option value="">Loading...</option>
            </select>
            <button id="refresh-models-btn" className="refresh-btn" title="Refresh models">↻</button>
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="temperature-slider">Temp:</label>
          <div className="temperature-control">
            <input type="range" id="temperature-slider" min="0" max="1" step="0.1" value="0.7" className="control-slider" />
            <span id="temperature-value">0.7</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        <span
          style={{ color: getStatusColor(), fontSize: '1.2em' }}
          title={`Backend Status: ${backendStatus}`}
        >
          ●
        </span>
        <button id="gear-btn" className="gear-btn" aria-haspopup="true" aria-expanded="false">⚙️</button>
        <div id="gear-menu" className="gear-menu" role="menu" hidden>
          <div className="menu-title">JoeyAI</div>
          <button className="menu-item" data-action="memory">Memory</button>
          <label className="menu-item checkbox">
            <input id="autosave-toggle" type="checkbox" checked />
            Auto-save Chats
          </label>
          <button className="menu-item" data-action="settings">Settings…</button>
          <button className="menu-item" data-action="about">About</button>
        </div>
      </div>
    </header>
  );
};

export default Header;
