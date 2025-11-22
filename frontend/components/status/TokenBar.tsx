import React from 'react';

const TokenBar: React.FC = () => {
  // Stubbed values for now - will be connected to backend in next phase
  const mockData = {
    tokensUsed: 1250,
    tokensLimit: 10000,
    rpm: 15,
    rpmLimit: 60,
  };

  const tokenPercentage = (mockData.tokensUsed / mockData.tokensLimit) * 100;
  const rpmPercentage = (mockData.rpm / mockData.rpmLimit) * 100;

  return (
    <div className="bg-joey-secondary border-t border-joey-accent px-4 py-2">
      <div className="flex items-center gap-6 text-sm">
        {/* Tokens usage */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-joey-text/60">Tokens:</span>
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-joey-main rounded-full overflow-hidden">
              <div
                className="h-full bg-joey-accent transition-all duration-300"
                style={{ width: `${tokenPercentage}%` }}
              />
            </div>
          </div>
          <span className="text-joey-accent font-medium">
            {mockData.tokensUsed.toLocaleString()} / {mockData.tokensLimit.toLocaleString()}
          </span>
        </div>

        {/* RPM usage */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-joey-text/60">RPM:</span>
          <div className="flex-1 max-w-xs">
            <div className="h-2 bg-joey-main rounded-full overflow-hidden">
              <div
                className="h-full bg-joey-accent transition-all duration-300"
                style={{ width: `${rpmPercentage}%` }}
              />
            </div>
          </div>
          <span className="text-joey-accent font-medium">
            {mockData.rpm} / {mockData.rpmLimit}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-joey-text/60">Connected</span>
        </div>
      </div>
    </div>
  );
};

export default TokenBar;
