'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateCO2Emissions } from '../../constants/vehicleTypes';
import { calculateDiversionRate } from '../../utils/forecasting';
import { loadTrips } from '../../lib/storage';

const EnvironmentalDashboard = ({ dustbins, vehicles }) => {
  const [trips, setTrips] = useState([]);
  const [timeRange, setTimeRange] = useState('30days');

  useEffect(() => {
    const loadedTrips = loadTrips(100);
    setTrips(loadedTrips);
  }, []);

  // Calculate total emissions
  const totalEmissions = trips.reduce((sum, trip) => {
    if (trip.distance && trip.vehicleType) {
      return sum + calculateCO2Emissions(trip.distance, trip.vehicleType);
    }
    return sum;
  }, 0);

  // Calculate emissions saved through optimization
  const emissionsSaved = trips.reduce((sum, trip) => {
    if (trip.alternativeDistance && trip.distance && trip.vehicleType) {
      const optimizedEmissions = calculateCO2Emissions(trip.distance, trip.vehicleType);
      const alternativeEmissions = calculateCO2Emissions(trip.alternativeDistance, trip.vehicleType);
      return sum + (alternativeEmissions - optimizedEmissions);
    }
    return sum;
  }, 0);

  // Calculate diversion rate
  const diversionData = calculateDiversionRate(dustbins);

  // Prepare chart data
  const emissionsTrendData = processEmissionsTrend(trips);
  
  const diversionChartData = [
    { name: 'Diverted (Recycled/Composted)', value: diversionData.divertedWeight, color: '#10b981' },
    { name: 'Landfill', value: diversionData.landfillWeight, color: '#6b7280' }
  ];

  // Sustainability goals (example targets)
  const carbonReductionGoal = 1000; // kg CO2
  const diversionRateGoal = 50; // percentage
  const carbonProgress = Math.min((emissionsSaved / carbonReductionGoal) * 100, 100);
  const diversionProgress = Math.min((diversionData.diversionRate / diversionRateGoal) * 100, 100);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-green-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">Environmental Impact</h2>
            </div>
            <p className="text-teal-100 text-sm">Track sustainability and carbon footprint</p>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total CO₂ Emissions"
            value={`${totalEmissions.toFixed(1)} kg`}
            icon="☁️"
            color="bg-red-50 border-red-200"
          />
          <MetricCard
            label="CO₂ Saved"
            value={`${emissionsSaved.toFixed(1)} kg`}
            icon="🌱"
            color="bg-green-50 border-green-200"
          />
          <MetricCard
            label="Diversion Rate"
            value={`${diversionData.diversionRate.toFixed(1)}%`}
            icon="♻️"
            color="bg-blue-50 border-blue-200"
          />
          <MetricCard
            label="Total Waste"
            value={`${(diversionData.totalWeight / 1000).toFixed(2)} tons`}
            icon="⚖️"
            color="bg-purple-50 border-purple-200"
          />
        </div>

        {/* Carbon Savings Highlight */}
        {emissionsSaved > 0 && (
          <div className="bg-green-50 border-2 border-green-300 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl">🌍</div>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-lg mb-2">Carbon Reduction Achievement</h3>
                <p className="text-green-700 mb-3">
                  Through route optimization, you've saved <strong>{emissionsSaved.toFixed(1)} kg of CO₂</strong> emissions!
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-green-700 font-bold">{(emissionsSaved / 2.5).toFixed(0)}</div>
                    <div className="text-gray-700 text-xs">Trees equivalent*</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-green-700 font-bold">{(emissionsSaved / 2.3).toFixed(1)} L</div>
                    <div className="text-gray-700 text-xs">Fuel saved</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-green-700 font-bold">{(emissionsSaved / 0.411).toFixed(0)} km</div>
                    <div className="text-gray-700 text-xs">Car driving avoided</div>
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-2">*Approximate values for reference</p>
              </div>
            </div>
          </div>
        )}

        {/* Sustainability Goals Progress */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Sustainability Goals Progress</h3>
          <div className="space-y-4">
            <GoalProgress
              label="Carbon Reduction Target"
              current={emissionsSaved}
              target={carbonReductionGoal}
              unit="kg CO₂"
              progress={carbonProgress}
              color="bg-green-500"
            />
            <GoalProgress
              label="Waste Diversion Target"
              current={diversionData.diversionRate}
              target={diversionRateGoal}
              unit="%"
              progress={diversionProgress}
              color="bg-blue-500"
            />
          </div>
        </div>

        {/* Waste Diversion Breakdown */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="font-bold text-lg mb-4 text-gray-900">Waste Diversion Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diversionChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${(value/1000).toFixed(1)}t`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {diversionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${(value/1000).toFixed(2)} tons`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Diverted from Landfill</span>
                  <span className="text-green-700 font-bold">
                    {(diversionData.divertedWeight / 1000).toFixed(2)} tons
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  Recycled and composted materials
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">Sent to Landfill</span>
                  <span className="text-gray-700 font-bold">
                    {(diversionData.landfillWeight / 1000).toFixed(2)} tons
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  Non-recyclable waste
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Diversion Rate</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {diversionData.diversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Emissions Trend */}
        {emissionsTrendData.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-bold text-lg mb-4 text-gray-900">CO₂ Emissions Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={emissionsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'kg CO₂', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="emissions" fill="#ef4444" name="CO₂ Emissions (kg)" />
                <Bar dataKey="saved" fill="#10b981" name="CO₂ Saved (kg)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Environmental Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-bold text-blue-900 mb-2">Sustainability Tips</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Continue optimizing routes to reduce fuel consumption and emissions</li>
                <li>• Increase waste segregation to improve diversion rate</li>
                <li>• Consider adding electric vehicles to further reduce carbon footprint</li>
                <li>• Monitor bins regularly to prevent overflow and contamination</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ label, value, icon, color }) => (
  <div className={`${color} p-4 rounded-xl border shadow-sm`}>
    <div className="text-2xl mb-2">{icon}</div>
    <div className="text-xs text-gray-800 font-medium">{label}</div>
    <div className="text-lg font-bold text-gray-900">{value}</div>
  </div>
);

const GoalProgress = ({ label, current, target, unit, progress, color }) => (
  <div>
    <div className="flex justify-between mb-2">
      <span className="font-medium text-gray-900">{label}</span>
      <span className="text-sm text-gray-800">
        {current.toFixed(1)} / {target} {unit}
      </span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-500 flex items-center justify-center text-xs text-white font-bold`}
        style={{ width: `${progress}%` }}
      >
        {progress >= 20 && `${progress.toFixed(0)}%`}
      </div>
    </div>
  </div>
);

// Helper function
const processEmissionsTrend = (trips) => {
  const dailyData = {};
  
  trips.forEach(trip => {
    if (!trip.timestamp || !trip.distance || !trip.vehicleType) return;
    
    const date = new Date(trip.timestamp).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = { date, emissions: 0, saved: 0 };
    }
    
    const emissions = calculateCO2Emissions(trip.distance, trip.vehicleType);
    dailyData[date].emissions += emissions;
    
    if (trip.alternativeDistance) {
      const alternativeEmissions = calculateCO2Emissions(trip.alternativeDistance, trip.vehicleType);
      dailyData[date].saved += (alternativeEmissions - emissions);
    }
  });

  return Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
};

export default EnvironmentalDashboard;
