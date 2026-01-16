'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateWasteTypeDistribution, forecastWasteGeneration, identifyPeakPeriods } from '../../utils/forecasting';
import { getAllCollectionHistory } from '../../lib/storage';
import { getWasteTypeColor } from '../../constants/wasteTypes';

const Analytics = ({ dustbins }) => {
  const [timeRange, setTimeRange] = useState('7days');
  const [historicalData, setHistoricalData] = useState([]);
  const [forecastData, setForecastData] = useState([]);

  useEffect(() => {
    // Load historical data
    const history = getAllCollectionHistory();
    
    // Process historical data for charts
    const processedData = processHistoricalData(history, timeRange);
    setHistoricalData(processedData);

    // Generate forecast
    if (processedData.length > 0) {
      const forecast = forecastWasteGeneration(processedData, 7);
      setForecastData(forecast);
    }
  }, [dustbins, timeRange]);

  const wasteDistribution = calculateWasteTypeDistribution(dustbins);
  const peakPeriods = historicalData.length > 0 ? identifyPeakPeriods(historicalData) : null;

  // Prepare data for charts
  const distributionChartData = Object.entries(wasteDistribution).map(([type, data]) => ({
    name: type,
    value: data.totalWeight,
    count: data.count,
    percentage: data.percentage
  }));

  const fillLevelData = [
    { name: '0-25%', count: dustbins.filter(b => (b.fillLevel || 0) < 25).length },
    { name: '25-50%', count: dustbins.filter(b => (b.fillLevel || 0) >= 25 && (b.fillLevel || 0) < 50).length },
    { name: '50-75%', count: dustbins.filter(b => (b.fillLevel || 0) >= 50 && (b.fillLevel || 0) < 75).length },
    { name: '75-100%', count: dustbins.filter(b => (b.fillLevel || 0) >= 75).length }
  ];

  const trendData = [...historicalData, ...forecastData].slice(-30);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Waste Analytics</h2>
            </div>
            <p className="text-green-100 text-sm">Data-driven insights for waste management</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium shadow-lg border border-gray-300"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            label="Total Bins"
            value={dustbins.length}
            icon="🗑️"
            color="bg-blue-50"
          />
          <MetricCard
            label="Avg Fill Level"
            value={`${Math.round(dustbins.reduce((sum, b) => sum + (b.fillLevel || 0), 0) / (dustbins.length || 1))}%`}
            icon="📊"
            color="bg-green-50"
          />
          <MetricCard
            label="Total Weight"
            value={`${(dustbins.reduce((sum, b) => sum + (b.weight || 0), 0) / 1000).toFixed(1)}t`}
            icon="⚖️"
            color="bg-purple-50"
          />
          <MetricCard
            label="Critical Bins"
            value={dustbins.filter(b => (b.fillLevel || 0) >= 80).length}
            icon="⚠️"
            color="bg-red-50"
          />
        </div>

        {/* Waste Type Distribution */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Waste Type Distribution</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {distributionChartData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between p-2 bg-white rounded">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    <span className="text-sm font-medium capitalize text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">{item.value.toFixed(0)} kg</div>
                    <div className="text-xs text-gray-800">{item.count} bins</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fill Level Distribution */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Bin Fill Level Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={fillLevelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Number of Bins" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend & Forecast */}
        {trendData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Waste Generation Trend & 7-Day Forecast</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Waste Weight (kg)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500"></div>
                <span className="text-gray-800">Historical Data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-300 border-2 border-green-500"></div>
                <span className="text-gray-800">Forecast (7 days)</span>
              </div>
            </div>
          </div>
        )}

        {/* Peak Periods Insight */}
        {peakPeriods && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-bold text-blue-900 mb-2">Peak Period Insights</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  {peakPeriods.peakDay && <p>• Highest waste generation: <strong>{peakPeriods.peakDay}</strong></p>}
                  {peakPeriods.peakMonth && <p>• Peak month: <strong>{peakPeriods.peakMonth}</strong></p>}
                  <p>• Plan extra capacity and resources during peak periods</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ label, value, icon, color }) => (
  <div className={`${color} p-4 rounded-xl border border-gray-200 shadow-sm`}>
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-sm text-gray-800 font-medium">{label}</div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
  </div>
);

// Helper function to process historical data
const processHistoricalData = (history, timeRange) => {
  const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const dataByDate = {};

  Object.values(history).forEach(binHistory => {
    binHistory.forEach(record => {
      const recordDate = new Date(record.timestamp);
      if (recordDate >= cutoffDate) {
        const dateKey = recordDate.toISOString().split('T')[0];
        if (!dataByDate[dateKey]) {
          dataByDate[dateKey] = 0;
        }
        dataByDate[dateKey] += record.weight || 0;
      }
    });
  });

  return Object.entries(dataByDate).map(([date, weight]) => ({
    date,
    weight
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default Analytics;
