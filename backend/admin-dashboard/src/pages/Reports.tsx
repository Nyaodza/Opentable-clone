import React, { useState } from 'react';
import { DateRangePicker } from '../components/filters/DateRangePicker';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  FaFileAlt, FaDownload, FaCalendarAlt, FaClock,
  FaChartBar, FaFilePdf, FaFileCsv, FaFileExcel 
} from 'react-icons/fa';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Report {
  id: string;
  name: string;
  type: 'performance' | 'revenue' | 'bookings' | 'users' | 'marketing' | 'custom';
  format: 'pdf' | 'csv' | 'excel';
  status: 'completed' | 'processing' | 'scheduled' | 'failed';
  size: string;
  createdAt: string;
  scheduledFor?: string;
  downloadUrl?: string;
}

export const Reports: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'last30days' as const,
  });

  const [selectedReportType, setSelectedReportType] = useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const { data: reports, isLoading, refetch } = useQuery<Report[]>(
    ['reports', selectedReportType],
    async () => {
      const response = await axios.get(`${API_URL}/admin/travel/reports`, {
        params: { type: selectedReportType },
      });
      return response.data;
    },
    {
      placeholderData: getPlaceholderReports(),
    }
  );

  const handleGenerateReport = async (reportConfig: any) => {
    try {
      await axios.post(`${API_URL}/admin/travel/reports/generate`, reportConfig);
      setShowGenerateModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const handleDownloadReport = async (report: Report) => {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FaFilePdf className="text-red-500" />;
      case 'csv':
        return <FaFileCsv className="text-green-500" />;
      case 'excel':
        return <FaFileExcel className="text-green-600" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading reports...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <FaChartBar />
          Generate Report
        </button>
      </div>

      {/* Report Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'performance', 'revenue', 'bookings', 'users', 'marketing', 'custom'].map((type) => (
          <button
            key={type}
            onClick={() => setSelectedReportType(type)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedReportType === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Scheduled Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports?.filter(r => r.status === 'scheduled').map((report) => (
            <div key={report.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getFormatIcon(report.format)}
                  <h3 className="font-medium">{report.name}</h3>
                </div>
                {getStatusBadge(report.status)}
              </div>
              <p className="text-sm text-gray-600 mb-2">Type: {report.type}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FaCalendarAlt />
                <span>Scheduled for {format(new Date(report.scheduledFor!), 'MMM dd, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Recent Reports</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-3 px-6">Report Name</th>
                <th className="text-left py-3 px-6">Type</th>
                <th className="text-left py-3 px-6">Format</th>
                <th className="text-left py-3 px-6">Status</th>
                <th className="text-left py-3 px-6">Size</th>
                <th className="text-left py-3 px-6">Created</th>
                <th className="text-center py-3 px-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports?.filter(r => r.status !== 'scheduled').map((report) => (
                <tr key={report.id} className="border-b hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {getFormatIcon(report.format)}
                      <span className="font-medium">{report.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">{report.type}</td>
                  <td className="py-4 px-6">{report.format.toUpperCase()}</td>
                  <td className="py-4 px-6">{getStatusBadge(report.status)}</td>
                  <td className="py-4 px-6">{report.size}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <FaClock />
                      {format(new Date(report.createdAt), 'MMM dd, HH:mm')}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    {report.status === 'completed' && (
                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
                      >
                        <FaDownload />
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <GenerateReportModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateReport}
          dateRange={dateRange}
        />
      )}
    </div>
  );
};

const GenerateReportModal: React.FC<{
  onClose: () => void;
  onGenerate: (config: any) => void;
  dateRange: any;
}> = ({ onClose, onGenerate, dateRange }) => {
  const [reportConfig, setReportConfig] = useState({
    name: '',
    type: 'performance',
    format: 'pdf',
    dateRange: dateRange,
    includeCharts: true,
    includeTables: true,
    categories: [] as string[],
    schedule: false,
    scheduleDate: '',
    scheduleFrequency: 'once',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(reportConfig);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Generate Report</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Name</label>
            <input
              type="text"
              value={reportConfig.name}
              onChange={(e) => setReportConfig({ ...reportConfig, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Monthly Performance Report"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <select
                value={reportConfig.type}
                onChange={(e) => setReportConfig({ ...reportConfig, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="performance">Performance Report</option>
                <option value="revenue">Revenue Report</option>
                <option value="bookings">Bookings Report</option>
                <option value="users">User Analytics Report</option>
                <option value="marketing">Marketing Report</option>
                <option value="custom">Custom Report</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select
                value={reportConfig.format}
                onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <DateRangePicker 
              dateRange={reportConfig.dateRange} 
              onChange={(range) => setReportConfig({ ...reportConfig, dateRange: range })}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reportConfig.includeCharts}
                onChange={(e) => setReportConfig({ ...reportConfig, includeCharts: e.target.checked })}
              />
              <span className="text-sm">Include Charts and Visualizations</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reportConfig.includeTables}
                onChange={(e) => setReportConfig({ ...reportConfig, includeTables: e.target.checked })}
              />
              <span className="text-sm">Include Detailed Tables</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={reportConfig.schedule}
                onChange={(e) => setReportConfig({ ...reportConfig, schedule: e.target.checked })}
              />
              <span className="text-sm">Schedule Report</span>
            </label>
          </div>

          {reportConfig.schedule && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-1">Schedule Date</label>
                <input
                  type="datetime-local"
                  value={reportConfig.scheduleDate}
                  onChange={(e) => setReportConfig({ ...reportConfig, scheduleDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required={reportConfig.schedule}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <select
                  value={reportConfig.scheduleFrequency}
                  onChange={(e) => setReportConfig({ ...reportConfig, scheduleFrequency: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function getPlaceholderReports(): Report[] {
  return [
    {
      id: '1',
      name: 'Q4 2023 Performance Report',
      type: 'performance',
      format: 'pdf',
      status: 'completed',
      size: '2.4 MB',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      downloadUrl: '#',
    },
    {
      id: '2',
      name: 'Monthly Revenue Analysis',
      type: 'revenue',
      format: 'excel',
      status: 'completed',
      size: '1.8 MB',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      downloadUrl: '#',
    },
    {
      id: '3',
      name: 'User Acquisition Report',
      type: 'users',
      format: 'csv',
      status: 'processing',
      size: '-',
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Weekly Bookings Summary',
      type: 'bookings',
      format: 'pdf',
      status: 'scheduled',
      size: '-',
      createdAt: new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      name: 'Marketing Campaign Analysis',
      type: 'marketing',
      format: 'pdf',
      status: 'completed',
      size: '3.1 MB',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      downloadUrl: '#',
    },
  ];
}