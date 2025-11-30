import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { ChartData } from '../../types/travel.types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface LineChartProps {
  data: ChartData;
  title?: string;
  height?: number;
  showLegend?: boolean;
  yAxisLabel?: string;
  xAxisLabel?: string;
  currency?: boolean;
  percentage?: boolean;
  stacked?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
  yAxisLabel,
  xAxisLabel,
  currency = false,
  percentage = false,
  stacked = false,
}) => {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
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
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
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
        display: true,
        title: {
          display: !!xAxisLabel,
          text: xAxisLabel,
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        stacked: stacked,
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
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
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Apply default colors if not provided
  const enhancedData = {
    ...data,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      borderColor: dataset.borderColor || getDefaultColor(index),
      backgroundColor: dataset.backgroundColor || getDefaultColor(index, 0.1),
      borderWidth: dataset.borderWidth || 2,
      tension: dataset.tension || 0.4,
      fill: dataset.fill !== undefined ? dataset.fill : false,
    })),
  };

  return (
    <div style={{ height }}>
      <Line options={options} data={enhancedData} />
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