import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Heart,
  Droplet,
  Weight,
  Thermometer,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { HealthMetric } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';
import { useDarkMode } from '../contexts/DarkModeContext';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface HealthInsight {
  type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
}

export const HealthAnalytics: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<string>('ALL');
  const [insights, setInsights] = useState<HealthInsight[]>([]);

  useEffect(() => {
    loadMetrics();
  }, [dateRange, selectedMetric]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await db.getHealthMetrics?.(user?.id || '', dateRange) || [];
      setMetrics(data);
      
      // Generate insights
      const generatedInsights = generateInsights(data);
      setInsights(generatedInsights);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (data: HealthMetric[]): HealthInsight[] => {
    const insights: HealthInsight[] = [];
    
    // Analyze blood pressure
    const bpMetrics = data.filter(m => m.type === 'BLOOD_PRESSURE');
    if (bpMetrics.length > 0) {
      const avgBp = bpMetrics.reduce((sum, m) => sum + m.value, 0) / bpMetrics.length;
      if (avgBp > 140) {
        insights.push({
          type: 'BLOOD_PRESSURE',
          title: 'Elevated Blood Pressure',
          description: 'Your average blood pressure is above normal range.',
          severity: 'warning',
          recommendation: 'Consider consulting with your doctor and monitoring your diet.',
        });
      }
    }

    // Analyze heart rate
    const hrMetrics = data.filter(m => m.type === 'HEART_RATE');
    if (hrMetrics.length > 0) {
      const avgHr = hrMetrics.reduce((sum, m) => sum + m.value, 0) / hrMetrics.length;
      if (avgHr > 100 || avgHr < 60) {
        insights.push({
          type: 'HEART_RATE',
          title: 'Irregular Heart Rate',
          description: `Your average heart rate is ${avgHr} BPM, which is outside the normal range.`,
          severity: 'warning',
          recommendation: 'Monitor your heart rate and consult a doctor if this persists.',
        });
      }
    }

    // Analyze weight trends
    const weightMetrics = data.filter(m => m.type === 'WEIGHT');
    if (weightMetrics.length > 1) {
      const sorted = weightMetrics.sort((a, b) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      );
      const first = sorted[0].value;
      const last = sorted[sorted.length - 1].value;
      const change = last - first;
      
      if (Math.abs(change) > 5) {
        insights.push({
          type: 'WEIGHT',
          title: 'Significant Weight Change',
          description: `Your weight has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)} ${weightMetrics[0].unit} over this period.`,
          severity: change > 0 ? 'warning' : 'info',
          recommendation: 'Consider discussing this change with your healthcare provider.',
        });
      }
    }

    return insights;
  };

  const processChartData = () => {
    const grouped: Record<string, any[]> = {};
    
    metrics.forEach(metric => {
      const date = new Date(metric.recorded_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(metric);
    });

    return Object.entries(grouped).map(([date, values]) => {
      const dataPoint: any = { date };
      values.forEach(metric => {
        const key = metric.type.toLowerCase().replace('_', '');
        dataPoint[key] = metric.value;
      });
      return dataPoint;
    });
  };

  const getMetricStats = (type: string) => {
    const filtered = metrics.filter(m => m.type === type);
    if (filtered.length === 0) return null;

    const values = filtered.map(m => m.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = filtered[filtered.length - 1];

    return { avg, min, max, latest, count: filtered.length };
  };

  const chartData = processChartData();

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  const bpStats = getMetricStats('BLOOD_PRESSURE');
  const hrStats = getMetricStats('HEART_RATE');
  const weightStats = getMetricStats('WEIGHT');
  const spo2Stats = getMetricStats('SPO2');
  const glucoseStats = getMetricStats('GLUCOSE');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Health Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Comprehensive health insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={() => notify('Export feature coming soon', 'info')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-2xl border ${
                insight.severity === 'critical'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : insight.severity === 'warning'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  insight.severity === 'critical'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : insight.severity === 'warning'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Activity className={
                    insight.severity === 'critical'
                      ? 'text-red-600 dark:text-red-400'
                      : insight.severity === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-blue-600 dark:text-blue-400'
                  } size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-1">{insight.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{insight.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    <strong>Recommendation:</strong> {insight.recommendation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bpStats && (
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <Activity className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Blood Pressure</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {bpStats.latest.value} {bpStats.latest.unit}
            </p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Avg: {bpStats.avg.toFixed(0)}</span>
              <span>Range: {bpStats.min}-{bpStats.max}</span>
            </div>
          </div>
        )}

        {hrStats && (
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                <Heart className="text-pink-600 dark:text-pink-400" size={24} />
              </div>
              <TrendingDown className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Heart Rate</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {hrStats.latest.value} {hrStats.latest.unit}
            </p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Avg: {hrStats.avg.toFixed(0)}</span>
              <span>Range: {hrStats.min}-{hrStats.max}</span>
            </div>
          </div>
        )}

        {weightStats && (
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Weight className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <TrendingDown className="text-green-600 dark:text-green-400" size={20} />
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Weight</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {weightStats.latest.value} {weightStats.latest.unit}
            </p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Avg: {weightStats.avg.toFixed(1)}</span>
              <span>Range: {weightStats.min}-{weightStats.max}</span>
            </div>
          </div>
        )}

        {spo2Stats && (
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl">
                <Droplet className="text-cyan-600 dark:text-cyan-400" size={24} />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">SpO2</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {spo2Stats.latest.value}% {spo2Stats.latest.unit}
            </p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Avg: {spo2Stats.avg.toFixed(1)}%</span>
              <span>Range: {spo2Stats.min}-{spo2Stats.max}%</span>
            </div>
          </div>
        )}

        {glucoseStats && (
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Thermometer className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Blood Glucose</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {glucoseStats.latest.value} {glucoseStats.latest.unit}
            </p>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>Avg: {glucoseStats.avg.toFixed(0)}</span>
              <span>Range: {glucoseStats.min}-{glucoseStats.max}</span>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Health Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: '12px'
                  }}
                />
                <Legend />
                {hrStats && <Line type="monotone" dataKey="heartrate" stroke="#EC4899" strokeWidth={2} name="Heart Rate" />}
                {weightStats && <Line type="monotone" dataKey="weight" stroke="#3B82F6" strokeWidth={2} name="Weight" />}
                {spo2Stats && <Line type="monotone" dataKey="spo2" stroke="#06B6D4" strokeWidth={2} name="SpO2" />}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Metric Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#E5E7EB"} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke={isDarkMode ? "#9CA3AF" : "#6B7280"}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: '12px'
                  }}
                />
                <Legend />
                {hrStats && <Bar dataKey="heartrate" fill="#EC4899" name="Heart Rate" />}
                {weightStats && <Bar dataKey="weight" fill="#3B82F6" name="Weight" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Activity}
          title="No health data available"
          description="Start recording your health metrics to see analytics and insights"
        />
      )}
    </div>
  );
};

