'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  FileText,
  Package,
  Recycle,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Edit,
  Plus,
  X,
  Download,
  Filter,
  ArrowUpDown,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface Disposal {
  id: number;
  type: string;
  item: string;
  date: string;
  time: string;
  weight: string;
  location?: string;
  paper?: number;
  plastic?: number;
  metal?: number;
}

export default function RecyclingSegregationPage() {
  const { wasteRecords, addWasteRecord, updateWasteRecord, deleteWasteRecord, error } = useRecyclingData();
  const { confirm } = useConfirmation();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('overview');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDisposal, setEditingDisposal] = useState<Disposal | null>(null);
  const [formData, setFormData] = useState({ 
    type: '', 
    item: '', 
    date: '', 
    time: '', 
    weight: '',
    location: ''
  });

  const totalPaper = wasteRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
  const totalPlastic = wasteRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
  const totalMetal = wasteRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
  const grandTotal = totalPaper + totalPlastic + totalMetal;
  
  const averagePerDay = wasteRecords.length > 0 ? grandTotal / wasteRecords.length : 0;
  const averagePaper = wasteRecords.length > 0 ? totalPaper / wasteRecords.length : 0;
  const averagePlastic = wasteRecords.length > 0 ? totalPlastic / wasteRecords.length : 0;
  const averageMetal = wasteRecords.length > 0 ? totalMetal / wasteRecords.length : 0;

  const disposals: Disposal[] = wasteRecords
    .map(record => {
      let type = 'Mixed';
      if (record.paper > record.plastic && record.paper > record.metal) type = 'Paper';
      else if (record.plastic > record.paper && record.plastic > record.metal) type = 'Plastic';
      else if (record.metal > record.paper && record.metal > record.plastic) type = 'Metal';
      
      return {
        id: record.id,
        type: type,
        item: `Recyclable item - ${record.date}`,
        date: record.date,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        weight: `${(record.paper + record.plastic + record.metal).toFixed(1)} kg`,
        location: 'Zone A',
        paper: record.paper,
        plastic: record.plastic,
        metal: record.metal
      };
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc' 
          ? b.date.localeCompare(a.date) 
          : a.date.localeCompare(b.date);
      }
      if (sortField === 'type') {
        return sortDirection === 'desc' 
          ? b.type.localeCompare(a.type) 
          : a.type.localeCompare(b.type);
      }
      if (sortField === 'weight') {
        const weightA = parseFloat(a.weight) || 0;
        const weightB = parseFloat(b.weight) || 0;
        return sortDirection === 'desc' ? weightB - weightA : weightA - weightB;
      }
      return 0;
    })
    .filter(disposal => {
      if (filterType !== 'all' && disposal.type !== filterType) return false;
      if (searchTerm) {
        return disposal.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
               disposal.location?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });

  const recyclableCategories = [
    { id: 'paper', label: 'Paper', value: `${totalPaper.toFixed(1)} kg`, color: 'blue', icon: FileText },
    { id: 'plastic', label: 'Plastic', value: `${totalPlastic.toFixed(1)} kg`, color: 'yellow', icon: Package },
    { id: 'metal', label: 'Metal', value: `${totalMetal.toFixed(1)} kg`, color: 'purple', icon: Recycle },
  ];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openAddModal = () => {
    setEditingDisposal(null);
    setFormData({ 
      type: '', 
      item: '', 
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      weight: '',
      location: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (disposal: Disposal) => {
    setEditingDisposal(disposal);
    setFormData({
      type: disposal.type,
      item: disposal.item,
      date: disposal.date,
      time: disposal.time,
      weight: disposal.weight.replace(' kg', ''),
      location: disposal.location || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.type || !formData.item || !formData.date || !formData.time || !formData.weight) {
      showNotification({
        message: 'Please fill all required fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const weight = parseFloat(formData.weight) || 0;

    try {
      if (editingDisposal) {
        const paper = formData.type === 'Paper' ? weight : 0;
        const plastic = formData.type === 'Plastic' ? weight : 0;
        const metal = formData.type === 'Metal' ? weight : 0;

        await updateWasteRecord(editingDisposal.id, {
          date: formData.date,
          paper,
          plastic,
          metal
        });
        showNotification({
          message: 'Disposal record updated successfully!',
          type: 'success',
          duration: 3000
        });
      } else {
        const paper = formData.type === 'Paper' ? weight : 0;
        const plastic = formData.type === 'Plastic' ? weight : 0;
        const metal = formData.type === 'Metal' ? weight : 0;

        await addWasteRecord({
          date: formData.date,
          paper,
          plastic,
          metal
        });
        showNotification({
          message: 'Disposal record added successfully!',
          type: 'success',
          duration: 3000
        });
      }
      closeModal();
    } catch (err: any) {
      showNotification({
        message: err.message || 'Error saving record',
        type: 'error',
        duration: 3000
      });
    }
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Delete Disposal Record',
      message: 'Are you sure you want to delete this disposal record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteWasteRecord(id);
          showNotification({
            message: 'Disposal record deleted successfully!',
            type: 'success',
            duration: 3000
          });
        } catch (err: any) {
          showNotification({
            message: err.message || 'Error deleting record',
            type: 'error',
            duration: 3000
          });
        }
      }
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Item', 'Time', 'Weight (kg)', 'Location'];
    const csvData = disposals.map(d => [
      d.date,
      d.type,
      d.item,
      d.time,
      d.weight,
      d.location || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recycling-segregation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Paper': return 'bg-blue-100 text-blue-700';
      case 'Plastic': return 'bg-yellow-100 text-yellow-700';
      case 'Metal': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Paper': return <FileText size={14} className="text-blue-600" />;
      case 'Plastic': return <Package size={14} className="text-yellow-600" />;
      case 'Metal': return <Recycle size={14} className="text-purple-600" />;
      default: return null;
    }
  };

  return (
    <ProtectedLayout activeMenu="garbage">
      <div className="w-full overflow-x-hidden animate-fade-in">
        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-4 sm:py-5 md:py-6 lg:py-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recycling Segregation</h1>
              <p className="text-sm text-gray-600 mt-1">Manage and monitor recycling operations</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={exportToCSV}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export CSV</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-blue-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-blue-600 mb-1 sm:mb-2">
                <FileText size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Paper</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalPaper.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averagePaper.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-yellow-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-yellow-600 mb-1 sm:mb-2">
                <Package size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Plastic</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalPlastic.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averagePlastic.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-purple-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-purple-600 mb-1 sm:mb-2">
                <Recycle size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Metal</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalMetal.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averageMetal.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-green-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-green-600 mb-1 sm:mb-2">
                <TrendingUp size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Total</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{grandTotal.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">All materials</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-teal-500 hover:shadow-md transition-all duration-300 group col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1 sm:gap-2 text-teal-600 mb-1 sm:mb-2">
                <BarChart3 size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Daily Avg</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{averagePerDay.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">{wasteRecords.length} days</p>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {['overview', 'categories'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab 
                      ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'categories' && 'Categories'}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">Recyclable Categories</h3>
                    <div className="space-y-2">
                      {recyclableCategories.map((cat) => {
                        const Icon = cat.icon;
                        const colors = {
                          blue: 'bg-blue-100 text-blue-700',
                          yellow: 'bg-yellow-100 text-yellow-700',
                          purple: 'bg-purple-100 text-purple-700',
                        }[cat.color] || 'bg-gray-100 text-gray-700';

                        return (
                          <div key={cat.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                                <Icon className={`text-${cat.color}-600`} size={isMobile ? 16 : 20} />
                              </div>
                              <span className="text-xs sm:text-sm font-medium">{cat.label}</span>
                            </div>
                            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${colors}`}>
                              {cat.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">Material Breakdown</h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <FileText size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Paper</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-blue-600">
                            {((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-blue-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalPaper / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-yellow-600">
                            <Package size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Plastic</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-yellow-600">
                            {((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-yellow-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalPlastic / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-purple-600">
                            <Recycle size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Metal</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-purple-600">
                            {((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-purple-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalMetal / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="border border-blue-200 rounded-lg p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <FileText size={isMobile ? 20 : 24} className="text-blue-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Paper</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Newspapers, magazines, cardboard</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalPaper.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-blue-600">{((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="border border-yellow-200 rounded-lg p-3 sm:p-4 bg-yellow-50 hover:bg-yellow-100 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Package size={isMobile ? 20 : 24} className="text-yellow-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Plastic</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Bottles, containers, jugs</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalPlastic.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-yellow-600">{((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="border border-purple-200 rounded-lg p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 transition-all group sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Recycle size={isMobile ? 20 : 24} className="text-purple-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Metal</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Aluminum cans, tin cans, foil</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalMetal.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-purple-600">{((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {editingDisposal ? <Edit size={20} className="text-teal-600" /> : <Plus size={20} className="text-teal-600" />}
                {editingDisposal ? 'Edit Record' : 'Add New Record'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  <option value="Paper">Paper</option>
                  <option value="Plastic">Plastic</option>
                  <option value="Metal">Metal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Item</label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  placeholder="Item description"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Zone A"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Time</label>
                <input
                  type="text"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  placeholder="e.g., 10:30 AM"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="e.g., 3.2"
                  min="0"
                  step="0.1"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
                {editingDisposal ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}