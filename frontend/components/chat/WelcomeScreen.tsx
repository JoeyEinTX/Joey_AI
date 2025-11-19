import React from 'react';
import ChatInput from './ChatInput';
import DeveloperTools from './DeveloperTools';
import type { TestScenario, BackendStatus } from '../../types';

interface WelcomeScreenProps {
  selectedModel: string | null;
  isDeveloperMode: boolean;
  testScenario: TestScenario;
  onScenarioChange: (scenario: TestScenario) => void;
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  backendStatus: BackendStatus;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  selectedModel,
  isDeveloperMode,
  testScenario,
  onScenarioChange,
  onSendMessage,
  isLoading,
  backendStatus,
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
      <div className="flex-grow flex flex-col items-center justify-center">
        <h1 className="text-6xl font-bold text-joey-accent mb-4" style={{textShadow: '0 0 10px #00bfff'}}>Joey_AI</h1>
        <p className="text-joey-text-darker">Model: {selectedModel || 'None Selected'}</p>
      </div>
      <div className="w-full max-w-3xl mb-8">
        {isDeveloperMode && <DeveloperTools currentScenario={testScenario} onScenarioChange={onScenarioChange} />}
        <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} isDisabled={backendStatus !== 'connected'} />
      </div>
    </div>
  );
};

export default WelcomeScreen;
