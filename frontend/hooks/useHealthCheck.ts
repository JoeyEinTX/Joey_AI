import { useState, useEffect } from 'react';
import { getHealth } from '../services/apiService';

export interface HealthStatus {
  online: boolean;
  model: string | null;
  lastChecked: Date;
  checking: boolean;
}

export const useHealthCheck = (intervalMs: number = 5000) => {
  const [health, setHealth] = useState<HealthStatus>({
    online: false,
    model: null,
    lastChecked: new Date(),
    checking: true,
  });

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      if (!mounted) return;
      
      try {
        setHealth(prev => ({ ...prev, checking: true }));
        const result = await getHealth();
        
        if (!mounted) return;
        
        setHealth({
          online: result.status === 'ok',
          model: result.active_model,
          lastChecked: new Date(),
          checking: false,
        });
      } catch (error) {
        console.error('[useHealthCheck] Error:', error);
        if (!mounted) return;
        
        setHealth({
          online: false,
          model: null,
          lastChecked: new Date(),
          checking: false,
        });
      }
    };

    // Initial check
    checkHealth();

    // Set up interval for periodic checks
    const interval = setInterval(checkHealth, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return health;
};
