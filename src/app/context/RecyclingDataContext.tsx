'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { recyclingService, WasteRecord } from '@/app/lib/supabaseRecycling';
import { useNotification } from './NotificationContext';

interface RecyclingDataContextType {
  wasteRecords: WasteRecord[];
  addWasteRecord: (record: Omit<WasteRecord, 'id' | 'total' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateWasteRecord: (id: number, record: Partial<WasteRecord>) => Promise<void>;
  deleteWasteRecord: (id: number) => Promise<void>;
  getTodayData: (date: string) => WasteRecord | undefined;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

const RecyclingDataContext = createContext<RecyclingDataContextType | undefined>(undefined);

const globalCache = {
  wasteRecords: null as WasteRecord[] | null,
  lastUpdate: null as Date | null
};

export function RecyclingDataProvider({ children }: { children: ReactNode }) {
  const [wasteRecords, setWasteRecords] = useState<WasteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { showNotification } = useNotification();
  const hasInitialized = useRef(false);

  const fetchData = async (showCacheMessage = true) => {
    try {
      setError(null);
      
      if (globalCache.wasteRecords && showCacheMessage) {
        console.log('Using cached data');
        setWasteRecords(globalCache.wasteRecords);
        setLastUpdate(globalCache.lastUpdate);
        setIsLoading(false);
        return;
      }

      console.log('Fetching from Supabase...');
      const data = await recyclingService.getAllRecords();
      
      globalCache.wasteRecords = data;
      globalCache.lastUpdate = new Date();
      
      setWasteRecords(data);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
      showNotification({
        message: `Error loading data: ${err.message}`,
        type: 'error',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchData(false);
    }
  }, []);

  const addWasteRecord = async (record: Omit<WasteRecord, 'id' | 'total' | 'created_at' | 'updated_at'>) => {
    try {
      setError(null);
      
      const existing = await recyclingService.getRecordByDate(record.date);
      if (existing) {
        throw new Error(`A record for ${record.date} already exists`);
      }

      const newRecord = await recyclingService.addRecord(record);
      
      setWasteRecords(prev => {
        const updated = [newRecord, ...prev];
        globalCache.wasteRecords = updated;
        globalCache.lastUpdate = new Date();
        return updated;
      });
      
      setLastUpdate(new Date());
      
      showNotification({
        message: 'Record added successfully!',
        type: 'success',
        duration: 3000
      });
    } catch (err: any) {
      console.error('Error adding record:', err);
      setError(err.message);
      showNotification({
        message: err.message || 'Error adding record',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  };

  const updateWasteRecord = async (id: number, record: Partial<WasteRecord>) => {
    try {
      setError(null);
      
      if (!id || typeof id !== 'number') {
        throw new Error('Invalid record ID');
      }

      const updatedRecord = await recyclingService.updateRecord(id, record);
      
      setWasteRecords(prev => {
        const updated = prev.map(r => r.id === id ? updatedRecord : r);
        globalCache.wasteRecords = updated;
        globalCache.lastUpdate = new Date();
        return updated;
      });
      
      setLastUpdate(new Date());
      
      showNotification({
        message: 'Record updated successfully!',
        type: 'success',
        duration: 3000
      });
    } catch (err: any) {
      console.error('Error updating record:', err);
      setError(err.message);
      showNotification({
        message: err.message || 'Error updating record',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  };

  const deleteWasteRecord = async (id: number) => {
    try {
      setError(null);
      
      if (!id || typeof id !== 'number') {
        throw new Error('Invalid record ID');
      }

      await recyclingService.deleteRecord(id);
      
      setWasteRecords(prev => {
        const updated = prev.filter(r => r.id !== id);
        globalCache.wasteRecords = updated;
        globalCache.lastUpdate = new Date();
        return updated;
      });
      
      setLastUpdate(new Date());
      
      showNotification({
        message: 'Record deleted successfully!',
        type: 'success',
        duration: 3000
      });
    } catch (err: any) {
      console.error('Error deleting record:', err);
      setError(err.message);
      showNotification({
        message: err.message || 'Error deleting record',
        type: 'error',
        duration: 5000
      });
      throw err;
    }
  };

  const getTodayData = (date: string) => {
    return wasteRecords.find(r => r.date === date);
  };

  const refreshData = async () => {
    setIsLoading(true);
    globalCache.wasteRecords = null;
    await fetchData(false);
    setIsLoading(false);
  };

  return (
    <RecyclingDataContext.Provider value={{
      wasteRecords,
      addWasteRecord,
      updateWasteRecord,
      deleteWasteRecord,
      getTodayData,
      refreshData,
      isLoading,
      error,
      lastUpdate,
    }}>
      {children}
    </RecyclingDataContext.Provider>
  );
}

export function useRecyclingData() {
  const context = useContext(RecyclingDataContext);
  if (context === undefined) {
    throw new Error('useRecyclingData must be used within a RecyclingDataProvider');
  }
  return context;
}