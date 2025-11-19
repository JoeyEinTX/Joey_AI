
import React from 'react';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string;
  unit: string;
  progress?: number; // 0 to 100
  color: 'success' | 'warning' | 'danger' | 'accent';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, unit, progress, color }) => {
  const colorMap = {
    success: 'bg-joey-success',
    warning: 'bg-joey-warning',
    danger: 'bg-joey-danger',
    accent: 'bg-joey-accent',
  };
  const shadowColorMap = {
    success: 'shadow-[0_0_8px_#00ff7f]',
    warning: 'shadow-[0_0_8px_#ffd700]',
    danger: 'shadow-[0_0_8px_#ff4d4d]',
    accent: 'shadow-[0_0_8px_#00bfff]',
  }

  const barColor = colorMap[color];
  const shadowColor = shadowColorMap[color];


  return (
    <Card className="flex flex-col justify-between">
      <div>
        <h3 className="text-joey-text-darker font-semibold">{title}</h3>
        <p className="text-4xl font-bold text-joey-text mt-2">
          {value} <span className="text-2xl text-joey-text-darker">{unit}</span>
        </p>
      </div>
      {progress !== undefined && (
        <div className="w-full bg-joey-main rounded-full h-2.5 mt-4">
          <div
            className={`${barColor} ${shadowColor} h-2.5 rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
