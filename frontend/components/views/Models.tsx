
import React, { useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';

const Models: React.FC = () => {
  const { models, selectedModel, setSelectedModel, isLoadingModels, fetchModels } = useAppContext();

  useEffect(() => {
    if (models.length === 0) {
      fetchModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-4xl font-bold text-joey-text">Local Models</h2>
        <button onClick={fetchModels} disabled={isLoadingModels} className="px-4 py-2 bg-joey-accent rounded-lg font-semibold hover:bg-joey-accent-hover transition-colors disabled:opacity-50">
            {isLoadingModels ? 'Refreshing...' : 'Refresh List'}
        </button>
      </div>
      
      <div className="bg-joey-secondary/70 border border-joey-accent/20 rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-joey-secondary">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Size</th>
              <th className="p-4">Last Modified</th>
              <th className="p-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingModels && [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse border-t border-joey-accent/10">
                    <td className="p-4"><div className="h-5 bg-joey-main rounded w-3/4"></div></td>
                    <td className="p-4"><div className="h-5 bg-joey-main rounded w-1/2"></div></td>
                    <td className="p-4"><div className="h-5 bg-joey-main rounded w-1/2"></div></td>
                    <td className="p-4"><div className="h-8 bg-joey-main rounded w-24"></div></td>
                </tr>
            ))}
            {!isLoadingModels && models.map((model) => (
              <tr key={model.name} className="border-t border-joey-accent/10 hover:bg-joey-secondary/50">
                <td className="p-4 font-mono font-semibold">{model.name}</td>
                <td className="p-4">{formatBytes(model.size)}</td>
                <td className="p-4">{formatDate(model.modified_at)}</td>
                <td className="p-4">
                  <button
                    onClick={() => setSelectedModel(model.name)}
                    disabled={selectedModel === model.name}
                    className="px-4 py-2 text-sm rounded-lg font-semibold transition-colors
                      disabled:bg-joey-success disabled:text-white disabled:cursor-not-allowed
                      bg-joey-accent text-white hover:bg-joey-accent-hover"
                  >
                    {selectedModel === model.name ? 'Active' : 'Select'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
         {!isLoadingModels && models.length === 0 && (
            <div className="text-center p-8 text-joey-text-darker">
                No local models found.
            </div>
        )}
      </div>
    </div>
  );
};

export default Models;
