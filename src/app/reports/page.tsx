'use client';

import { RecordModal } from '@/app/components/RecordModal';
import { useState, useEffect, useRef } from 'react';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  Recycle,
  CalendarDays,
  FileText,
  Package,
  Plus,
  Edit,
  X,
  Save,
  Trash2,
  Download,
  ArrowUpDown,
  Zap,
  AlertCircle,
  History,
  RefreshCw,
  Clock,
  Archive,
  Eye,
  EyeOff,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';

const ARCHIVED_DATA_KEY = 'ecowaste_archived_reports';

interface ArchivedReport {
  id: string;
  date: string;
  weekStart: string;
  weekEnd: string;
  totalPaper: number;
  totalPlastic: number;
  totalMetal: number;
  grandTotal: number;
  recordCount: number;
  records: any[];
  deletedAt?: string;
  isDeleted?: boolean;
}

export default function ReportsPage() {
  const { wasteRecords, addWasteRecord, updateWasteRecord, deleteWasteRecord, error, lastUpdate } = useRecyclingData();
  const { confirm } = useConfirmation();
  const { showNotification } = useNotification();
  const [reportType, setReportType] = useState('weekly');
  const [dateRange, setDateRange] = useState('last7days');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    paper: '',
    plastic: '',
    metal: '',
    notes: ''
  });
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadArchivedReports = () => {
      try {
        const savedArchives = localStorage.getItem(ARCHIVED_DATA_KEY);
        if (savedArchives) {
          const parsed = JSON.parse(savedArchives);
          setArchivedReports(parsed);
          console.log('Loaded archived reports:', parsed.length);
        }
      } catch (e) {
        console.error('Error parsing archived reports:', e);
      }
    };

    loadArchivedReports();
  }, []);

  useEffect(() => {
    if (archivedReports.length > 0) {
      localStorage.setItem(ARCHIVED_DATA_KEY, JSON.stringify(archivedReports));
      console.log('Saved archived reports:', archivedReports.length);
    } else {
      localStorage.removeItem(ARCHIVED_DATA_KEY);
      console.log('Removed archived reports from storage');
    }
  }, [archivedReports]);

  const getRecordType = (paper: number, plastic: number, metal: number) => {
    if (paper > 0 && paper > plastic && paper > metal) return 'Paper';
    if (plastic > 0 && plastic > paper && plastic > metal) return 'Plastic';
    if (metal > 0 && metal > paper && metal > plastic) return 'Metal';
    return 'Mixed';
  };

  const checkDuplicateDates = (records: any[]) => {
    const existingDates = new Set(wasteRecords.map(r => r.date));
    const duplicates = records.filter(r => existingDates.has(r.date));
    return duplicates.map(r => r.date);
  };

  const restoreWithDuplicateCheck = async (reportsToRestore: ArchivedReport[]) => {
    let allDuplicates: string[] = [];
    let allRecords: any[] = [];

    for (const report of reportsToRestore) {
      allRecords = [...allRecords, ...report.records];
    }

    const duplicates = checkDuplicateDates(allRecords);
    
    if (duplicates.length > 0) {
      confirm({
        title: '⚠️ Duplicate Dates Found',
        message: `The following dates already exist in current records: ${duplicates.join(', ')}. These will be skipped. Continue with restore?`,
        confirmText: 'Yes, Skip Duplicates',
        cancelText: 'Cancel',
        type: 'warning',
        onConfirm: async () => {
          await performRestore(reportsToRestore, duplicates);
        }
      });
    } else {
      confirm({
        title: 'Restore Selected Reports',
        message: `Are you sure you want to restore ${reportsToRestore.length} selected report(s)?`,
        confirmText: 'Restore',
        cancelText: 'Cancel',
        type: 'info',
        onConfirm: async () => {
          await performRestore(reportsToRestore, []);
        }
      });
    }
  };

  const performRestore = async (reportsToRestore: ArchivedReport[], skipDates: string[]) => {
    setIsRestoring(true);
    let restoredCount = 0;
    let skippedCount = 0;

    try {
      for (const report of reportsToRestore) {
        for (const record of report.records) {
          if (skipDates.includes(record.date)) {
            skippedCount++;
            continue;
          }

          await addWasteRecord({
            date: record.date,
            paper: record.paper || 0,
            plastic: record.plastic || 0,
            metal: record.metal || 0,
            notes: record.notes || `Restored from history`
          });
          restoredCount++;
        }
      }

      const restoredIds = reportsToRestore.map(r => r.id);
      setArchivedReports(prev => {
        const updated = prev.filter(r => !restoredIds.includes(r.id));
        localStorage.setItem(ARCHIVED_DATA_KEY, JSON.stringify(updated));
        return updated;
      });
      
      setSelectedReports([]);

      if (skippedCount > 0) {
        showNotification({
          message: `Restored ${restoredCount} record(s), skipped ${skippedCount} duplicate(s)`,
          type: 'warning',
          duration: 5000
        });
      } else {
        showNotification({
          message: `Successfully restored ${restoredCount} record(s) from history`,
          type: 'success',
          duration: 3000
        });
      }
    } catch (err: any) {
      console.error('Restore error:', err);
      showNotification({
        message: err.message || 'Error restoring data',
        type: 'error',
        duration: 3000
      });
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
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
        message: error,
        type: 'error',
        duration: 5000
      });
    }
  }, [error, showNotification]);

  const totalPaper = wasteRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
  const totalPlastic = wasteRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
  const totalMetal = wasteRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
  const grandTotal = totalPaper + totalPlastic + totalMetal;
  
  const averagePerDay = wasteRecords.length > 0 ? grandTotal / wasteRecords.length : 0;
  const averagePaper = wasteRecords.length > 0 ? totalPaper / wasteRecords.length : 0;
  const averagePlastic = wasteRecords.length > 0 ? totalPlastic / wasteRecords.length : 0;
  const averageMetal = wasteRecords.length > 0 ? totalMetal / wasteRecords.length : 0;

  const sortedRecords = [...wasteRecords]
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc' 
          ? b.date.localeCompare(a.date) 
          : a.date.localeCompare(b.date);
      }
      if (sortField === 'paper') {
        return sortDirection === 'desc' ? (b.paper || 0) - (a.paper || 0) : (a.paper || 0) - (b.paper || 0);
      }
      if (sortField === 'plastic') {
        return sortDirection === 'desc' ? (b.plastic || 0) - (a.plastic || 0) : (a.plastic || 0) - (b.plastic || 0);
      }
      if (sortField === 'metal') {
        return sortDirection === 'desc' ? (b.metal || 0) - (a.metal || 0) : (a.metal || 0) - (b.metal || 0);
      }
      if (sortField === 'total') {
        const totalA = (a.paper || 0) + (a.plastic || 0) + (a.metal || 0);
        const totalB = (b.paper || 0) + (b.plastic || 0) + (b.metal || 0);
        return sortDirection === 'desc' ? totalB - totalA : totalA - totalB;
      }
      return 0;
    })
    .filter(record => {
      if (filterType === 'all') return true;
      if (filterType === 'paper') return (record.paper || 0) > 0;
      if (filterType === 'plastic') return (record.plastic || 0) > 0;
      if (filterType === 'metal') return (record.metal || 0) > 0;
      return true;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openAddModal = () => {
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    setEditingRecord(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      paper: '',
      plastic: '',
      metal: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: any) => {
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    setEditingRecord(record);
    setFormData({
      date: record.date,
      paper: (record.paper || 0).toString(),
      plastic: (record.plastic || 0).toString(),
      metal: (record.metal || 0).toString(),
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedReports([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    
    inputTimeoutRef.current = setTimeout(() => {
      setFormData(prev => ({ ...prev, [name]: value }));
    }, 100);
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.paper || !formData.plastic || !formData.metal) {
      showNotification({
        message: 'Please fill all required fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const paper = parseFloat(formData.paper) || 0;
    const plastic = parseFloat(formData.plastic) || 0;
    const metal = parseFloat(formData.metal) || 0;
    
    const notes = formData.notes?.trim() || null;
    const total = paper + plastic + metal;

    try {
      const existingRecord = wasteRecords.find(r => r.date === formData.date);
      
      if (existingRecord && !editingRecord) {
        confirm({
          title: 'Date Already Exists',
          message: `A record for ${formData.date} already exists. Do you want to update it instead?`,
          confirmText: 'Update Existing',
          cancelText: 'Cancel',
          type: 'warning',
          onConfirm: async () => {
            try {
              await updateWasteRecord(existingRecord.id, {
                date: formData.date,
                paper,
                plastic,
                metal,
                notes
              });
              
              const type = getRecordType(paper, plastic, metal);
              window.dispatchEvent(new CustomEvent('record-updated', {
                detail: {
                  date: formData.date,
                  type: type,
                  weight: total
                }
              }));
              
              showNotification({
                message: 'Record updated successfully!',
                type: 'success',
                duration: 3000
              });
              closeModal();
            } catch (err: any) {
              showNotification({
                message: err.message || 'Error updating record',
                type: 'error',
                duration: 3000
              });
            }
          }
        });
        return;
      }

      if (editingRecord) {
        await updateWasteRecord(editingRecord.id, {
          date: formData.date,
          paper,
          plastic,
          metal,
          notes
        });
        
        const type = getRecordType(paper, plastic, metal);
        window.dispatchEvent(new CustomEvent('record-updated', {
          detail: {
            date: formData.date,
            type: type,
            weight: total
          }
        }));
        
        showNotification({
          message: 'Record updated successfully!',
          type: 'success',
          duration: 3000
        });
      } else {
        await addWasteRecord({
          date: formData.date,
          paper,
          plastic,
          metal,
          notes
        });
        
        const type = getRecordType(paper, plastic, metal);
        window.dispatchEvent(new CustomEvent('record-added', {
          detail: {
            date: formData.date,
            type: type,
            weight: total
          }
        }));
        
        showNotification({
          message: 'Record added successfully!',
          type: 'success',
          duration: 3000
        });
      }
      closeModal();
    } catch (err: any) {
      console.error('Submit error:', err);
      
      if (err.message?.includes('already exists')) {
        showNotification({
          message: err.message,
          type: 'warning',
          duration: 5000
        });
      } else {
        showNotification({
          message: err.message || 'Error saving record',
          type: 'error',
          duration: 3000
        });
      }
    }
  };

  const handleDelete = (id: number) => {
    if (!id || typeof id !== 'number') {
      showNotification({
        message: 'Invalid record ID',
        type: 'error',
        duration: 3000
      });
      return;
    }

    const recordToDelete = wasteRecords.find(r => r.id === id);
    if (!recordToDelete) return;

    confirm({
      title: 'Delete Record',
      message: 'Are you sure you want to delete this recycling record?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          const recordDate = new Date(recordToDelete.date);
          const weekStart = new Date(recordDate);
          weekStart.setDate(recordDate.getDate() - recordDate.getDay());
          const weekEnd = new Date(recordDate);
          weekEnd.setDate(recordDate.getDate() + (6 - recordDate.getDay()));

          const archivedReport: ArchivedReport = {
            id: Date.now().toString() + '-' + id,
            date: new Date().toISOString(),
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            totalPaper: recordToDelete.paper || 0,
            totalPlastic: recordToDelete.plastic || 0,
            totalMetal: recordToDelete.metal || 0,
            grandTotal: (recordToDelete.paper || 0) + (recordToDelete.plastic || 0) + (recordToDelete.metal || 0),
            recordCount: 1,
            records: [recordToDelete]
          };

          setArchivedReports(prev => {
            const updated = [archivedReport, ...prev];
            localStorage.setItem(ARCHIVED_DATA_KEY, JSON.stringify(updated));
            return updated;
          });

          await deleteWasteRecord(id);

          showNotification({
            message: 'Record moved to history',
            type: 'success',
            duration: 3000
          });
        } catch (err: any) {
          console.error('Move to history error:', err);
          showNotification({
            message: err.message || 'Error moving record to history',
            type: 'error',
            duration: 3000
          });
        }
      }
    });
  };

  const toggleReportSelection = (id: string) => {
    setSelectedReports(prev => 
      prev.includes(id) 
        ? prev.filter(reportId => reportId !== id)
        : [...prev, id]
    );
  };

  const selectAllReports = () => {
    if (selectedReports.length === archivedReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(archivedReports.map(r => r.id));
    }
  };

  const handleBulkRestore = async () => {
    if (selectedReports.length === 0) {
      showNotification({
        message: 'Please select reports to restore',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const reportsToRestore = archivedReports.filter(r => selectedReports.includes(r.id));
    await restoreWithDuplicateCheck(reportsToRestore);
  };

  const handleBulkDelete = async () => {
    if (selectedReports.length === 0) {
      showNotification({
        message: 'Please select reports to delete',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    confirm({
      title: 'Permanently Delete Reports',
      message: `Are you sure you want to permanently delete ${selectedReports.length} selected report(s)? This action cannot be undone.`,
      confirmText: 'Permanently Delete',
      cancelText: 'Cancel',
      type: 'error',
      onConfirm: async () => {
        setIsDeleting(true);
        
        try {
          setArchivedReports(prev => {
            const updated = prev.filter(r => !selectedReports.includes(r.id));
            localStorage.setItem(ARCHIVED_DATA_KEY, JSON.stringify(updated));
            return updated;
          });
          
          setSelectedReports([]);

          showNotification({
            message: `Successfully deleted ${selectedReports.length} report(s)`,
            type: 'warning',
            duration: 3000
          });
        } catch (err: any) {
          console.error('Bulk delete error:', err);
          showNotification({
            message: err.message || 'Error deleting data',
            type: 'error',
            duration: 3000
          });
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Paper (kg)', 'Plastic (kg)', 'Metal (kg)', 'Total (kg)', 'Notes'];
    const csvData = sortedRecords.map(r => [
      r.date,
      (r.paper || 0).toFixed(1),
      (r.plastic || 0).toFixed(1),
      (r.metal || 0).toFixed(1),
      ((r.paper || 0) + (r.plastic || 0) + (r.metal || 0)).toFixed(1),
      r.notes || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recycling-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const MobileView = () => (
    <div className="w-full px-2 py-3 animate-fade-in">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          {showLiveIndicator && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse text-[10px]">
              <Zap size={10} />
              <span>Live</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600">Track and analyze recycling performance</p>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center justify-center gap-1 animate-bounce-in"
          >
            <Plus size={14} className="animate-rotate-in" />
            Add
          </button>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 flex items-center justify-center gap-1"
          >
            <History size={14} />
            History
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-2 rounded-lg flex items-center gap-2 mb-3">
          <AlertCircle size={12} className="text-red-500" />
          <p className="text-[10px] text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-blue-500">
          <div className="flex items-center gap-1 text-blue-600 mb-1">
            <FileText size={12} />
            <span className="text-[10px] font-medium">Paper</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalPaper.toFixed(1)} kg</p>
          <p className="text-[8px] text-gray-500">Avg {averagePaper.toFixed(1)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-yellow-500">
          <div className="flex items-center gap-1 text-yellow-600 mb-1">
            <Package size={12} />
            <span className="text-[10px] font-medium">Plastic</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalPlastic.toFixed(1)} kg</p>
          <p className="text-[8px] text-gray-500">Avg {averagePlastic.toFixed(1)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-purple-500">
          <div className="flex items-center gap-1 text-purple-600 mb-1">
            <Recycle size={12} />
            <span className="text-[10px] font-medium">Metal</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalMetal.toFixed(1)} kg</p>
          <p className="text-[8px] text-gray-500">Avg {averageMetal.toFixed(1)}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-green-500">
          <div className="flex items-center gap-1 text-green-600 mb-1">
            <TrendingUp size={12} />
            <span className="text-[10px] font-medium">Total</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{grandTotal.toFixed(1)} kg</p>
          <p className="text-[8px] text-gray-500">All</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <h3 className="text-sm font-semibold mb-2">Recent Records</h3>
        {sortedRecords.length > 0 ? (
          sortedRecords.slice(0, 5).map((row) => {
            const total = (row.paper || 0) + (row.plastic || 0) + (row.metal || 0);
            return (
              <div key={row.id} className="bg-white rounded-lg shadow-sm p-3 border-l-2 border-teal-500">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-gray-900">{row.date}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-blue-600">
                      <Edit size={12} />
                    </button>
                    <button onClick={() => handleDelete(row.id)} className="text-red-600">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <div>
                    <span className="text-gray-500">Paper</span>
                    <p className="font-medium text-blue-600">{(row.paper || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Plastic</span>
                    <p className="font-medium text-yellow-600">{(row.plastic || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Metal</span>
                    <p className="font-medium text-purple-600">{(row.metal || 0).toFixed(1)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Total</span>
                    <p className="font-medium text-gray-900">{total.toFixed(1)}</p>
                  </div>
                </div>
                {row.notes && (
                  <p className="text-[8px] text-gray-500 mt-2 truncate">{row.notes}</p>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-gray-500 py-4 text-xs">No records found</p>
        )}
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Breakdown</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span>Paper</span>
              <span className="font-medium text-blue-600">{((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${(totalPaper / grandTotal) * 100 || 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span>Plastic</span>
              <span className="font-medium text-yellow-600">{((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div className="bg-yellow-600 h-1 rounded-full" style={{ width: `${(totalPlastic / grandTotal) * 100 || 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span>Metal</span>
              <span className="font-medium text-purple-600">{((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1 rounded-full">
              <div className="bg-purple-600 h-1 rounded-full" style={{ width: `${(totalMetal / grandTotal) * 100 || 0}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const DesktopView = () => (
    <div className="w-full px-2 sm:px-3 md:px-4 lg:px-5 xl:px-6 py-3 sm:py-4 md:py-5 lg:py-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-5 md:mb-6">
        <div>
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            {showLiveIndicator && (
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse text-xs">
                <Zap size={12} />
                <span>Live</span>
              </div>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Track and analyze recycling performance</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-purple-300 text-purple-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-purple-50 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <History size={16} />
            <span>History</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-50 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-md animate-bounce-in"
          >
            <Plus size={16} className="animate-rotate-in" />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded-lg flex items-center gap-2 mb-4">
        <Clock size={16} className="text-purple-600 flex-shrink-0" />
        <p className="text-xs text-purple-700">
          Click the trash icon on any record to move it to history. {archivedReports.length} archived {archivedReports.length === 1 ? 'report' : 'reports'} available in history.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg flex items-center gap-2 mb-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          <span>{wasteRecords.length} records</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-blue-500 hover:shadow-md transition-all group">
          <div className="flex items-center gap-1 text-blue-600 mb-1">
            <FileText size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Paper</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalPaper.toFixed(1)} kg</p>
          <p className="text-[10px] text-gray-500">Avg: {averagePaper.toFixed(1)} kg</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-yellow-500 hover:shadow-md transition-all group">
          <div className="flex items-center gap-1 text-yellow-600 mb-1">
            <Package size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Plastic</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalPlastic.toFixed(1)} kg</p>
          <p className="text-[10px] text-gray-500">Avg: {averagePlastic.toFixed(1)} kg</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-purple-500 hover:shadow-md transition-all group">
          <div className="flex items-center gap-1 text-purple-600 mb-1">
            <Recycle size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Metal</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{totalMetal.toFixed(1)} kg</p>
          <p className="text-[10px] text-gray-500">Avg: {averageMetal.toFixed(1)} kg</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-green-500 hover:shadow-md transition-all group">
          <div className="flex items-center gap-1 text-green-600 mb-1">
            <TrendingUp size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{grandTotal.toFixed(1)} kg</p>
          <p className="text-[10px] text-gray-500">All</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-2 border-l-2 border-teal-500 hover:shadow-md transition-all group col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1 text-teal-600 mb-1">
            <BarChart3 size={14} className="group-hover:scale-110 transition-transform" />
            <span className="text-xs font-medium">Daily Avg</span>
          </div>
          <p className="text-sm font-bold text-gray-900">{averagePerDay.toFixed(1)} kg</p>
          <p className="text-[10px] text-gray-500">{wasteRecords.length} days</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-teal-600" />
            <h3 className="text-sm font-semibold">Daily Records</h3>
          </div>
          <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-1 rounded-full">
            {sortedRecords.length} records
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1">Date <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('paper')}>
                      <div className="flex items-center gap-1">Paper <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('plastic')}>
                      <div className="flex items-center gap-1">Plastic <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('metal')}>
                      <div className="flex items-center gap-1">Metal <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="hidden sm:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('total')}>
                      <div className="flex items-center gap-1">Total <ArrowUpDown size={10} /></div>
                    </th>
                    <th className="hidden md:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedRecords.slice(0, 10).map((row) => {
                    const total = (row.paper || 0) + (row.plastic || 0) + (row.metal || 0);
                    return (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-2 py-2 text-xs whitespace-nowrap">{row.date}</td>
                        <td className="px-2 py-2 text-xs text-blue-600 font-medium">{(row.paper || 0).toFixed(1)}</td>
                        <td className="px-2 py-2 text-xs text-yellow-600 font-medium">{(row.plastic || 0).toFixed(1)}</td>
                        <td className="px-2 py-2 text-xs text-purple-600 font-medium">{(row.metal || 0).toFixed(1)}</td>
                        <td className="hidden sm:table-cell px-2 py-2 text-xs font-medium">{total.toFixed(1)}</td>
                        <td className="hidden md:table-cell px-2 py-2 text-xs text-gray-500 max-w-[100px] truncate">
                          {row.notes || '-'}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800 p-0.5">
                              <Edit size={12} />
                            </button>
                            <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 p-0.5">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {sortedRecords.length > 10 && (
          <p className="text-[10px] text-gray-400 mt-2 text-center">+{sortedRecords.length - 10} more records</p>
        )}
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Material Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Paper</span>
              <span className="text-xs font-bold text-blue-600">{((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${(totalPaper / grandTotal) * 100 || 0}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{totalPaper.toFixed(1)} kg</p>
          </div>
          
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Plastic</span>
              <span className="text-xs font-bold text-yellow-600">{((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full">
              <div className="bg-yellow-600 h-1.5 rounded-full" style={{ width: `${(totalPlastic / grandTotal) * 100 || 0}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{totalPlastic.toFixed(1)} kg</p>
          </div>
          
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">Metal</span>
              <span className="text-xs font-bold text-purple-600">{((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 h-1.5 rounded-full">
              <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${(totalMetal / grandTotal) * 100 || 0}%` }} />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{totalMetal.toFixed(1)} kg</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedLayout activeMenu="reports">
      <div className="w-full overflow-x-hidden">
        {isMobile ? <MobileView /> : <DesktopView />}
      </div>

     <RecordModal
  isOpen={isModalOpen}
  onClose={closeModal}
  onSave={async (data) => {
    // Set the form data from modal
    setFormData(data);
    
    // Then call your existing submit logic
    if (!data.date || !data.paper || !data.plastic || !data.metal) {
      showNotification({
        message: 'Please fill all required fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const paper = parseFloat(data.paper) || 0;
    const plastic = parseFloat(data.plastic) || 0;
    const metal = parseFloat(data.metal) || 0;
    const notes = data.notes?.trim() || null;

    try {
      const existingRecord = wasteRecords.find(r => r.date === data.date);
      
      if (existingRecord && !editingRecord) {
        confirm({
          title: 'Date Already Exists',
          message: `A record for ${data.date} already exists. Do you want to update it instead?`,
          confirmText: 'Update Existing',
          cancelText: 'Cancel',
          type: 'warning',
          onConfirm: async () => {
            await updateWasteRecord(existingRecord.id, {
              date: data.date,
              paper,
              plastic,
              metal,
              notes
            });
            showNotification({
              message: 'Record updated successfully!',
              type: 'success',
              duration: 3000
            });
            closeModal();
          }
        });
        return;
      }

      if (editingRecord) {
        await updateWasteRecord(editingRecord.id, {
          date: data.date,
          paper,
          plastic,
          metal,
          notes
        });
        showNotification({
          message: 'Record updated successfully!',
          type: 'success',
          duration: 3000
        });
      } else {
        await addWasteRecord({
          date: data.date,
          paper,
          plastic,
          metal,
          notes
        });
        showNotification({
          message: 'Record added successfully!',
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
  }}
  editingRecord={editingRecord}
  initialData={formData}
/>

      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <History size={20} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Archive History</h2>
              </div>
              <button onClick={closeHistoryModal} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={20} />
              </button>
            </div>

            {archivedReports.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg flex items-center justify-between border flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={selectAllReports}
                    className="flex items-center gap-2 text-xs text-gray-700 hover:text-gray-900"
                  >
                    {selectedReports.length === archivedReports.length ? (
                      <CheckSquare size={16} className="text-purple-600" />
                    ) : (
                      <Square size={16} className="text-gray-400" />
                    )}
                    <span>Select All ({archivedReports.length})</span>
                  </button>
                  <span className="text-xs text-gray-500">
                    {selectedReports.length} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkRestore}
                    disabled={selectedReports.length === 0 || isRestoring || isDeleting}
                    className="px-2 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isRestoring ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                    Restore
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedReports.length === 0 || isRestoring || isDeleting}
                    className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isDeleting ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-3">
              {archivedReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <History size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No archived reports yet</p>
                  <p className="text-sm mt-2">Click the trash icon on any record to move it to history</p>
                </div>
              ) : (
                archivedReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-2 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleReportSelection(report.id)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {selectedReports.includes(report.id) ? (
                          <CheckSquare size={14} className="text-purple-600" />
                        ) : (
                          <Square size={14} className="text-gray-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <div className="truncate">
                            <h3 className="text-xs font-semibold text-gray-900 truncate">
                              {report.records.map(r => r.date).join(', ')}
                            </h3>
                            <p className="text-[8px] text-gray-400">
                              {new Date(report.date).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap ml-1">
                            {report.recordCount}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {report.records.map((record: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded p-1.5">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-[9px] font-medium">{record.date}</span>
                                {record.notes && (
                                  <span className="text-[6px] text-gray-400 truncate max-w-[80px]">📝</span>
                                )}
                              </div>
                              <div className="grid grid-cols-4 gap-0.5 text-[8px]">
                                <div>
                                  <span className="text-gray-400">P</span>
                                  <p className="font-medium text-blue-600">{record.paper?.toFixed(1) || '0'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">Pl</span>
                                  <p className="font-medium text-yellow-600">{record.plastic?.toFixed(1) || '0'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">M</span>
                                  <p className="font-medium text-purple-600">{record.metal?.toFixed(1) || '0'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-400">T</span>
                                  <p className="font-medium">{(record.paper || 0) + (record.plastic || 0) + (record.metal || 0)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}