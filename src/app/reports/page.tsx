'use client';

import { RecordModal } from '@/app/components/RecordModal';
import { useState, useEffect, useRef, useMemo } from 'react';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import { supabase } from '@/app/lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  AlertTriangle,
  PieChart,
  LineChart,
  Activity
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
  const [isExporting, setIsExporting] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    paper: '',
    plastic: '',
    metal: '',
    notes: ''
  });
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastActiveTime, setLastActiveTime] = useState(Date.now());

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

  // ========== TAB VISIBILITY FIX ==========
  useEffect(() => {
    let refreshTimeout: NodeJS.Timeout;
    
    const handleVisibilityChange = async () => {
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveTime;
      
      console.log(`Tab visibility changed. Time since last active: ${timeSinceLastActive}ms`);
      
      if (document.visibilityState === 'visible') {
        if (timeSinceLastActive > 2 * 60 * 1000) {
          console.log('Tab was inactive for >2 minutes, forcing page reload...');
          window.location.reload();
          return;
        }
        
        setShowLiveIndicator(true);
        
        if (refreshTimeout) clearTimeout(refreshTimeout);
        
        refreshTimeout = setTimeout(() => {
          setShowLiveIndicator(false);
        }, 2000);
        
        setLastActiveTime(now);
      } else {
        setLastActiveTime(now);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (refreshTimeout) clearTimeout(refreshTimeout);
    };
  }, [lastActiveTime]);

  useEffect(() => {
    const recoverSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('Session expired, attempting to refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log('Session refresh failed, user may need to login again');
        } else {
          console.log('Session refreshed successfully');
        }
      }
    };
    
    recoverSession();
    
    const interval = setInterval(() => {
      recoverSession();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        setLastActiveTime(Date.now());
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  // ========================================

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

  // Function to filter records based on report type and date range
  const getFilteredRecordsForExport = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let endDate: Date = today;
    
    switch (reportType) {
      case 'daily':
        // Daily: Show today's records
        startDate = today;
        break;
      case 'weekly':
        // Weekly: Show last 7 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'monthly':
        // Monthly: Show last 30 days
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    }
    
    return sortedRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

  // Get records based on selected date range
  const getFilteredRecordsByDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let startDate: Date;
    let endDate: Date = today;
    
    switch (dateRange) {
      case 'today':
        startDate = today;
        break;
      case 'last7days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      case 'last90days':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 90);
        break;
      default:
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
    }
    
    return sortedRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= endDate;
    });
  };

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

  // Professional PDF Export with Daily, Weekly, Monthly filtering
  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      // Get filtered records based on report type
      let filteredRecords: any[] = [];
      let periodLabel = '';
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      switch (reportType) {
        case 'daily':
          filteredRecords = sortedRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.toDateString() === today.toDateString();
          });
          periodLabel = 'Daily Report';
          break;
        case 'weekly':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - 7);
          filteredRecords = sortedRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= weekStart && recordDate <= today;
          });
          periodLabel = 'Weekly Report (Last 7 Days)';
          break;
        case 'monthly':
          const monthStart = new Date(today);
          monthStart.setDate(today.getDate() - 30);
          filteredRecords = sortedRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= monthStart && recordDate <= today;
          });
          periodLabel = 'Monthly Report (Last 30 Days)';
          break;
        default:
          filteredRecords = sortedRecords;
          periodLabel = 'All Records Report';
      }
      
      // Sort filtered records by date (newest first)
      filteredRecords = [...filteredRecords].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Calculate totals for filtered records
      const filteredTotalPaper = filteredRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
      const filteredTotalPlastic = filteredRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
      const filteredTotalMetal = filteredRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
      const filteredGrandTotal = filteredTotalPaper + filteredTotalPlastic + filteredTotalMetal;
      
      const filteredPaperPercentage = ((filteredTotalPaper / filteredGrandTotal) * 100 || 0).toFixed(1);
      const filteredPlasticPercentage = ((filteredTotalPlastic / filteredGrandTotal) * 100 || 0).toFixed(1);
      const filteredMetalPercentage = ((filteredTotalMetal / filteredGrandTotal) * 100 || 0).toFixed(1);
      
      const filteredAvgPerDay = filteredRecords.length > 0 ? filteredGrandTotal / filteredRecords.length : 0;
      
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.fontFamily = "'Segoe UI', 'Inter', Arial, sans-serif";
      element.style.backgroundColor = 'white';
      element.style.maxWidth = '1200px';
      element.style.margin = '0 auto';
      
      // Load logo as base64 for PDF
      let logoBase64 = '';
      try {
        const response = await fetch('/wastelogo.png');
        if (response.ok) {
          const blob = await response.blob();
          logoBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.warn('Could not load logo:', err);
      }
      
      element.innerHTML = `
        <div style="margin-bottom: 30px;">
          <!-- Header with Logo -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 60px; height: 60px; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: #1a5c3e; display: flex; align-items: center; justify-content: center;">
                ${logoBase64 ? `<img src="${logoBase64}" style="width: 100%; height: 100%; object-fit: cover;" />` : `
                  <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="14" fill="#1a5c3e"/>
                    <text x="50" y="28" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial, sans-serif">EW</text>
                    <text x="50" y="42" text-anchor="middle" fill="#4ade80" font-size="8" font-family="Arial, sans-serif">ECO</text>
                    <text x="50" y="53" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="Arial, sans-serif">WASTE</text>
                  </svg>
                `}
              </div>
              <div>
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">EcoWaste</h1>
                <p style="color: #0d9488; font-size: 12px; margin: 2px 0 0 0; font-weight: 500;">Recycling Management System</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="color: #64748b; font-size: 11px; margin: 0;">${periodLabel.toUpperCase()}</p>
              <p style="color: #94a3b8; font-size: 10px; margin: 4px 0 0 0;">Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <!-- Report Title -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">${periodLabel}</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">${filteredRecords.length} records found | Total: ${filteredGrandTotal.toFixed(1)} kg</p>
          </div>
          
          <!-- Key Metrics Dashboard -->
          <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📊 Key Performance Indicators</h3>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 6px;">📄</div>
                <div style="font-size: 11px; color: #1e40af; font-weight: 600;">Paper Total</div>
                <div style="font-size: 20px; font-weight: 800; color: #1e3a8a;">${filteredTotalPaper.toFixed(1)} kg</div>
                <div style="font-size: 10px; color: #3b82f6;">${filteredPaperPercentage}% of total</div>
              </div>
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 6px;">🧴</div>
                <div style="font-size: 11px; color: #92400e; font-weight: 600;">Plastic Total</div>
                <div style="font-size: 20px; font-weight: 800; color: #b45309;">${filteredTotalPlastic.toFixed(1)} kg</div>
                <div style="font-size: 10px; color: #eab308;">${filteredPlasticPercentage}% of total</div>
              </div>
              <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 6px;">🔩</div>
                <div style="font-size: 11px; color: #6b21a5; font-weight: 600;">Metal Total</div>
                <div style="font-size: 20px; font-weight: 800; color: #7e22ce;">${filteredTotalMetal.toFixed(1)} kg</div>
                <div style="font-size: 10px; color: #a855f7;">${filteredMetalPercentage}% of total</div>
              </div>
              <div style="background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%); padding: 15px; border-radius: 12px; text-align: center;">
                <div style="font-size: 24px; margin-bottom: 6px;">♻️</div>
                <div style="font-size: 11px; color: #0f766e; font-weight: 600;">Daily Average</div>
                <div style="font-size: 20px; font-weight: 800; color: #0d9488;">${filteredAvgPerDay.toFixed(1)} kg</div>
                <div style="font-size: 10px; color: #14b8a6;">Over ${filteredRecords.length} days</div>
              </div>
            </div>
          </div>
          
          <!-- Material Breakdown Analytics -->
          <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📈 Material Composition Analysis</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
              <div>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                      <th style="padding: 10px; text-align: left;">Material</th>
                      <th style="padding: 10px; text-align: right;">Total (kg)</th>
                      <th style="padding: 10px; text-align: right;">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px;">📄 Paper</td>
                      <td style="padding: 8px; text-align: right;">${filteredTotalPaper.toFixed(1)}</td>
                      <td style="padding: 8px; text-align: right; font-weight: 600; color: #3b82f6;">${filteredPaperPercentage}%</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafafa;">
                      <td style="padding: 8px;">🧴 Plastic</td>
                      <td style="padding: 8px; text-align: right;">${filteredTotalPlastic.toFixed(1)}</td>
                      <td style="padding: 8px; text-align: right; font-weight: 600; color: #eab308;">${filteredPlasticPercentage}%</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 8px;">🔩 Metal</td>
                      <td style="padding: 8px; text-align: right;">${filteredTotalMetal.toFixed(1)}</td>
                      <td style="padding: 8px; text-align: right; font-weight: 600; color: #a855f7;">${filteredMetalPercentage}%</td>
                    </tr>
                    <tr style="background-color: #f0fdf4; border-top: 2px solid #dcfce7;">
                      <td style="padding: 8px; font-weight: 700;">♻️ Total</td>
                      <td style="padding: 8px; text-align: right; font-weight: 700;">${filteredGrandTotal.toFixed(1)} kg</td>
                      <td style="padding: 8px; text-align: right; font-weight: 700;">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>📄 Paper</span>
                    <span style="font-weight: 600;">${filteredPaperPercentage}%</span>
                  </div>
                  <div style="background-color: #e2e8f0; border-radius: 8px; height: 20px; overflow: hidden;">
                    <div style="background-color: #3b82f6; width: ${filteredPaperPercentage}%; height: 20px;"></div>
                  </div>
                </div>
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>🧴 Plastic</span>
                    <span style="font-weight: 600;">${filteredPlasticPercentage}%</span>
                  </div>
                  <div style="background-color: #e2e8f0; border-radius: 8px; height: 20px; overflow: hidden;">
                    <div style="background-color: #eab308; width: ${filteredPlasticPercentage}%; height: 20px;"></div>
                  </div>
                </div>
                <div style="margin-bottom: 15px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                    <span>🔩 Metal</span>
                    <span style="font-weight: 600;">${filteredMetalPercentage}%</span>
                  </div>
                  <div style="background-color: #e2e8f0; border-radius: 8px; height: 20px; overflow: hidden;">
                    <div style="background-color: #a855f7; width: ${filteredMetalPercentage}%; height: 20px;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Detailed Records -->
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📋 Detailed Records (${filteredRecords.length})</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 10px; text-align: left;">Date</th>
                    <th style="padding: 10px; text-align: right;">Paper (kg)</th>
                    <th style="padding: 10px; text-align: right;">Plastic (kg)</th>
                    <th style="padding: 10px; text-align: right;">Metal (kg)</th>
                    <th style="padding: 10px; text-align: right;">Total (kg)</th>
                    <th style="padding: 10px; text-align: left;">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredRecords.map(record => {
                    const total = (record.paper || 0) + (record.plastic || 0) + (record.metal || 0);
                    return `
                      <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px;">${record.date}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 500; color: #3b82f6;">${(record.paper || 0).toFixed(1)}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 500; color: #eab308;">${(record.plastic || 0).toFixed(1)}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 500; color: #a855f7;">${(record.metal || 0).toFixed(1)}</td>
                        <td style="padding: 8px; text-align: right; font-weight: 600;">${total.toFixed(1)}</td>
                        <td style="padding: 8px; color: #64748b;">${record.notes || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              ${filteredRecords.length === 0 ? '<p style="text-align: center; font-size: 12px; color: #64748b; margin-top: 20px;">No records found for the selected period.</p>' : ''}
            </div>
          </div>
          
          <!-- Footer with Copyright and Page Number -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
            <div>© ${new Date().getFullYear()} EcoWaste Recycling Management System. All rights reserved.</div>
            <div style="font-family: monospace;">PAGE 1 OF 1</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(element);
      
      const canvas = await html2canvas(element, {
        scale: 2.5,
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      let pageCount = 1;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageCount++;
      }
      
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`PAGE ${i} OF ${pageCount}`, pdf.internal.pageSize.getWidth() - 30, pdf.internal.pageSize.getHeight() - 10);
        pdf.text(`© ${new Date().getFullYear()} EcoWaste Recycling Management System`, 15, pdf.internal.pageSize.getHeight() - 10);
      }
      
      pdf.save(`EcoWaste_${reportType.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(element);
      
      showNotification({
        message: `${reportType.toUpperCase()} Report exported successfully!`,
        type: 'success',
        duration: 3000
      });
    } catch (error) {
      console.error('PDF export error:', error);
      showNotification({
        message: 'Failed to export PDF. Please try again.',
        type: 'error',
        duration: 3000
      });
    } finally {
      setIsExporting(false);
    }
  };

  const MobileView = () => (
    <div className="w-full px-2 py-3 animate-fade-in">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-end">
          {showLiveIndicator && (
            <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse text-[10px]">
              <Zap size={10} />
              <span>Live</span>
            </div>
          )}
        </div>
        
        {/* Report Type Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setReportType('daily')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              reportType === 'daily'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              reportType === 'weekly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              reportType === 'monthly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Export Report
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center justify-center gap-1"
          >
            <Plus size={14} />
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
        {sortedRecords.slice(0, 5).map((row) => {
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
        })}
        {sortedRecords.length === 0 && (
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
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 sm:mb-5 md:mb-6">
        {/* Report Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              reportType === 'daily'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              reportType === 'weekly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Weekly Report
          </button>
          <button
            onClick={() => setReportType('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              reportType === 'monthly'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly Report
          </button>
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
            onClick={exportToPDF}
            disabled={isExporting}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Export Report</span>
              </>
            )}
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-700 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      {showLiveIndicator && (
        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse text-xs">
            <Zap size={12} />
            <span>Live</span>
          </div>
        </div>
      )}

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
          setFormData(data);
          
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