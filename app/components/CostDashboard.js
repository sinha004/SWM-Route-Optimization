'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getCostHistory, loadSettings, saveSettings } from '../../lib/storage';
import { formatCurrency } from '../../utils/calculations';

const CostDashboard = ({ vehicles }) => {
  const [settings, setSettings] = useState(null);
  const [costHistory, setCostHistory] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    
    const days = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;
    const history = getCostHistory(days);
    setCostHistory(history);
  }, [timeRange]);

  // Calculate total costs
  const totalCosts = costHistory.reduce((acc, record) => ({
    fuel: acc.fuel + (record.fuelCost || 0),
    maintenance: acc.maintenance + (record.maintenanceCost || 0),
    labor: acc.labor + (record.laborCost || 0),
    disposal: acc.disposal + (record.disposalCost || 0)
  }), { fuel: 0, maintenance: 0, labor: 0, disposal: 0 });

  const grandTotal = Object.values(totalCosts).reduce((sum, val) => sum + val, 0);

  // Prepare chart data
  const costBreakdownData = [
    { name: 'Fuel', value: totalCosts.fuel, color: '#3b82f6' },
    { name: 'Maintenance', value: totalCosts.maintenance, color: '#f59e0b' },
    { name: 'Labor', value: totalCosts.labor, color: '#10b981' },
    { name: 'Disposal', value: totalCosts.disposal, color: '#ef4444' }
  ];

  // Daily cost trend
  const dailyCostData = processDailyCosts(costHistory);

  // Calculate savings (if we have comparison data)
  const savings = costHistory.reduce((acc, record) => acc + (record.savings || 0), 0);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Cost Management</h2>
            </div>
            <p className="text-orange-100 text-sm">Track expenses and optimize budget</p>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium shadow-lg border border-gray-300"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-colors font-medium shadow-lg"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <CostCard
            label="Total Cost"
            value={formatCurrency(grandTotal)}
            icon="💰"
            color="bg-blue-50 border-blue-200"
          />
          <CostCard
            label="Fuel"
            value={formatCurrency(totalCosts.fuel)}
            icon="⛽"
            color="bg-blue-50 border-blue-200"
            percentage={(totalCosts.fuel / grandTotal * 100).toFixed(0)}
          />
          <CostCard
            label="Maintenance"
            value={formatCurrency(totalCosts.maintenance)}
            icon="🔧"
            color="bg-amber-50 border-amber-200"
            percentage={(totalCosts.maintenance / grandTotal * 100).toFixed(0)}
          />
          <CostCard
            label="Labor"
            value={formatCurrency(totalCosts.labor)}
            icon="👷"
            color="bg-green-50 border-green-200"
            percentage={(totalCosts.labor / grandTotal * 100).toFixed(0)}
          />
          <CostCard
            label="Disposal"
            value={formatCurrency(totalCosts.disposal)}
            icon="🗑️"
            color="bg-red-50 border-red-200"
            percentage={(totalCosts.disposal / grandTotal * 100).toFixed(0)}
          />
        </div>

        {/* Savings Card */}
        {savings > 0 && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-green-900 mb-1">Cost Savings from Route Optimization</h3>
                <p className="text-sm text-green-800">Compared to baseline/alternative routes</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-700">{formatCurrency(savings)}</div>
                <div className="text-sm text-green-800">Total Saved</div>
              </div>
            </div>
          </div>
        )}

        {/* Cost Breakdown Pie Chart */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Cost Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {costBreakdownData.filter(d => d.value > 0).map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatCurrency(item.value)}</div>
                    <div className="text-xs text-gray-700">
                      {((item.value / grandTotal) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Daily Cost Trend */}
        {dailyCostData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-900">Daily Cost Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyCostData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total Cost" strokeWidth={2} />
                <Line type="monotone" dataKey="fuel" stroke="#f59e0b" name="Fuel" />
                <Line type="monotone" dataKey="labor" stroke="#10b981" name="Labor" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Budget Planning */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Budget Projections</h3>
          <div className="grid grid-cols-3 gap-4">
            <ProjectionCard
              period="Monthly"
              amount={grandTotal * (30 / parseInt(timeRange))}
              icon="📅"
            />
            <ProjectionCard
              period="Quarterly"
              amount={grandTotal * (90 / parseInt(timeRange))}
              icon="📊"
            />
            <ProjectionCard
              period="Yearly"
              amount={grandTotal * (365 / parseInt(timeRange))}
              icon="📈"
            />
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettingsModal(false)}
          onSave={(newSettings) => {
            setSettings(newSettings);
            saveSettings(newSettings);
            setShowSettingsModal(false);
          }}
        />
      )}
    </div>
  );
};

// Helper Components
const CostCard = ({ label, value, icon, color, percentage }) => (
  <div className={`${color} p-4 rounded-xl border shadow-sm`}>
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-xs text-gray-800 font-medium">{label}</div>
    <div className="text-lg font-bold text-gray-900">{value}</div>
    {percentage && <div className="text-xs text-gray-800 font-medium mt-1">{percentage}% of total</div>}
  </div>
);

const ProjectionCard = ({ period, amount, icon }) => (
  <div className="bg-white p-4 rounded-lg border border-gray-200">
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-sm text-gray-800 font-medium">{period} Projection</div>
    <div className="text-xl font-bold text-gray-900">{formatCurrency(amount)}</div>
  </div>
);

const SettingsModal = ({ settings, onClose, onSave }) => {
  const [formData, setFormData] = useState(settings || {});

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[2000] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Cost Settings</h3>
        
        <div className="space-y-6">
          {/* Fuel Prices */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900">Fuel Prices (₹/Liter)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-800 mb-1">Diesel</label>
                <input
                  type="number"
                  value={formData.fuelPrice?.diesel || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    fuelPrice: { ...formData.fuelPrice, diesel: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-800 mb-1">Petrol</label>
                <input
                  type="number"
                  value={formData.fuelPrice?.petrol || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    fuelPrice: { ...formData.fuelPrice, petrol: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-800 mb-1">Electric (₹/kWh)</label>
                <input
                  type="number"
                  value={formData.fuelPrice?.electric || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    fuelPrice: { ...formData.fuelPrice, electric: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Labor Costs */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900">Labor Costs (₹/Hour)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-800 mb-1">Driver Wage</label>
                <input
                  type="number"
                  value={formData.laborCost?.driverWagePerHour || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    laborCost: { ...formData.laborCost, driverWagePerHour: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-800 mb-1">Helper Wage</label>
                <input
                  type="number"
                  value={formData.laborCost?.helperWagePerHour || 0}
                  onChange={(e) => setFormData({
                    ...formData,
                    laborCost: { ...formData.laborCost, helperWagePerHour: Number(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Disposal Costs */}
          <div>
            <h4 className="font-semibold mb-3 text-gray-900">Disposal Costs (₹/Ton)</h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.keys(formData.disposalCost || {}).map(type => (
                <div key={type}>
                  <label className="block text-sm text-gray-800 mb-1 capitalize">{type}</label>
                  <input
                    type="number"
                    value={formData.disposalCost?.[type] || 0}
                    onChange={(e) => setFormData({
                      ...formData,
                      disposalCost: { ...formData.disposalCost, [type]: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function
const processDailyCosts = (costHistory) => {
  const dailyData = {};
  
  costHistory.forEach(record => {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { date, total: 0, fuel: 0, maintenance: 0, labor: 0, disposal: 0 };
    }
    dailyData[date].fuel += record.fuelCost || 0;
    dailyData[date].maintenance += record.maintenanceCost || 0;
    dailyData[date].labor += record.laborCost || 0;
    dailyData[date].disposal += record.disposalCost || 0;
    dailyData[date].total += (record.fuelCost || 0) + (record.maintenanceCost || 0) + (record.laborCost || 0) + (record.disposalCost || 0);
  });

  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default CostDashboard;
