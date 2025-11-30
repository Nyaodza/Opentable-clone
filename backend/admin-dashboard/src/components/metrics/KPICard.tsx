import React from 'react';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { clsx } from 'clsx';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage';
  trend?: 'up' | 'down' | 'stable';
  onClick?: () => void;
  loading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  format = 'number',
  trend,
  onClick,
  loading = false,
}) => {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    if (!trend && change === undefined) return null;
    
    const actualTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'stable') : 'stable');
    
    switch (actualTrend) {
      case 'up':
        return <FaArrowUp className="w-3 h-3" />;
      case 'down':
        return <FaArrowDown className="w-3 h-3" />;
      default:
        return <FaMinus className="w-3 h-3" />;
    }
  };

  const getTrendColor = () => {
    if (!trend && change === undefined) return 'text-gray-500';
    
    const actualTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'stable') : 'stable');
    
    switch (actualTrend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow p-6 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg'
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-bold text-gray-900">
          {formatValue(value)}
        </p>
        
        {(change !== undefined || trend) && (
          <div className={clsx('flex items-center gap-1 text-sm', getTrendColor())}>
            {getTrendIcon()}
            {change !== undefined && (
              <span className="font-medium">
                {change > 0 && '+'}
                {change.toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
      
      {changeLabel && (change !== undefined || trend) && (
        <p className="text-xs text-gray-500 mt-1">{changeLabel}</p>
      )}
    </div>
  );
};