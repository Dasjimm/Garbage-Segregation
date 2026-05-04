'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import AuthGuard from '@/app/components/AuthGuard';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  FileText,
  Package,
  Recycle,
  Calendar,
  Clock,
  Trash2,
  Edit,
  Plus,
  X,
  BarChart3,
  PieChart,
  Filter,
  Activity,
  Zap,
  Target,
  Shield,
  LayoutDashboard
} from 'lucide-react';

interface Pickup {
  id: number;
  day: string;
  type: string;
  time: string;
}

const PICKUPS_STORAGE_KEY = 'ecowaste_pickups';

const dayOptions = [
  'Today',
  'Tomorrow',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Next Week'
];

const typeOptions = ['Paper', 'Plastic', 'Metal'];

const colorClasses = {
  blue: { border: 'border-blue-500', text: 'text-blue-600', bg: 'bg-blue-100', hoverBg: 'hover:bg-blue-50' },
  yellow: { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-50' },
  purple: { border: 'border-purple-500', text: 'text-purple-600', bg: 'bg-purple-100', hoverBg: 'hover:bg-purple-50' },
  teal: { border: 'border-teal-500', text: 'text-teal-600', bg: 'bg-teal-100', hoverBg: 'hover:bg-teal-50' },
};

const getColorClasses = (color: string) => {
  return colorClasses[color as keyof typeof colorClasses] || colorClasses.teal;
};

// Separate PickupModal component to isolate state
const PickupModal = memo(({ 
  isOpen, 
  onClose, 
  onSubmit, 
  editingPickup,
  initialData
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: { day: string; type: string; time: string }) => void;
  editingPickup: Pickup | null;
  initialData: { day: string; type: string; time: string };
}) => {
  const [localFormData, setLocalFormData] = useState(initialData);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset local form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setLocalFormData(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen || !mounted) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    onSubmit(localFormData);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editingPickup ? 'Edit Pickup' : 'Add New Pickup'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
            <select 
              name="day" 
              value={localFormData.day} 
              onChange={handleInputChange} 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white"
            >
              <option value="">Select Day</option>
              {dayOptions.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Material Type</label>
            <select 
              name="type" 
              value={localFormData.type} 
              onChange={handleInputChange} 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white"
            >
              <option value="">Select Type</option>
              {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
            <input 
              type="text" 
              name="time" 
              value={localFormData.time} 
              onChange={handleInputChange} 
              placeholder="e.g., 9:00 AM, 10:30 PM" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-colors bg-white" 
            />
            <p className="text-xs text-gray-500 mt-2">Format: hour:minute AM/PM (e.g., 9:00 AM, 10:30 PM)</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
            {editingPickup ? 'Update Pickup' : 'Add Pickup'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

PickupModal.displayName = 'PickupModal';

const MetricsCards = memo(({ metrics }: { metrics: any[] }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {metrics.map((metric, idx) => {
        const Icon = metric.icon;
        const colors = getColorClasses(metric.color);
        const hasData = metric.data > 0;

        return (
          <div key={idx} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${colors.border} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-l-8 cursor-pointer group ${colors.hoverBg}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2 group-hover:scale-105 transition-transform origin-left">{metric.value}</p>
                {!hasData && <p className="text-xs text-gray-400 mt-1">No data for selected date</p>}
              </div>
              <div className={`p-3 rounded-lg ${hasData ? colors.bg : 'bg-gray-100'} group-hover:scale-110 transition-transform group-hover:rotate-3`}>
                <Icon className={`${hasData ? colors.text : 'text-gray-400'}`} size={28} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MetricsCards.displayName = 'MetricsCards';

const ChartSection = memo(({ 
  selectedChartType, 
  setSelectedChartType, 
  selectedDate, 
  chartData, 
  maxValue, 
  todayData 
}: { 
  selectedChartType: 'bar' | 'pie'; 
  setSelectedChartType: (type: 'bar' | 'pie') => void; 
  selectedDate: string; 
  chartData: any[]; 
  maxValue: number; 
  todayData: any;
}) => {
  const renderGridLines = useCallback(() => {
    return [0, 1, 2, 3, 4].map(i => (
      <div key={i} className="absolute w-full border-t border-gray-200 border-dashed" style={{ bottom: `${(i / 4) * 100}%` }} />
    ));
  }, []);

  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={24} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            {selectedChartType === 'bar' ? 'Last 7 Days Trend' : `Composition for ${selectedDate}`}
          </h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSelectedChartType('bar')} className={`p-2 rounded-lg transition-all duration-200 ${selectedChartType === 'bar' ? 'bg-teal-100 text-teal-600 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'}`}>
            <BarChart3 size={18} />
          </button>
          <button onClick={() => setSelectedChartType('pie')} className={`p-2 rounded-lg transition-all duration-200 ${selectedChartType === 'pie' ? 'bg-teal-100 text-teal-600 scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'}`}>
            <PieChart size={18} />
          </button>
        </div>
      </div>
      
      {selectedChartType === 'bar' ? (
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Last 7 Days Recycling Trend (kg)</span>
            <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-full hover:bg-teal-100 transition-colors">Based on {chartData.length} days</span>
          </div>
          {chartData.length > 0 ? (
            <div className="h-64 relative">
              <div className="absolute inset-0 pointer-events-none">
                {renderGridLines()}
                <div className="absolute h-full w-px bg-gray-200 left-1/4"></div>
                <div className="absolute h-full w-px bg-gray-200 left-1/2"></div>
                <div className="absolute h-full w-px bg-gray-200 left-3/4"></div>
              </div>
              
              <div className="h-full flex items-end justify-between gap-2 relative z-10">
                {chartData.map((data, idx) => {
                  const paperHeight = ((data.paper || 0) / maxValue) * 180;
                  const plasticHeight = ((data.plastic || 0) / maxValue) * 180;
                  const metalHeight = ((data.metal || 0) / maxValue) * 180;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                      <div className="relative w-full flex justify-center gap-1 items-end">
                        <div className="w-4 bg-blue-500 rounded-t transition-all duration-300 group-hover:bg-blue-600 group-hover:w-5 group-hover:shadow-lg" style={{ height: `${paperHeight}px` }} title={`Paper: ${data.paper || 0}kg`} />
                        <div className="w-4 bg-yellow-500 rounded-t transition-all duration-300 group-hover:bg-yellow-600 group-hover:w-5 group-hover:shadow-lg" style={{ height: `${plasticHeight}px` }} title={`Plastic: ${data.plastic || 0}kg`} />
                        <div className="w-4 bg-purple-500 rounded-t transition-all duration-300 group-hover:bg-purple-600 group-hover:w-5 group-hover:shadow-lg" style={{ height: `${metalHeight}px` }} title={`Metal: ${data.metal || 0}kg`} />
                      </div>
                      <div className="text-xs text-gray-600 font-medium mt-2 group-hover:text-teal-600 transition-colors">{data.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">No data available for the last 7 days</p>
            </div>
          )}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div>Paper</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded"></div>Plastic</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded"></div>Metal</div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center">
          {todayData.total > 0 ? (
            <div className="flex items-center gap-8">
              <div className="relative w-48 h-48 group">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full transition-transform duration-300 group-hover:scale-105">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${((todayData.paper || 0) / todayData.total) * 251.2} 251.2`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#EAB308" strokeWidth="20" strokeDasharray={`${((todayData.plastic || 0) / todayData.total) * 251.2} 251.2`} strokeDashoffset={`-${((todayData.paper || 0) / todayData.total) * 251.2}`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#A855F7" strokeWidth="20" strokeDasharray={`${((todayData.metal || 0) / todayData.total) * 251.2} 251.2`} strokeDashoffset={`-${(((todayData.paper || 0) + (todayData.plastic || 0)) / todayData.total) * 251.2}`} />
                </svg>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded"></div>Paper: {todayData.paper}kg</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded"></div>Plastic: {todayData.plastic}kg</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded"></div>Metal: {todayData.metal}kg</div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-48 h-48 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-400">No data for {selectedDate}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ChartSection.displayName = 'ChartSection';

const PickupsSection = memo(({ 
  pickups, 
  onEdit, 
  onDelete, 
  onAdd 
}: { 
  pickups: Pickup[]; 
  onEdit: (pickup: Pickup) => void; 
  onDelete: (id: number) => void; 
  onAdd: () => void;
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">Upcoming Pickups</h3>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1 text-teal-600 hover:text-teal-800 text-sm font-medium hover:scale-105 transition-all">
          <Plus size={16} /> Add
        </button>
      </div>
      <div className="space-y-4">
        {pickups.length > 0 ? (
          pickups.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-teal-50 rounded-lg hover:bg-teal-100 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-teal-600 mt-1 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 transition-colors">{item.day}</p>
                  <p className="text-xs text-gray-600 group-hover:text-teal-600 transition-colors">{item.type}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock size={12} className="text-gray-500 group-hover:text-teal-500 transition-colors" />
                    <p className="text-xs text-gray-500 group-hover:text-teal-600 transition-colors">{item.time}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <button onClick={() => onEdit(item)} className="text-blue-600 hover:text-blue-800 hover:scale-110 transition-all"><Edit size={16} /></button>
                <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-800 hover:scale-110 transition-all"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">No pickups scheduled</p>
        )}
      </div>
    </div>
  );
});

PickupsSection.displayName = 'PickupsSection';

const MaterialBreakdown = memo(({ totals }: { totals: { paper: number; plastic: number; metal: number; grand: number } }) => {
  const items = useMemo(() => [
    { label: 'Paper', value: totals.paper, color: 'blue', icon: FileText },
    { label: 'Plastic', value: totals.plastic, color: 'yellow', icon: Package },
    { label: 'Metal', value: totals.metal, color: 'purple', icon: Recycle }
  ], [totals]);

  return (
    <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Breakdown</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, idx) => {
          const colors = getColorClasses(item.color);
          return (
            <div key={idx} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <div className={`flex items-center gap-2 ${colors.text}`}>
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                <span className={`text-lg font-bold ${colors.text}`}>{((item.value / totals.grand) * 100 || 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${colors.bg} h-2.5 rounded-full`} style={{ width: `${(item.value / totals.grand) * 100 || 0}%` }} />
              </div>
              <p className="text-sm text-gray-600 mt-2">{item.value.toFixed(1)} kg total</p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

MaterialBreakdown.displayName = 'MaterialBreakdown';

const MobileViewComponent = memo(({ 
  metrics, 
  chartData, 
  maxValue, 
  todayData, 
  pickups, 
  totals,
  selectedChartType, 
  setSelectedChartType,
  onEdit,
  onDelete,
  onAdd
}: { 
  metrics: any[]; 
  chartData: any[]; 
  maxValue: number; 
  todayData: any; 
  pickups: Pickup[]; 
  totals: any;
  selectedChartType: 'bar' | 'pie'; 
  setSelectedChartType: (type: 'bar' | 'pie') => void;
  onEdit: (pickup: Pickup) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) => {
  return (
    <div className="w-full px-2 py-3 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-teal-100 rounded-lg">
          <LayoutDashboard size={20} className="text-teal-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-500">Overview of your activities</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((metric, idx) => {
          const colors = getColorClasses(metric.color);
          const Icon = metric.icon;
          const hasData = metric.data > 0;

          return (
            <div key={idx} className={`bg-white rounded-lg shadow-sm p-2 border-l-2 ${colors.border}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-600 truncate">{metric.label}</p>
                  <p className="text-xs font-bold text-gray-900 truncate">{metric.value}</p>
                </div>
                <div className={`p-1.5 rounded ${hasData ? colors.bg : 'bg-gray-100'} ml-1`}>
                  <Icon className={`${hasData ? colors.text : 'text-gray-400'}`} size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold">Last 7 Days</h3>
          <div className="flex gap-1">
            <button onClick={() => setSelectedChartType('bar')} className={`p-1 rounded ${selectedChartType === 'bar' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100'}`}>
              <BarChart3 size={14} />
            </button>
            <button onClick={() => setSelectedChartType('pie')} className={`p-1 rounded ${selectedChartType === 'pie' ? 'bg-teal-100 text-teal-600' : 'bg-gray-100'}`}>
              <PieChart size={14} />
            </button>
          </div>
        </div>
        {selectedChartType === 'bar' ? (
          <div className="h-24 flex items-end justify-between gap-1">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex justify-center gap-0.5">
                  <div className="w-1 bg-blue-500 rounded-t" style={{ height: `${(data.paper / maxValue) * 40}px` }} />
                  <div className="w-1 bg-yellow-500 rounded-t" style={{ height: `${(data.plastic / maxValue) * 40}px` }} />
                  <div className="w-1 bg-purple-500 rounded-t" style={{ height: `${(data.metal / maxValue) * 40}px` }} />
                </div>
                <span className="text-[8px] mt-1">{data.date.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center">
            {todayData.total > 0 ? (
              <div className="w-12 h-12">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="20" strokeDasharray={`${(todayData.paper / todayData.total) * 251.2} 251.2`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#EAB308" strokeWidth="20" strokeDasharray={`${(todayData.plastic / todayData.total) * 251.2} 251.2`} strokeDashoffset={`-${(todayData.paper / todayData.total) * 251.2}`} />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#A855F7" strokeWidth="20" strokeDasharray={`${(todayData.metal / todayData.total) * 251.2} 251.2`} strokeDashoffset={`-${((todayData.paper + todayData.plastic) / todayData.total) * 251.2}`} />
                </svg>
              </div>
            ) : (
              <span className="text-xs text-gray-400">No data</span>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-3">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">Upcoming Pickups</h3>
          <button onClick={onAdd} className="text-teal-600 text-xs flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {pickups.length > 0 ? (
            pickups.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-teal-50 rounded">
                <div>
                  <p className="text-xs font-medium">{item.day}</p>
                  <p className="text-[10px] text-gray-600">{item.type}</p>
                  <p className="text-[8px] text-gray-500">{item.time}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(item)} className="text-blue-600 p-0.5">
                    <Edit size={10} />
                  </button>
                  <button onClick={() => onDelete(item.id)} className="text-red-600 p-0.5">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4 text-xs">No pickups scheduled</p>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Material Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Paper', value: totals.paper, color: 'blue' },
            { label: 'Plastic', value: totals.plastic, color: 'yellow' },
            { label: 'Metal', value: totals.metal, color: 'purple' }
          ].map((item, idx) => {
            const colors = getColorClasses(item.color);
            return (
              <div key={idx}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{item.label}</span>
                  <span className={`font-medium ${colors.text}`}>{((item.value / totals.grand) * 100 || 0).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full">
                  <div className={`${colors.bg} h-1.5 rounded-full`} style={{ width: `${(item.value / totals.grand) * 100 || 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

MobileViewComponent.displayName = 'MobileViewComponent';

export default function DashboardPage() {
  const { user } = useSupabaseAuth();
  const { wasteRecords, error, isLoading: isWasteDataLoading } = useRecyclingData();
  const { confirm } = useConfirmation();
  const { showNotification } = useNotification();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'pie'>('bar');
  const [filterType, setFilterType] = useState<string>('all');
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobile, setIsMobile] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPickup, setEditingPickup] = useState<Pickup | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  
  // Form data for pickups - kept at parent level for modal initial values
  const [formData, setFormData] = useState({ 
    day: '', 
    type: '', 
    time: '' 
  });

  useEffect(() => {
    const loadPickups = () => {
      try {
        setIsLoading(true);
        const savedPickups = localStorage.getItem(PICKUPS_STORAGE_KEY);
        if (savedPickups) {
          const parsedPickups = JSON.parse(savedPickups);
          setPickups(parsedPickups);
        } else {
          const defaultPickups = [
            { id: 1, day: 'Tomorrow', type: 'Paper', time: '9:00 AM' },
            { id: 2, day: 'Friday', type: 'Plastic', time: '10:30 AM' },
            { id: 3, day: 'Monday', type: 'Metal', time: '8:30 AM' },
          ];
          setPickups(defaultPickups);
          localStorage.setItem(PICKUPS_STORAGE_KEY, JSON.stringify(defaultPickups));
        }
      } catch (error) {
        console.error('Error loading pickups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPickups();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(PICKUPS_STORAGE_KEY, JSON.stringify(pickups));
    }
  }, [pickups, isLoading]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastUpdate) {
      setShowLiveIndicator(true);
      const timer = setTimeout(() => {
        setShowLiveIndicator(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastUpdate]);

  useEffect(() => {
    if (error) {
      showNotification({
        message: `Error loading data: ${error}`,
        type: 'error',
        duration: 5000
      });
    }
  }, [error, showNotification]);

  const totals = useMemo(() => {
    const paper = wasteRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
    const plastic = wasteRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
    const metal = wasteRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
    const grand = paper + plastic + metal;
    return { paper, plastic, metal, grand };
  }, [wasteRecords]);

  const averages = useMemo(() => {
    const count = wasteRecords.length || 1;
    return {
      paper: totals.paper / count,
      plastic: totals.plastic / count,
      metal: totals.metal / count,
      perDay: totals.grand / count
    };
  }, [wasteRecords.length, totals]);

  const todayData = useMemo(() => {
    const found = wasteRecords.find(r => r.date === selectedDate);
    return found || { id: 0, date: selectedDate, paper: 0, plastic: 0, metal: 0, total: 0 };
  }, [wasteRecords, selectedDate]);

  const metrics = useMemo(() => [
    { label: 'Total Today', value: `${todayData.total} kg`, color: 'teal', icon: Target, data: todayData.total },
    { label: 'Paper Today', value: `${todayData.paper} kg`, color: 'blue', icon: FileText, data: todayData.paper },
    { label: 'Plastic Today', value: `${todayData.plastic} kg`, color: 'yellow', icon: Package, data: todayData.plastic },
    { label: 'Metal Today', value: `${todayData.metal} kg`, color: 'purple', icon: Recycle, data: todayData.metal },
  ], [todayData]);

  const chartData = useMemo(() => wasteRecords.slice(0, 7), [wasteRecords]);
  
  const maxValue = useMemo(() => 
    chartData.length > 0 
      ? Math.max(...chartData.flatMap(d => [(d.paper || 0), (d.plastic || 0), (d.metal || 0)]))
      : 1
  , [chartData]);

  const getGreeting = useCallback(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [currentTime]);

  const getAdminName = useCallback(() => {
    if (!user?.email) return 'Admin';
    const name = user.email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user?.email]);

  const openAddModal = useCallback(() => {
    setEditingPickup(null);
    setFormData({ day: '', type: '', time: '' });
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((pickup: Pickup) => {
    setEditingPickup(pickup);
    setFormData({ day: pickup.day, type: pickup.type, time: pickup.time });
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPickup(null);
  }, []);

  const handleSubmit = useCallback((data: { day: string; type: string; time: string }) => {
    if (!data.day || !data.type || !data.time) {
      showNotification({
        message: 'Please fill all fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    let updatedPickups: Pickup[];

    if (editingPickup) {
      updatedPickups = pickups.map(p => p.id === editingPickup.id ? { ...p, ...data } : p);
      
      window.dispatchEvent(new CustomEvent('pickup-updated', {
        detail: { day: data.day, type: data.type, time: data.time, oldDay: editingPickup.day }
      }));
      
      showNotification({ message: 'Pickup updated successfully!', type: 'success', duration: 3000 });
    } else {
      const newId = Math.max(0, ...pickups.map(p => p.id)) + 1;
      updatedPickups = [...pickups, { id: newId, ...data }];
      
      window.dispatchEvent(new CustomEvent('pickup-scheduled', {
        detail: { day: data.day, type: data.type, time: data.time }
      }));
      
      showNotification({ message: 'Pickup added successfully!', type: 'success', duration: 3000 });
    }
    
    setPickups(updatedPickups);
    closeModal();
  }, [editingPickup, pickups, showNotification, closeModal]);

  const handleDelete = useCallback((id: number) => {
    const deletedPickup = pickups.find(p => p.id === id);
    
    confirm({
      title: 'Delete Pickup',
      message: 'Are you sure you want to delete this pickup? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => {
        const updatedPickups = pickups.filter(p => p.id !== id);
        setPickups(updatedPickups);
        
        if (deletedPickup) {
          window.dispatchEvent(new CustomEvent('pickup-deleted', {
            detail: { day: deletedPickup.day, type: deletedPickup.type, time: deletedPickup.time }
          }));
          
          showNotification({ message: `Pickup for ${deletedPickup.day} deleted successfully!`, type: 'warning', duration: 3000 });
        }
      }
    });
  }, [pickups, confirm, showNotification]);

  if (isLoading || isWasteDataLoading) {
    return (
      <AuthGuard>
        <ProtectedLayout activeMenu="dashboard">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </ProtectedLayout>
      </AuthGuard>
    );
  }

  const DesktopView = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <LayoutDashboard size={28} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Overview of your recycling activities</p>
          </div>
        </div>
      </div>

      <MetricsCards metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartSection 
          selectedChartType={selectedChartType}
          setSelectedChartType={setSelectedChartType}
          selectedDate={selectedDate}
          chartData={chartData}
          maxValue={maxValue}
          todayData={todayData}
        />

        <PickupsSection 
          pickups={pickups}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onAdd={openAddModal}
        />
      </div>

      <MaterialBreakdown totals={totals} />
    </div>
  );

  return (
    <AuthGuard>
      <ProtectedLayout activeMenu="dashboard">
        {isMobile ? (
          <MobileViewComponent 
            metrics={metrics}
            chartData={chartData}
            maxValue={maxValue}
            todayData={todayData}
            pickups={pickups}
            totals={totals}
            selectedChartType={selectedChartType}
            setSelectedChartType={setSelectedChartType}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onAdd={openAddModal}
          />
        ) : (
          <DesktopView />
        )}

        <PickupModal 
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editingPickup={editingPickup}
          initialData={formData}
        />
      </ProtectedLayout>
    </AuthGuard>
  );
}