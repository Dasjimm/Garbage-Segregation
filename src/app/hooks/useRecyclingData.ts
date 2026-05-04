'use client';

import { useState, useEffect } from 'react';
import { recyclingService } from '@/app/lib/recyclingService';
import { DailyRecycling, DailyRecyclingInput } from '@/app/types/database';

export function useRecyclingData() {
  const [records, setRecords] = useState<DailyRecycling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());


  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    console.log('Setting up real-time subscription...');
    
    const subscription = recyclingService.subscribeToChanges((payload) => {
      console.log('🔴 Real-time update received:', payload);
      
      try {
        if (payload.eventType === 'INSERT') {
          setRecords(prev => {
            const newRecords = [payload.new, ...prev].sort((a, b) => 
              b.date.localeCompare(a.date)
            );
            return newRecords;
          });
          setLastUpdate(new Date());
        } else if (payload.eventType === 'UPDATE') {
          setRecords(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          setLastUpdate(new Date());
        } else if (payload.eventType === 'DELETE') {
          setRecords(prev => prev.filter(r => r.id !== payload.old.id));
          setLastUpdate(new Date());
        }
      } catch (err) {
        console.error('Error processing real-time update:', err);
      }
    });

    return () => {
      console.log('Cleaning up real-time subscription');
      subscription.unsubscribe();
    };
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await recyclingService.getAllRecords();
      setRecords(data);
    } catch (err: any) {
      console.error('Error fetching records:', err);
      setError(err.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const addRecord = async (record: DailyRecyclingInput) => {
    try {
      setError(null);
      const newRecord = await recyclingService.insertRecord(record);
      return newRecord;
    } catch (err: any) {
      console.error('Error adding record:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateRecord = async (id: number, record: Partial<DailyRecyclingInput>) => {
    try {
      setError(null);
      const updated = await recyclingService.updateRecord(id, record);
      return updated;
    } catch (err: any) {
      console.error('Error updating record:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteRecord = async (id: number) => {
    try {
      setError(null);
      await recyclingService.deleteRecord(id);
    } catch (err: any) {
      console.error('Error deleting record:', err);
      setError(err.message);
      throw err;
    }
  };

  const upsertRecord = async (record: DailyRecyclingInput) => {
    try {
      setError(null);
      const result = await recyclingService.upsertRecord(record);
      return result;
    } catch (err: any) {
      console.error('Error upserting record:', err);
      setError(err.message);
      throw err;
    }
  };

  const getTodayStats = async () => {
    try {
      return await recyclingService.getTodayRecord();
    } catch (err: any) {
      console.error('Error getting today stats:', err);
      return null;
    }
  };

  const getSummary = async (days: number = 7) => {
    try {
      return await recyclingService.getSummaryStats(days);
    } catch (err: any) {
      console.error('Error getting summary:', err);
      return null;
    }
  };

  return {
    records,
    loading,
    error,
    lastUpdate,
    addRecord,
    updateRecord,
    deleteRecord,
    upsertRecord,
    getTodayStats,
    getSummary,
    refreshRecords: fetchRecords
  };
}