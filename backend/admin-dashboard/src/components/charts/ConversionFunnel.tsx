import React from 'react';
import { FaArrowDown } from 'react-icons/fa';

interface FunnelStep {
  label: string;
  value: number;
  percentage?: number;
}

interface ConversionFunnelProps {
  steps: FunnelStep[];
  title?: string;
  showPercentages?: boolean;
  colorScheme?: 'blue' | 'green' | 'purple';
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  steps,
  title,
  showPercentages = true,
  colorScheme = 'blue',
}) => {
  const maxValue = Math.max(...steps.map(step => step.value));
  
  const getColorClass = (index: number) => {
    const schemes = {
      blue: ['bg-blue-600', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300'],
      green: ['bg-green-600', 'bg-green-500', 'bg-green-400', 'bg-green-300'],
      purple: ['bg-purple-600', 'bg-purple-500', 'bg-purple-400', 'bg-purple-300'],
    };
    return schemes[colorScheme][index % schemes[colorScheme].length];
  };

  const calculatePercentage = (value: number, previousValue?: number) => {
    if (previousValue) {
      return ((value / previousValue) * 100).toFixed(1);
    }
    return '100';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
      )}
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const widthPercentage = (step.value / maxValue) * 100;
          const conversionRate = index > 0 
            ? calculatePercentage(step.value, steps[index - 1].value)
            : '100';
          
          return (
            <div key={index}>
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {step.label}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Intl.NumberFormat('en-US').format(step.value)}
                    </span>
                    {showPercentages && index > 0 && (
                      <span className="text-sm text-gray-500">
                        {conversionRate}% conversion
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getColorClass(index)}`}
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>
                  
                  {step.percentage !== undefined && (
                    <div 
                      className="absolute top-1/2 transform -translate-y-1/2 text-white text-sm font-medium"
                      style={{ left: `${Math.min(widthPercentage - 5, 85)}%` }}
                    >
                      {step.percentage}%
                    </div>
                  )}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className="flex justify-center my-2">
                  <FaArrowDown className="text-gray-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Overall Conversion Rate</span>
          <span className="text-lg font-bold text-gray-900">
            {calculatePercentage(steps[steps.length - 1].value, steps[0].value)}%
          </span>
        </div>
      </div>
    </div>
  );
};