import { supabase } from './supabase';
import { DailyRecycling, DailyRecyclingInput } from '@/app/types/database';

export const recyclingService = {
  async getAllRecords(): Promise<DailyRecycling[]> {
    try {
      const { data, error } = await supabase
        .from('daily_recycling')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getAllRecords:', error);
      throw error;
    }
  },

  async getRecordsByDateRange(startDate: string, endDate: string): Promise<DailyRecycling[]> {
    try {
      const { data, error } = await supabase
        .from('daily_recycling')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getRecordsByDateRange:', error);
      throw error;
    }
  },

  async getRecordByDate(date: string): Promise<DailyRecycling | null> {
    try {
      const { data, error } = await supabase
        .from('daily_recycling')
        .select('*')
        .eq('date', date);
      
      if (error) throw error;
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error in getRecordByDate:', error);
      throw error;
    }
  },

  async getTodayRecord(): Promise<DailyRecycling | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getRecordByDate(today);
  },

  async insertRecord(record: DailyRecyclingInput): Promise<DailyRecycling> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('daily_recycling')
        .insert([{
          date: record.date,
          paper: record.paper,
          plastic: record.plastic,
          metal: record.metal,
          notes: record.notes || null,
          user_id: user?.id
        }])
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No data returned after insert');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in insertRecord:', error);
      throw error;
    }
  },

  async updateRecord(id: number, record: Partial<DailyRecyclingInput>): Promise<DailyRecycling> {
    try {
      const { data, error } = await supabase
        .from('daily_recycling')
        .update({
          date: record.date,
          paper: record.paper,
          plastic: record.plastic,
          metal: record.metal,
          notes: record.notes
        })
        .eq('id', id)
        .select();
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No data returned after update');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in updateRecord:', error);
      throw error;
    }
  },

  async upsertRecord(record: DailyRecyclingInput): Promise<DailyRecycling> {
    try {
      const existing = await this.getRecordByDate(record.date);
      
      if (existing) {
        return await this.updateRecord(existing.id, record);
      } else {
        return await this.insertRecord(record);
      }
    } catch (error) {
      console.error('Error in upsertRecord:', error);
      throw error;
    }
  },

  async deleteRecord(id: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('daily_recycling')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error in deleteRecord:', error);
      throw error;
    }
  },

  async getSummaryStats(days: number = 7): Promise<{
    totalPaper: number;
    totalPlastic: number;
    totalMetal: number;
    grandTotal: number;
    averagePerDay: number;
  }> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      
      const records = await this.getRecordsByDateRange(startDate, endDate);
      
      const totalPaper = records.reduce((sum, r) => sum + r.paper, 0);
      const totalPlastic = records.reduce((sum, r) => sum + r.plastic, 0);
      const totalMetal = records.reduce((sum, r) => sum + r.metal, 0);
      const grandTotal = totalPaper + totalPlastic + totalMetal;
      
      return {
        totalPaper,
        totalPlastic,
        totalMetal,
        grandTotal,
        averagePerDay: records.length > 0 ? grandTotal / records.length : 0
      };
    } catch (error) {
      console.error('Error in getSummaryStats:', error);
      throw error;
    }
  },

  subscribeToChanges(callback: (payload: any) => void) {
    return supabase
      .channel('daily_recycling_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_recycling' },
        (payload) => {
          console.log('Real-time payload received:', payload);
          callback(payload);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });
  }
};