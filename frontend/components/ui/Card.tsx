
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-joey-secondary/70 border border-joey-accent/20 rounded-lg p-6 backdrop-blur-sm shadow-lg ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
