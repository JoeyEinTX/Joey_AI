
import React from 'react';
import type { TestScenario } from '../../types';

interface DeveloperToolsProps {
  currentScenario: TestScenario;
  onScenarioChange: (scenario: TestScenario) => void;
}

const scenarios: { id: TestScenario; label: string }[] = [
  { id: 'normal', label: 'Normal' },
  { id: 'error', label: 'Error' },
  { id: 'long', label: 'Long Text' },
  { id: 'code', label: 'Code Only' },
  { id: 'no-response', label: 'No Response' },
];

const DeveloperTools: React.FC<DeveloperToolsProps> = ({ currentScenario, onScenarioChange }) => {
  return (
    <div className="bg-joey-secondary/80 border border-joey-warning/30 rounded-lg p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-joey-warning">Developer Tools</h4>
        <p className="text-xs text-joey-text-darker">Select Mock Response:</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {scenarios.map(scenario => (
          <button
            key={scenario.id}
            onClick={() => onScenarioChange(scenario.id)}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              currentScenario === scenario.id
                ? 'bg-joey-warning text-black'
                : 'bg-joey-main hover:bg-joey-main/50'
            }`}
          >
            {scenario.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DeveloperTools;
