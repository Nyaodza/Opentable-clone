import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ChartData } from '../../types/travel.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  data: ChartData;
  title?: string;
  height?: number;
  showLegend?: boolean;
  horizontal?: boolean;
  stacked?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  currency?: boolean;
  percentage?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
  horizontal = false,
  stacked = false,
  yAxisLabel,
  xAxisLabel,
  currency = false,
  percentage = false,
}) => {
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' as const : 'x' as const,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'bar'>) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (currency) {
              label += new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(context.parsed.y);
            } else if (percentage) {
              label += context.parsed.y.toFixed(1) + '%';
            } else {
              label += new Intl.NumberFormat('en-US').format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: stacked,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel,
        },
        grid: {
          display: !horizontal,
        },
      },
      y: {
        stacked: stacked,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
        },
        grid: {
          display: horizontal,
        },
        ticks: {
          callback: function(tickValue: string | number) {
            const value = typeof tickValue === 'string' ? parseFloat(tickValue) : tickValue;
            if (currency) {
              return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
              }).format(value);
            } else if (percentage) {
              return value.toFixed(0) + '%';
            } else {
              return new Intl.NumberFormat('en-US').format(value);
            }
          },
        },
      },
    },
  };

  // Apply default colors if not provided
  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || getDefaultColor(index, 0.8),
      borderColor: dataset.borderColor || getDefaultColor(index),
      borderWidth: dataset.borderWidth || 1,
    })),
  };

  return (
    <div style={{ height }}>
      <Bar options={options} data={enhancedData} />
    </div>
  );
};

function getDefaultColor(index: number, alpha: number = 1): string {
  const colors = [
    `rgba(59, 130, 246, ${alpha})`, // blue
    `rgba(16, 185, 129, ${alpha})`, // green
    `rgba(251, 146, 60, ${alpha})`, // orange
    `rgba(147, 51, 234, ${alpha})`, // purple
    `rgba(236, 72, 153, ${alpha})`, // pink
    `rgba(245, 158, 11, ${alpha})`, // amber
    `rgba(6, 182, 212, ${alpha})`, // cyan
    `rgba(239, 68, 68, ${alpha})`, // red
  ];
  return colors[index % colors.length];
}