
import React, { useState } from 'react';
import Card from '../ui/Card';
import { useAppContext } from '../../hooks/useAppContext';
import { restartBackend, reloadModels } from '../../services/apiService';

const System: React.FC = () => {
    const { systemStats } = useAppContext();
    const [isLoadingRestart, setIsLoadingRestart] = useState(false);
    const [isLoadingReload, setIsLoadingReload] = useState(false);
    const [feedback, setFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const handleRestart = async () => {
        setIsLoadingRestart(true);
        setFeedback(null);
        try {
            await restartBackend();
            setFeedback({message: 'Backend restart initiated. It may take a moment to reconnect.', type: 'success'});
        } catch (error) {
            setFeedback({message: 'Failed to restart backend.', type: 'error'});
        } finally {
            setIsLoadingRestart(false);
        }
    };
    
    const handleReload = async () => {
        setIsLoadingReload(true);
        setFeedback(null);
        try {
            await reloadModels();
            setFeedback({message: 'Model list successfully reloaded.', type: 'success'});
        } catch (error) {
            setFeedback({message: 'Failed to reload models.', type: 'error'});
        } finally {
            setIsLoadingReload(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-4xl font-bold text-joey-text">System Tools</h2>
            
            {feedback && (
                <div className={`p-4 rounded-lg ${feedback.type === 'success' ? 'bg-joey-success/20 text-joey-success' : 'bg-joey-danger/20 text-joey-danger'}`}>
                    {feedback.message}
                </div>
            )}

            <Card>
                <h3 className="text-2xl font-semibold mb-4">System Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h4 className="font-semibold text-joey-text">Restart Backend</h4>
                        <p className="text-sm text-joey-text-darker">Gracefully restarts the Python Flask server. The UI will temporarily disconnect.</p>
                        <button onClick={handleRestart} disabled={isLoadingRestart} className="mt-2 px-4 py-2 bg-joey-warning/80 text-black font-semibold rounded-lg hover:bg-joey-warning transition-colors disabled:opacity-50">
                            {isLoadingRestart ? 'Restarting...' : 'Restart Backend'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-semibold text-joey-text">Reload Models</h4>
                        <p className="text-sm text-joey-text-darker">Forces a rescan of the local Ollama models directory.</p>
                        <button onClick={handleReload} disabled={isLoadingReload} className="mt-2 px-4 py-2 bg-joey-accent text-white font-semibold rounded-lg hover:bg-joey-accent-hover transition-colors disabled:opacity-50">
                            {isLoadingReload ? 'Reloading...' : 'Reload Models'}
                        </button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="text-2xl font-semibold mb-2">GPU Status</h3>
                <div className="flex items-center space-x-4">
                    <p className="text-joey-text-darker">Current Mode:</p>
                    <span className="px-3 py-1 bg-joey-accent/30 text-joey-accent font-mono font-bold rounded-full">{systemStats?.gpu_mode || 'N/A'}</span>
                </div>
            </Card>
        </div>
    );
};

export default System;
