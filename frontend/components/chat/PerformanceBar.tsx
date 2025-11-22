import React from 'react';

export interface PerformanceMetrics {
  model?: string;
  tps?: number;               // tokens per second
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  context_used_pct?: number;
}

interface PerformanceBarProps {
  metrics: PerformanceMetrics | null;
}

const PerformanceBar: React.FC<PerformanceBarProps> = ({ metrics }) => {
  // Don't render if no metrics
  if (!metrics) return null;

  // Don't render if no meaningful data
  if (!metrics.model && !metrics.tps && !metrics.latency_ms) return null;

  return (
    <div className="w-full px-3 py-2 mb-4 bg-joey-secondary/40 backdrop-blur-sm rounded-xl border border-joey-secondary/60 shadow-md">
      <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-joey-text/80">
        {metrics.model && (
          <span className="font-semibold text-joey-text">
            {metrics.model}
          </span>
        )}
        
        {metrics.tps && (
          <span className="flex items-center gap-1">
            <span>⚡</span>
            <span>{metrics.tps} t/s</span>
          </span>
        )}
        
        {(metrics.input_tokens !== undefined && metrics.output_tokens !== undefined) && (
          <span className="flex items-center gap-1">
            <span>🔢</span>
            <span>{metrics.input_tokens} → {metrics.output_tokens}</span>
          </span>
        )}
        
        {metrics.latency_ms && (
          <span className="flex items-center gap-1">
            <span>🕒</span>
            <span>{metrics.latency_ms} ms</span>
          </span>
        )}
        
        {metrics.context_used_pct !== undefined && (
          <span className="flex items-center gap-1">
            <span>🧠</span>
            <span>{metrics.context_used_pct}% ctx</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default PerformanceBar;
