'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import AuthGuard from '@/app/components/AuthGuard';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import { supabase } from '@/app/lib/supabase';
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
  LayoutDashboard,
  RefreshCw,
  MapPin,
  Truck,
  CheckCircle,
  Menu
} from 'lucide-react';

interface Pickup {
  id: number;
  day: string;
  type: string;
  time: string;
  user_id: string;
  created_at?: string;
}

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

// Pickup Modal Component
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all duration-300 scale-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-100 rounded-xl">
              <Truck size={20} className="text-teal-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{editingPickup ? 'Edit Pickup' : 'Schedule Pickup'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Day</label>
            <select 
              name="day" 
              value={localFormData.day} 
              onChange={handleInputChange} 
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50"
            >
              <option value="">Select Type</option>
              {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
            <input 
              type="text" 
              name="time" 
              value={localFormData.time} 
              onChange={handleInputChange} 
              placeholder="e.g., 9:00 AM, 10:30 PM" 
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all bg-gray-50" 
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2">
            <Truck size={16} />
            {editingPickup ? 'Update Pickup' : 'Schedule Pickup'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

PickupModal.displayName = 'PickupModal';

// Main Dashboard Component
export default function DashboardPage() {
  const { user } = useSupabaseAuth();
  const { wasteRecords, isLoading: isWasteDataLoading, refreshData } = useRecyclingData();
  const { confirm } = useConfirmation();
  const { showNotification } = useNotification();
  
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChartType, setSelectedChartType] = useState<'bar' | 'pie'>('bar');
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [hoveredBar, setHoveredBar] = useState<{ date: string; paper: number; plastic: number; metal: number } | null>(null);
  const [selectedBar, setSelectedBar] = useState<{ date: string; paper: number; plastic: number; metal: number } | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPickup, setEditingPickup] = useState<Pickup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [formData, setFormData] = useState({ day: '', type: '', time: '' });
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());

  // Mobile slide-out sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Dashboard visibility state
  const [dashboardVisibility, setDashboardVisibility] = useState({
    showMetricsCards: true,
    showChart: true,
    showPickupsSidebar: true,
    showMaterialBreakdown: true,
  });

  // Load pickups from Supabase
  const loadPickups = useCallback(async () => {
    if (!user?.id) {
      console.log('No user logged in');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Loading pickups for user:', user.id);
      
      const { data, error } = await supabase
        .from('daily_pickup')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Pickups loaded:', data?.length || 0);
      setPickups(data || []);
    } catch (error: any) {
      console.error('Error loading pickups:', error.message);
      showNotification({
        message: error.message || 'Failed to load pickups',
        type: 'error',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, showNotification]);

  // Add pickup to Supabase
  const addPickup = useCallback(async (pickupData: { day: string; type: string; time: string }) => {
    if (!user?.id) {
      showNotification({
        message: 'Please login to add pickups',
        type: 'error',
        duration: 3000
      });
      return;
    }

    try {
      console.log('Adding pickup:', pickupData);
      
      const { data, error } = await supabase
        .from('daily_pickup')
        .insert([{
          day: pickupData.day,
          type: pickupData.type,
          time: pickupData.time,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      console.log('Pickup added successfully:', data);
      setPickups(prev => [data, ...prev]);
      
      showNotification({
        message: 'Pickup scheduled successfully!',
        type: 'success',
        duration: 3000
      });
      
      return data;
    } catch (error: any) {
      console.error('Error adding pickup:', error.message);
      showNotification({
        message: error.message || 'Failed to schedule pickup',
        type: 'error',
        duration: 3000
      });
      throw error;
    }
  }, [user?.id, showNotification]);

  // Update pickup in Supabase
  const updatePickup = useCallback(async (id: number, pickupData: { day: string; type: string; time: string }) => {
    if (!user?.id) return;

    try {
      console.log('Updating pickup:', id, pickupData);
      
      const { data, error } = await supabase
        .from('daily_pickup')
        .update({
          day: pickupData.day,
          type: pickupData.type,
          time: pickupData.time
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('Pickup updated successfully:', data);
      setPickups(prev => prev.map(p => p.id === id ? data : p));
      
      showNotification({
        message: 'Pickup updated successfully!',
        type: 'success',
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error updating pickup:', error.message);
      showNotification({
        message: error.message || 'Failed to update pickup',
        type: 'error',
        duration: 3000
      });
    }
  }, [user?.id, showNotification]);

  // Delete pickup from Supabase
  const deletePickup = useCallback(async (id: number) => {
    if (!user?.id) return;

    try {
      console.log('Deleting pickup:', id);
      
      const { error } = await supabase
        .from('daily_pickup')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      console.log('Pickup deleted successfully');
      setPickups(prev => prev.filter(p => p.id !== id));
      
      showNotification({
        message: 'Pickup cancelled successfully!',
        type: 'warning',
        duration: 3000
      });
    } catch (error: any) {
      console.error('Error deleting pickup:', error.message);
      showNotification({
        message: error.message || 'Failed to cancel pickup',
        type: 'error',
        duration: 3000
      });
    }
  }, [user?.id, showNotification]);

  // Load dashboard visibility from localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('dashboard_visibility_settings');
    if (savedVisibility) {
      setDashboardVisibility(JSON.parse(savedVisibility));
    }
  }, []);

  // Listen for visibility changes from settings
  useEffect(() => {
    const handleVisibilityChange = (event: CustomEvent) => {
      setDashboardVisibility(event.detail);
    };

    window.addEventListener('dashboard-visibility-changed', handleVisibilityChange as EventListener);
    
    return () => {
      window.removeEventListener('dashboard-visibility-changed', handleVisibilityChange as EventListener);
    };
  }, []);

  // Load pickups on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadPickups();
    }
  }, [user?.id, loadPickups]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('daily_pickup_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_pickup',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Realtime update received:', payload);
          loadPickups();
          setShowLiveIndicator(true);
          setTimeout(() => setShowLiveIndicator(false), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadPickups]);

  // Handle tab visibility
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveTime;
      
      if (document.visibilityState === 'visible') {
        if (timeSinceLastActive > 2 * 60 * 1000) {
          window.location.reload();
          return;
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.reload();
          return;
        }
        
        await refreshData();
        await loadPickups();
        setLastActiveTime(now);
        setShowLiveIndicator(true);
        setTimeout(() => setShowLiveIndicator(false), 2000);
      } else {
        setLastActiveTime(now);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshData, loadPickups, lastActiveTime]);

  // Check screen size for mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Show live indicator briefly
  useEffect(() => {
    if (showLiveIndicator) {
      const timer = setTimeout(() => setShowLiveIndicator(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showLiveIndicator]);

  // Update last active time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setLastActiveTime(Date.now());
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Calculate totals for chart
  const totals = useMemo(() => {
    const paper = wasteRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
    const plastic = wasteRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
    const metal = wasteRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
    const grand = paper + plastic + metal;
    return { paper, plastic, metal, grand };
  }, [wasteRecords]);

  const todayData = useMemo(() => {
    const found = wasteRecords.find(r => r.date === selectedDate);
    return found || { paper: 0, plastic: 0, metal: 0, total: 0 };
  }, [wasteRecords, selectedDate]);

  const metrics = useMemo(() => [
    { label: 'Paper Today', value: `${todayData.paper} kg`, color: 'blue', icon: FileText, data: todayData.paper },
    { label: 'Plastic Today', value: `${todayData.plastic} kg`, color: 'yellow', icon: Package, data: todayData.plastic },
    { label: 'Metal Today', value: `${todayData.metal} kg`, color: 'purple', icon: Recycle, data: todayData.metal },
  ], [todayData]);

  const chartData = useMemo(() => wasteRecords.slice(0, 7), [wasteRecords]);
  const maxValue = useMemo(() => 
    chartData.length > 0 
      ? Math.max(...chartData.flatMap(d => [d.paper || 0, d.plastic || 0, d.metal || 0]))
      : 1
  , [chartData]);

  // Modal handlers
  const openAddModal = () => {
    setEditingPickup(null);
    setFormData({ day: '', type: '', time: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (pickup: Pickup) => {
    setEditingPickup(pickup);
    setFormData({ day: pickup.day, type: pickup.type, time: pickup.time });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPickup(null);
  };

  const handleSubmit = useCallback(async (data: { day: string; type: string; time: string }) => {
    if (!data.day || !data.type || !data.time) {
      showNotification({
        message: 'Please fill all fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    try {
      if (editingPickup) {
        await updatePickup(editingPickup.id, data);
      } else {
        await addPickup(data);
      }
      closeModal();
    } catch (error) {
      // Error already handled in functions
    }
  }, [editingPickup, addPickup, updatePickup, showNotification, closeModal]);

  const handleDelete = useCallback((id: number) => {
    const pickup = pickups.find(p => p.id === id);
    confirm({
      title: 'Cancel Pickup',
      message: `Are you sure you want to cancel the pickup scheduled for ${pickup?.day}?`,
      confirmText: 'Yes, Cancel',
      cancelText: 'No, Keep',
      type: 'warning',
      onConfirm: () => deletePickup(id)
    });
  }, [pickups, confirm, deletePickup]);

  const handleManualRefresh = async () => {
    await refreshData();
    await loadPickups();
    setShowLiveIndicator(true);
    showNotification({
      message: 'Data refreshed successfully!',
      type: 'success',
      duration: 2000
    });
  };

  // Get current date for display
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Pie slice data for tooltips
  const pieSlices = [
    { 
      name: 'Paper', 
      value: totals.paper, 
      percentage: ((totals.paper / totals.grand) * 100 || 0).toFixed(1),
      color: '#3B82F6',
      hoverColor: '#2563EB',
      icon: FileText,
      dateRange: 'All time'
    },
    { 
      name: 'Plastic', 
      value: totals.plastic, 
      percentage: ((totals.plastic / totals.grand) * 100 || 0).toFixed(1),
      color: '#EAB308',
      hoverColor: '#CA8A04',
      icon: Package,
      dateRange: 'All time'
    },
    { 
      name: 'Metal', 
      value: totals.metal, 
      percentage: ((totals.metal / totals.grand) * 100 || 0).toFixed(1),
      color: '#A855F7',
      hoverColor: '#9333EA',
      icon: Recycle,
      dateRange: 'All time'
    }
  ];

  if (isWasteDataLoading && wasteRecords.length === 0) {
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

  return (
    <AuthGuard>
      <ProtectedLayout activeMenu="dashboard">
        <div className="flex flex-col lg:flex-row min-h-screen">
          {/* Main Content Area - Scrollable */}
          <div className="flex-1 min-w-0 px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-4 sm:py-5 md:py-6">
            {/* Header with refresh, live indicator, and mobile menu button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Mobile: Menu Button to open pickups sidebar */}
                {isMobile && (
                  <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-gray-600 hover:text-teal-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    <Menu size={22} />
                  </button>
                )}
                {showLiveIndicator && (
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full animate-pulse shadow-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium">Live</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleManualRefresh}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-teal-600 transition-colors rounded-xl hover:bg-gray-100"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>

            {/* DESKTOP VIEW: Metrics Cards first, then Chart */}
            {!isMobile && (
              <>
                {/* Metrics Cards - First on Desktop */}
                {dashboardVisibility.showMetricsCards && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    {metrics.map((metric, idx) => {
                      const Icon = metric.icon;
                      const colors = getColorClasses(metric.color);
                      return (
                        <div key={idx} className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${colors.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-gray-500">{metric.label}</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${colors.bg}`}>
                              <Icon className={colors.text} size={20} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Chart Section - Second on Desktop */}
                {dashboardVisibility.showChart && (
                  <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        {selectedChartType === 'bar' ? (
                          <BarChart3 size={24} className="text-teal-600" />
                        ) : (
                          <PieChart size={24} className="text-teal-600" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedChartType === 'bar' ? 'Last 7 Days Trend' : 'Material Composition'}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedChartType('bar')} className={`p-2 rounded-lg transition-all ${selectedChartType === 'bar' ? 'bg-teal-100 text-teal-600 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          <BarChart3 size={18} />
                        </button>
                        <button onClick={() => setSelectedChartType('pie')} className={`p-2 rounded-lg transition-all ${selectedChartType === 'pie' ? 'bg-teal-100 text-teal-600 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          <PieChart size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {selectedChartType === 'bar' ? (
                      <div className="relative">
                        {(hoveredBar || selectedBar) && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10 text-xs mb-2 whitespace-nowrap">
                            <div className="font-semibold mb-1">{hoveredBar?.date || selectedBar?.date}</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Paper: {(hoveredBar?.paper || selectedBar?.paper || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span>Plastic: {(hoveredBar?.plastic || selectedBar?.plastic || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Metal: {(hoveredBar?.metal || selectedBar?.metal || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="border-t border-gray-700 my-1 pt-1">
                                <span className="font-semibold">Total: {((hoveredBar?.paper || selectedBar?.paper || 0) + (hoveredBar?.plastic || selectedBar?.plastic || 0) + (hoveredBar?.metal || selectedBar?.metal || 0)).toFixed(1)} kg</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 text-center">As of {currentDate}</div>
                          </div>
                        )}
                        <div className="h-80 flex items-end justify-between gap-2">
                          {chartData.map((data, idx) => {
                            const maxH = 240;
                            const paperH = ((data.paper || 0) / maxValue) * maxH;
                            const plasticH = ((data.plastic || 0) / maxValue) * maxH;
                            const metalH = ((data.metal || 0) / maxValue) * maxH;
                            return (
                              <div 
                                key={idx} 
                                className="flex-1 flex flex-col items-center gap-2 group"
                                onMouseEnter={() => setHoveredBar({
                                  date: data.date,
                                  paper: data.paper || 0,
                                  plastic: data.plastic || 0,
                                  metal: data.metal || 0
                                })}
                                onMouseLeave={() => setHoveredBar(null)}
                                onClick={() => {
                                  if (selectedBar?.date === data.date) {
                                    setSelectedBar(null);
                                  } else {
                                    setSelectedBar({
                                      date: data.date,
                                      paper: data.paper || 0,
                                      plastic: data.plastic || 0,
                                      metal: data.metal || 0
                                    });
                                  }
                                }}
                              >
                                <div className="flex justify-center gap-1 items-end w-full cursor-pointer">
                                  <div 
                                    className="flex-1 max-w-[30px] bg-blue-500 rounded-t transition-all group-hover:bg-blue-600 group-hover:scale-110" 
                                    style={{ height: `${paperH}px` }}
                                  />
                                  <div 
                                    className="flex-1 max-w-[30px] bg-yellow-500 rounded-t transition-all group-hover:bg-yellow-600 group-hover:scale-110" 
                                    style={{ height: `${plasticH}px` }}
                                  />
                                  <div 
                                    className="flex-1 max-w-[30px] bg-purple-500 rounded-t transition-all group-hover:bg-purple-600 group-hover:scale-110" 
                                    style={{ height: `${metalH}px` }}
                                  />
                                </div>
                                <div className="text-xs text-gray-500 group-hover:text-teal-600 transition-colors font-medium">{data.date?.slice(5)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-80 flex items-center justify-center">
                        <div className="relative w-64 h-64">
                          {(hoveredSlice || selectedSlice) && (
                            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap text-xs flex flex-col items-center">
                              <span className="font-semibold">{(hoveredSlice || selectedSlice)?.split(':')[0]}</span>
                              <span>{(hoveredSlice || selectedSlice)?.split(':')[1]}</span>
                            </div>
                          )}
                          
                          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.paper / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Paper: ${totals.paper.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.paper / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Paper: ${totals.paper.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#3B82F6" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.paper / totals.grand || 0) * 251.2} 251.2`} 
                                className="transition-all duration-300 hover:stroke-blue-700"
                              />
                            </g>
                            
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.plastic / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Plastic: ${totals.plastic.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.plastic / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Plastic: ${totals.plastic.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#EAB308" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.plastic / totals.grand || 0) * 251.2} 251.2`} 
                                strokeDashoffset={`-${(totals.paper / totals.grand || 0) * 251.2}`}
                                className="transition-all duration-300 hover:stroke-yellow-600"
                              />
                            </g>
                            
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.metal / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Metal: ${totals.metal.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.metal / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Metal: ${totals.metal.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#A855F7" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.metal / totals.grand || 0) * 251.2} 251.2`} 
                                strokeDashoffset={`-${((totals.paper + totals.plastic) / totals.grand || 0) * 251.2}`}
                                className="transition-all duration-300 hover:stroke-purple-600"
                              />
                            </g>
                          </svg>
                          
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-800">{totals.grand.toFixed(1)}</p>
                              <p className="text-xs text-gray-500">Total kg</p>
                              <p className="text-[10px] text-gray-400 mt-1">{currentDate.split(',')[0]}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedChartType === 'bar' ? (
                      <div className="flex justify-center gap-8 mt-6 pt-2">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Paper</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Plastic</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-purple-500 rounded-full"></div><span className="text-sm font-medium text-gray-700">Metal</span></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-4 mt-6 pt-2 max-w-md mx-auto">
                        {pieSlices.map((slice, idx) => {
                          const Icon = slice.icon;
                          const sliceText = `${slice.name}: ${slice.value.toFixed(1)} kg (${slice.percentage}%) | As of ${currentDate}`;
                          return (
                            <div 
                              key={idx} 
                              className="flex flex-col items-center gap-1 cursor-pointer transition-all duration-300 hover:scale-105"
                              onMouseEnter={() => setHoveredSlice(sliceText)}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                }
                              }}
                            >
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }}></div>
                              <span className="text-xs font-medium text-gray-700">{slice.name}</span>
                              <span className="text-sm font-bold" style={{ color: slice.color }}>{slice.percentage}%</span>
                              <span className="text-xs text-gray-500">{slice.value.toFixed(1)} kg</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* MOBILE VIEW: Chart first, then Metrics Cards */}
            {isMobile && (
              <>
                {/* Chart Section - First on Mobile */}
                {dashboardVisibility.showChart && (
                  <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 mb-6">
                    <div className={`flex justify-between items-center mb-4 flex-col gap-3`}>
                      <div className="flex items-center gap-2">
                        {selectedChartType === 'bar' ? (
                          <BarChart3 size={24} className="text-teal-600" />
                        ) : (
                          <PieChart size={24} className="text-teal-600" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedChartType === 'bar' ? 'Last 7 Days Trend' : 'Material Composition'}
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedChartType('bar')} className={`p-2 rounded-lg transition-all ${selectedChartType === 'bar' ? 'bg-teal-100 text-teal-600 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          <BarChart3 size={18} />
                        </button>
                        <button onClick={() => setSelectedChartType('pie')} className={`p-2 rounded-lg transition-all ${selectedChartType === 'pie' ? 'bg-teal-100 text-teal-600 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          <PieChart size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {selectedChartType === 'bar' ? (
                      <div className="relative">
                        {(hoveredBar || selectedBar) && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10 text-xs mb-2 whitespace-nowrap">
                            <div className="font-semibold mb-1">{hoveredBar?.date || selectedBar?.date}</div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>Paper: {(hoveredBar?.paper || selectedBar?.paper || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span>Plastic: {(hoveredBar?.plastic || selectedBar?.plastic || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span>Metal: {(hoveredBar?.metal || selectedBar?.metal || 0).toFixed(1)} kg</span>
                              </div>
                              <div className="border-t border-gray-700 my-1 pt-1">
                                <span className="font-semibold">Total: {((hoveredBar?.paper || selectedBar?.paper || 0) + (hoveredBar?.plastic || selectedBar?.plastic || 0) + (hoveredBar?.metal || selectedBar?.metal || 0)).toFixed(1)} kg</span>
                              </div>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1 text-center">As of {currentDate}</div>
                          </div>
                        )}
                        <div className="h-64 flex items-end justify-between gap-1 overflow-x-auto pb-2">
                          {chartData.map((data, idx) => {
                            const maxH = 180;
                            const paperH = ((data.paper || 0) / maxValue) * maxH;
                            const plasticH = ((data.plastic || 0) / maxValue) * maxH;
                            const metalH = ((data.metal || 0) / maxValue) * maxH;
                            return (
                              <div 
                                key={idx} 
                                className="flex-1 flex flex-col items-center gap-2 group min-w-[45px]"
                                onMouseEnter={() => setHoveredBar({
                                  date: data.date,
                                  paper: data.paper || 0,
                                  plastic: data.plastic || 0,
                                  metal: data.metal || 0
                                })}
                                onMouseLeave={() => setHoveredBar(null)}
                                onClick={() => {
                                  if (selectedBar?.date === data.date) {
                                    setSelectedBar(null);
                                  } else {
                                    setSelectedBar({
                                      date: data.date,
                                      paper: data.paper || 0,
                                      plastic: data.plastic || 0,
                                      metal: data.metal || 0
                                    });
                                    setTimeout(() => setSelectedBar(null), 3000);
                                  }
                                }}
                              >
                                <div className="flex justify-center gap-1 items-end w-full cursor-pointer">
                                  <div 
                                    className="flex-1 max-w-[25px] bg-blue-500 rounded-t transition-all group-hover:bg-blue-600 group-hover:scale-110" 
                                    style={{ height: `${paperH}px` }}
                                  />
                                  <div 
                                    className="flex-1 max-w-[25px] bg-yellow-500 rounded-t transition-all group-hover:bg-yellow-600 group-hover:scale-110" 
                                    style={{ height: `${plasticH}px` }}
                                  />
                                  <div 
                                    className="flex-1 max-w-[25px] bg-purple-500 rounded-t transition-all group-hover:bg-purple-600 group-hover:scale-110" 
                                    style={{ height: `${metalH}px` }}
                                  />
                                </div>
                                <div className="text-[10px] text-gray-500 group-hover:text-teal-600 transition-colors font-medium">{data.date?.slice(5)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="relative w-48 h-48">
                          {(hoveredSlice || selectedSlice) && (
                            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap text-xs flex flex-col items-center">
                              <span className="font-semibold">{(hoveredSlice || selectedSlice)?.split(':')[0]}</span>
                              <span>{(hoveredSlice || selectedSlice)?.split(':')[1]}</span>
                            </div>
                          )}
                          
                          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.paper / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Paper: ${totals.paper.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.paper / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Paper: ${totals.paper.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                  setTimeout(() => setSelectedSlice(null), 3000);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#3B82F6" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.paper / totals.grand || 0) * 251.2} 251.2`} 
                                className="transition-all duration-300 hover:stroke-blue-700"
                              />
                            </g>
                            
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.plastic / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Plastic: ${totals.plastic.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.plastic / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Plastic: ${totals.plastic.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                  setTimeout(() => setSelectedSlice(null), 3000);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#EAB308" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.plastic / totals.grand || 0) * 251.2} 251.2`} 
                                strokeDashoffset={`-${(totals.paper / totals.grand || 0) * 251.2}`}
                                className="transition-all duration-300 hover:stroke-yellow-600"
                              />
                            </g>
                            
                            <g
                              onMouseEnter={() => {
                                const percentage = ((totals.metal / totals.grand) * 100 || 0).toFixed(1);
                                setHoveredSlice(`Metal: ${totals.metal.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`);
                              }}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                const percentage = ((totals.metal / totals.grand) * 100 || 0).toFixed(1);
                                const sliceText = `Metal: ${totals.metal.toFixed(1)} kg (${percentage}%) | As of ${currentDate}`;
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                  setTimeout(() => setSelectedSlice(null), 3000);
                                }
                              }}
                              className="cursor-pointer transition-all duration-300"
                            >
                              <circle 
                                cx="50" 
                                cy="50" 
                                r="40" 
                                fill="none" 
                                stroke="#A855F7" 
                                strokeWidth="20" 
                                strokeDasharray={`${(totals.metal / totals.grand || 0) * 251.2} 251.2`} 
                                strokeDashoffset={`-${((totals.paper + totals.plastic) / totals.grand || 0) * 251.2}`}
                                className="transition-all duration-300 hover:stroke-purple-600"
                              />
                            </g>
                          </svg>
                          
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                              <p className="text-xl font-bold text-gray-800">{totals.grand.toFixed(1)}</p>
                              <p className="text-[10px] text-gray-500">Total kg</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedChartType === 'bar' ? (
                      <div className="flex justify-center gap-4 mt-6 pt-2">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><span className="text-[10px] font-medium text-gray-700">Paper</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500 rounded-full"></div><span className="text-[10px] font-medium text-gray-700">Plastic</span></div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-purple-500 rounded-full"></div><span className="text-[10px] font-medium text-gray-700">Metal</span></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 mt-6 pt-2 max-w-md mx-auto">
                        {pieSlices.map((slice, idx) => {
                          const Icon = slice.icon;
                          const sliceText = `${slice.name}: ${slice.value.toFixed(1)} kg (${slice.percentage}%) | As of ${currentDate}`;
                          return (
                            <div 
                              key={idx} 
                              className="flex flex-col items-center gap-0.5 cursor-pointer transition-all duration-300 hover:scale-105"
                              onMouseEnter={() => setHoveredSlice(sliceText)}
                              onMouseLeave={() => setHoveredSlice(null)}
                              onClick={() => {
                                if (selectedSlice === sliceText) {
                                  setSelectedSlice(null);
                                } else {
                                  setSelectedSlice(sliceText);
                                  setTimeout(() => setSelectedSlice(null), 3000);
                                }
                              }}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }}></div>
                              <span className="text-[10px] font-medium text-gray-700">{slice.name}</span>
                              <span className="text-[10px] font-bold" style={{ color: slice.color }}>{slice.percentage}%</span>
                              <span className="text-[8px] text-gray-500">{slice.value.toFixed(1)} kg</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Metrics Cards - Second on Mobile */}
                {dashboardVisibility.showMetricsCards && (
                  <div className="grid grid-cols-1 gap-4 mb-6">
                    {metrics.map((metric, idx) => {
                      const Icon = metric.icon;
                      const colors = getColorClasses(metric.color);
                      return (
                        <div key={idx} className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${colors.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-xs text-gray-500">{metric.label}</p>
                              <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                            </div>
                            <div className={`p-2 rounded-lg ${colors.bg}`}>
                              <Icon className={colors.text} size={20} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Desktop Sidebar - Static (unchanged) */}
          {dashboardVisibility.showPickupsSidebar && !isMobile && (
            <div className="w-80 flex-shrink-0 hidden lg:block">
              <div className="fixed top-24 w-80">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3.5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-white/20 rounded-xl backdrop-blur-sm">
                          <Truck size={16} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">Upcoming Pickups</h3>
                          <p className="text-[10px] text-white/80">{pickups.length} scheduled</p>
                        </div>
                      </div>
                      <button 
                        onClick={openAddModal} 
                        className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-medium text-white transition-all duration-300 flex items-center gap-1"
                      >
                        <Plus size={11} />
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                      {isLoading && pickups.length === 0 ? (
                        Array(4).fill(0).map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-14 bg-gray-100 rounded-xl"></div>
                          </div>
                        ))
                      ) : pickups.length > 0 ? (
                        pickups.map((item) => {
                          const getTypeIcon = (type: string) => {
                            switch(type) {
                              case 'Paper': return <FileText size={12} className="text-blue-500" />;
                              case 'Plastic': return <Package size={12} className="text-yellow-500" />;
                              case 'Metal': return <Recycle size={12} className="text-purple-500" />;
                              default: return <Package size={12} className="text-gray-500" />;
                            }
                          };
                          
                          const getTypeColor = (type: string) => {
                            switch(type) {
                              case 'Paper': return 'bg-blue-50 border-blue-100';
                              case 'Plastic': return 'bg-yellow-50 border-yellow-100';
                              case 'Metal': return 'bg-purple-50 border-purple-100';
                              default: return 'bg-gray-50 border-gray-100';
                            }
                          };
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`group relative rounded-xl p-2.5 border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${getTypeColor(item.type)}`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2 flex-1">
                                  <div className="min-w-[52px]">
                                    <div className="px-1.5 py-0.5 bg-white rounded-md text-center shadow-sm">
                                      <p className="text-[10px] font-bold text-gray-800">{item.day}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {getTypeIcon(item.type)}
                                      <p className="text-[11px] font-semibold text-gray-800">{item.type}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock size={9} className="text-gray-400" />
                                      <p className="text-[9px] text-gray-500">{item.time}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button 
                                    onClick={() => openEditModal(item)} 
                                    className="p-1 text-blue-500 hover:bg-white rounded-md transition-all hover:scale-110"
                                  >
                                    <Edit size={10} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(item.id)} 
                                    className="p-1 text-red-500 hover:bg-white rounded-md transition-all hover:scale-110"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Truck size={16} className="text-gray-300" />
                          </div>
                          <p className="text-gray-500 text-xs">No pickups scheduled</p>
                          <button 
                            onClick={openAddModal} 
                            className="mt-2 text-teal-600 text-[10px] font-medium hover:underline inline-flex items-center gap-1"
                          >
                            <Plus size={10} />
                            Schedule pickup
                          </button>
                        </div>
                      )}
                    </div>

                    {pickups.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1 text-gray-500">
                            <MapPin size={9} />
                            <span>{pickups.length} pickup{pickups.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center gap-1 text-teal-600">
                            <CheckCircle size={9} />
                            <span>Ready</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Slide-out Sidebar for Pickups */}
        {isMobile && (
          <>
            {/* Overlay */}
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}
            
            {/* Slide-out Sidebar */}
            <div className={`fixed top-0 right-0 h-full w-85 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-5 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                        <Truck size={18} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Upcoming Pickups</h3>
                        <p className="text-[11px] text-white/80">{pickups.length} scheduled</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsSidebarOpen(false)}
                      className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {isLoading && pickups.length === 0 ? (
                      Array(4).fill(0).map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-20 bg-gray-100 rounded-xl"></div>
                        </div>
                      ))
                    ) : pickups.length > 0 ? (
                      pickups.map((item) => {
                        const getTypeIcon = (type: string) => {
                          switch(type) {
                            case 'Paper': return <FileText size={16} className="text-blue-500" />;
                            case 'Plastic': return <Package size={16} className="text-yellow-500" />;
                            case 'Metal': return <Recycle size={16} className="text-purple-500" />;
                            default: return <Package size={16} className="text-gray-500" />;
                          }
                        };
                        
                        const getTypeColor = (type: string) => {
                          switch(type) {
                            case 'Paper': return 'bg-blue-50 border-blue-100';
                            case 'Plastic': return 'bg-yellow-50 border-yellow-100';
                            case 'Metal': return 'bg-purple-50 border-purple-100';
                            default: return 'bg-gray-50 border-gray-100';
                          }
                        };
                        
                        return (
                          <div 
                            key={item.id} 
                            className={`group rounded-xl p-3 border transition-all duration-300 ${getTypeColor(item.type)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {getTypeIcon(item.type)}
                                  <p className="text-sm font-semibold text-gray-800">{item.type}</p>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span>{item.day}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock size={12} />
                                    <span>{item.time}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <button 
                                  onClick={() => {
                                    setIsSidebarOpen(false);
                                    setTimeout(() => openEditModal(item), 300);
                                  }} 
                                  className="p-1.5 text-blue-500 hover:bg-white rounded-lg transition-all"
                                >
                                  <Edit size={12} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(item.id)} 
                                  className="p-1.5 text-red-500 hover:bg-white rounded-lg transition-all"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Truck size={24} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm">No pickups scheduled</p>
                        <button 
                          onClick={() => {
                            setIsSidebarOpen(false);
                            openAddModal();
                          }} 
                          className="mt-4 text-teal-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Schedule pickup
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer - Add Button */}
                <div className="p-4 border-t border-gray-100">
                  <button 
                    onClick={() => {
                      setIsSidebarOpen(false);
                      openAddModal();
                    }} 
                    className="w-full py-3 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Schedule New Pickup
                  </button>
                </div>
              </div>
            </div>
          </>
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


