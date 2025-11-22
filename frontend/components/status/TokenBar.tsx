import React from 'react';
import { useChatContext } from '../../context/ChatContext';

const TokenBar: React.FC = () => {
  const { tokenStats } = useChatContext();

  // Don't show the bar if there are no stats yet
  if (!tokenStats) {
    return null;
  }

  const maxTokens = 2048; // Default max context for phi3:mini
  const tokenPercentage = Math.min((tokenStats.totalTokens / maxTokens) * 100, 100);
  const contextPercentage = tokenStats.contextUsedPct || 0;

  return (
    <div className="bg-joey-secondary border-t border-joey-accent px-4 py-2">
      <div className="flex items-center gap-6 text-sm flex-wrap">
        {/* Model name */}
        <div className="flex items-center gap-2">
          <span className="text-joey-text/60">Model:</span>
          <span className="text-joey-accent font-medium">{tokenStats.model}</span>
        </div>

        {/* Tokens usage */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-joey-text/60">Tokens:</span>
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-joey-main rounded-full overflow-hidden">
              <div
                className="h-full bg-joey-accent transition-all duration-300"
                style={{ width: `${tokenPercentage}%` }}
              />
            </div>
          </div>
          <span className="text-joey-accent font-medium text-xs">
            {tokenStats.totalTokens.toLocaleString()}
            <span className="text-joey-text/40 ml-1">
              ({tokenStats.inputTokens}↑ {tokenStats.outputTokens}↓)
            </span>
          </span>
        </div>

        {/* Performance metrics */}
        <div className="flex items-center gap-4">
          {/* Latency */}
          <div className="flex items-center gap-1">
            <span className="text-joey-text/60">⚡</span>
            <span className="text-joey-accent font-medium text-xs">
              {tokenStats.latencyMs}ms
            </span>
          </div>

          {/* Tokens per second */}
          {tokenStats.tps > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-joey-text/60">🚀</span>
              <span className="text-joey-accent font-medium text-xs">
                {tokenStats.tps} t/s
              </span>
            </div>
          )}

          {/* Context usage */}
          {contextPercentage > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-joey-text/60">📊</span>
              <span className="text-joey-accent font-medium text-xs">
                {contextPercentage.toFixed(1)}% ctx
              </span>
            </div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-joey-text/60 text-xs">Active</span>
        </div>
      </div>
    </div>
  );
};

export default TokenBar;
