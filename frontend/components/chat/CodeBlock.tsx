
import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 font-mono text-sm">
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-joey-main border border-joey-accent/30 text-xs rounded-md text-joey-text opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ 
            margin: 0, 
            padding: '1rem', 
            borderRadius: '0.5rem',
            backgroundColor: 'var(--joey-main)'
        }}
        codeTagProps={{
            style: {
                fontFamily: '"Fira Code", monospace'
            }
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;