
import React from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import StatCard from '../ui/StatCard';
import Card from '../ui/Card';

const Dashboard: React.FC = () => {
  const { systemStats, backendStatus, selectedModel } = useAppContext();

  const getStatusIndicator = () => {
    switch (backendStatus) {
      case 'connected':
        return <div className="w-4 h-4 rounded-full bg-joey-success shadow-[0_0_8px_#00ff7f]"></div>;
      case 'disconnected':
        return <div className="w-4 h-4 rounded-full bg-joey-danger shadow-[0_0_8px_#ff4d4d]"></div>;
      case 'loading':
        return <div className="w-4 h-4 rounded-full bg-joey-warning animate-pulse"></div>;
    }
  };
  
  const getRamColor = (usage: number, total: number) => {
    const percentage = (usage / total) * 100;
    if (percentage > 85) return 'danger';
    if (percentage > 60) return 'warning';
    return 'success';
  }

  const getLoadColor = (load: number) => {
    if (load > 85) return 'danger';
    if (load > 60) return 'warning';
    return 'success';
  }


  return (
    <div className="space-y-8">
      <h2 className="text-4xl font-bold text-joey-text">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
            <h3 className="text-joey-text-darker font-semibold">Backend Status</h3>
            <div className="flex items-center space-x-3 mt-3">
                {getStatusIndicator()}
                <span className="text-2xl font-bold capitalize">{backendStatus}</span>
            </div>
        </Card>
        <Card>
            <h3 className="text-joey-text-darker font-semibold">Active Model</h3>
            <p className="text-2xl font-bold mt-3 truncate">{selectedModel || 'None Selected'}</p>
        </Card>
        <Card>
            <h3 className="text-joey-text-darker font-semibold">GPU Mode</h3>
            <p className="text-2xl font-bold mt-3">{systemStats?.gpu_mode || 'N/A'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {systemStats ? (
          <>
            <StatCard 
              title="CPU Load" 
              value={systemStats.cpu_load.toFixed(1)} 
              unit="%" 
              progress={systemStats.cpu_load}
              color={getLoadColor(systemStats.cpu_load)}
            />
            <StatCard 
              title="GPU Load" 
              value={systemStats.gpu_load.toFixed(1)} 
              unit="%" 
              progress={systemStats.gpu_load}
              color={getLoadColor(systemStats.gpu_load)}
            />
            <StatCard 
              title="RAM Usage" 
              value={systemStats.ram_usage.toFixed(2)} 
              unit={`/ ${systemStats.ram_total.toFixed(1)} GB`}
              progress={(systemStats.ram_usage / systemStats.ram_total) * 100}
              color={getRamColor(systemStats.ram_usage, systemStats.ram_total)}
            />
          </>
        ) : (
          [...Array(3)].map((_, i) => (
             <Card key={i} className="animate-pulse h-40">
                <div className="h-4 bg-joey-secondary rounded w-1/3"></div>
                <div className="h-8 bg-joey-secondary rounded w-1/2 mt-4"></div>
                <div className="h-2.5 bg-joey-secondary rounded-full mt-6"></div>
             </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;
