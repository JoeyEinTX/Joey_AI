
import React from 'react';
import Card from '../ui/Card';
import { useAppContext } from '../../hooks/useAppContext';
import type { Theme } from '../../types';

const themes: { id: Theme; name: string }[] = [
  { id: 'neon-cyber', name: 'Neon-Cyber' },
  { id: 'classic-dark', name: 'Classic Dark' },
  { id: 'light', name: 'Light Mode' },
];

const Settings: React.FC = () => {
  const { theme, setTheme, isDeveloperMode, setIsDeveloperMode } = useAppContext();

  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-joey-text">Settings</h2>
      
      <Card>
        <h3 className="text-2xl font-semibold mb-4 border-b border-joey-accent/20 pb-2">API Keys</h3>
        <p className="text-joey-text-darker">
          This section will be used for managing external API keys in the future (e.g., for grounded search or external tools).
        </p>
        <div className="mt-4 flex items-center space-x-4">
            <input type="text" placeholder="Future API Key Input" className="flex-1 bg-joey-main p-2 rounded-lg border border-joey-accent/30 focus:outline-none focus:ring-2 focus:ring-joey-accent" />
            <button className="px-4 py-2 bg-joey-secondary rounded-lg font-semibold hover:bg-joey-secondary/50">Save</button>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-2xl font-semibold mb-4 border-b border-joey-accent/20 pb-2">UI Theme</h3>
        <p className="text-joey-text-darker mb-4">
          Select your preferred UI theme. Your choice will be saved locally.
        </p>
         <div className="flex flex-wrap gap-4">
            {themes.map((themeOption) => (
               <button 
                key={themeOption.id}
                onClick={() => setTheme(themeOption.id)}
                className={`px-4 py-2 border-2 rounded-lg font-semibold transition-colors ${
                    theme === themeOption.id 
                    ? 'border-joey-accent text-joey-accent' 
                    : 'border-joey-text-darker text-joey-text-darker hover:border-joey-text hover:text-joey-text'
                }`}
                >
                    {themeOption.name} {theme === themeOption.id && '(Active)'}
                </button>
            ))}
         </div>
      </Card>

       <Card>
        <h3 className="text-2xl font-semibold mb-4 border-b border-joey-accent/20 pb-2">Developer Mode</h3>
        <div className="flex items-center justify-between">
            <div>
                 <p className="text-joey-text">Enable Developer Mode</p>
                 <p className="text-sm text-joey-text-darker">Show mock response scenarios and debug tools in the chat view.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isDeveloperMode}
                onChange={(e) => setIsDeveloperMode(e.target.checked)}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-joey-main peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-joey-accent"></div>
            </label>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
