import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartProps {
  data: {
    labels: string[];
    values: number[];
    colors?: string[];
  };
  title?: string;
  height?: number;
  showLegend?: boolean;
  currency?: boolean;
  percentage?: boolean;
  centerText?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  height = 300,
  showLegend = true,
  currency = false,
  percentage = false,
  centerText,
}) => {
  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.values,
        backgroundColor: data.colors || getDefaultColors(data.values.length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'right' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: {
            size: 12,
          },
        },
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
          label: function(context: TooltipItem<'doughnut'>) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            
            let formattedValue = '';
            if (currency) {
              formattedValue = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value);
            } else {
              formattedValue = new Intl.NumberFormat('en-US').format(value);
            }
            
            return `${label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '70%',
  };

  // Custom plugin to draw center text
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart: any) => {
      if (centerText) {
        const { ctx, chartArea: { width, height } } = chart;
        ctx.restore();
        const fontSize = (height / 114).toFixed(2);
        ctx.font = `bold ${fontSize}em sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(centerText, width / 2, height / 2);
        ctx.save();
      }
    },
  };

  return (
    <div style={{ height }} className="relative">
      <Doughnut 
        options={options} 
        data={chartData} 
        plugins={centerText ? [centerTextPlugin] : []}
      />
    </div>
  );
};

function getDefaultColors(count: number): string[] {
  const baseColors = [
    'rgba(59, 130, 246, 0.8)', // blue
    'rgba(16, 185, 129, 0.8)', // green
    'rgba(251, 146, 60, 0.8)', // orange
    'rgba(147, 51, 234, 0.8)', // purple
    'rgba(236, 72, 153, 0.8)', // pink
    'rgba(245, 158, 11, 0.8)', // amber
    'rgba(6, 182, 212, 0.8)', // cyan
    'rgba(239, 68, 68, 0.8)', // red
  ];
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}