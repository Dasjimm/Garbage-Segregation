'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { recyclingService, WasteRecord } from '@/app/lib/supabaseRecycling';
import { useNotification } from './NotificationContext';
import { supabase } from '@/app/lib/supabase';

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
  showLiveIndicator: boolean;
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
  const [showLiveIndicator, setShowLiveIndicator] = useState(false);
  const { showNotification } = useNotification();
  const hasInitialized = useRef(false);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef<boolean>(false);

  const fetchData = async (showCacheMessage = true, silent = false) => {
    try {
      if (!silent) setError(null);
      
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
      if (!silent) {
        showNotification({
          message: `Error loading data: ${err.message}`,
          type: 'error',
          duration: 5000
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const silentRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    refreshTimeoutRef.current = setTimeout(async () => {
      try {
        isRefreshingRef.current = true;
        setShowLiveIndicator(true);
        console.log('Silent refresh triggered...');
        
        const data = await recyclingService.getAllRecords();
        globalCache.wasteRecords = data;
        globalCache.lastUpdate = new Date();
        setWasteRecords(data);
        setLastUpdate(new Date());
        
        setTimeout(() => setShowLiveIndicator(false), 2000);
      } catch (err: any) {
        console.error('Silent refresh failed:', err);
        setShowLiveIndicator(false);
      } finally {
        isRefreshingRef.current = false;
      }
    }, 300);
  }, []);

  // Tab visibility handler
  const handleVisibilityChange = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTimeRef.current;
    
    console.log(`Tab visibility changed. Time since last active: ${timeSinceLastActive}ms`);
    
    if (document.visibilityState === 'visible') {
      if (timeSinceLastActive > 2 * 60 * 1000) {
        console.log('Tab was inactive for >2 minutes, forcing page reload...');
        window.location.reload();
        return;
      }
      
      silentRefresh();
      lastActiveTimeRef.current = now;
    } else {
      lastActiveTimeRef.current = now;
    }
  }, [silentRefresh]);

  // Session recovery function
  const recoverSession = useCallback(async () => {
    try {
      console.log('Attempting to recover session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Session refresh failed:', error.message);
          return false;
        }
        if (data.session) {
          console.log('Session recovered successfully');
          return true;
        }
      }
      return !!session;
    } catch (error) {
      console.error('Session recovery error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      fetchData(false);
    }
  }, []);

  // Tab visibility event listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        lastActiveTimeRef.current = Date.now();
      }
    }, 10000);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [handleVisibilityChange]);

  // Session recovery on page focus
  useEffect(() => {
    const handleFocus = () => {
      console.log('Page focused, checking session...');
      recoverSession().then(hasSession => {
        if (hasSession) {
          silentRefresh();
        }
      });
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [recoverSession, silentRefresh]);

  // Periodic session check (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.log('Session expired, attempting to refresh...');
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.log('Session refresh failed');
        } else {
          console.log('Session refreshed successfully');
        }
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
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
      setShowLiveIndicator(true);
      setTimeout(() => setShowLiveIndicator(false), 2000);
      
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
      setShowLiveIndicator(true);
      setTimeout(() => setShowLiveIndicator(false), 2000);
      
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
      setShowLiveIndicator(true);
      setTimeout(() => setShowLiveIndicator(false), 2000);
      
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
    setShowLiveIndicator(true);
    setTimeout(() => setShowLiveIndicator(false), 2000);
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
      showLiveIndicator,
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