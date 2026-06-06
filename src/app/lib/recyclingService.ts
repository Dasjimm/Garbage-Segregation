// app/lib/recyclingService.ts
import { supabase } from './supabase';

export interface WasteRecord {
  id: number;
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  total: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

export interface DailyRecyclingInput {
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  notes?: string;
}

export const recyclingService = {
  // Get all records
  async getAllRecords(): Promise<WasteRecord[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('waste_records')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw new Error(error.message);
      return data || [];
    } catch (error) {
      console.error('Error in getAllRecords:', error);
      return [];
    }
  },

  // Get record by date
  async getRecordByDate(date: string): Promise<WasteRecord | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('waste_records')
        .select('*')
        .eq('date', date)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      console.error('Error in getRecordByDate:', error);
      return null;
    }
  },

  // Insert new record
  async insertRecord(record: DailyRecyclingInput): Promise<WasteRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const total = record.paper + record.plastic + record.metal;

    const { data, error } = await supabase
      .from('waste_records')
      .insert([{
        date: record.date,
        paper: record.paper,
        plastic: record.plastic,
        metal: record.metal,
        total: total,
        notes: record.notes || null,
        user_id: user.id
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Add record (alias for insertRecord)
  async addRecord(record: DailyRecyclingInput): Promise<WasteRecord> {
    return this.insertRecord(record);
  },

  // Update record
  async updateRecord(id: number, updates: Partial<DailyRecyclingInput>): Promise<WasteRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get current record to calculate total
    const { data: current, error: fetchError } = await supabase
      .from('waste_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw new Error(fetchError.message);

    const paper = updates.paper !== undefined ? updates.paper : current.paper;
    const plastic = updates.plastic !== undefined ? updates.plastic : current.plastic;
    const metal = updates.metal !== undefined ? updates.metal : current.metal;
    const total = paper + plastic + metal;

    const { data, error } = await supabase
      .from('waste_records')
      .update({
        ...updates,
        total: total,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Delete record
  async deleteRecord(id: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('waste_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  },

  // Upsert record (insert or update)
  async upsertRecord(record: DailyRecyclingInput): Promise<WasteRecord> {
    const existing = await this.getRecordByDate(record.date);
    if (existing) {
      return this.updateRecord(existing.id, record);
    } else {
      return this.insertRecord(record);
    }
  },

  // Get today's record
  async getTodayRecord(): Promise<WasteRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    return this.getRecordByDate(today);
  },

  // Get summary statistics
  async getSummaryStats(days: number = 7): Promise<{
    totalPaper: number;
    totalPlastic: number;
    totalMetal: number;
    grandTotal: number;
    recordCount: number;
    averagePerDay: number;
  }> {
    const records = await this.getAllRecords();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    const filtered = records.filter(r => r.date >= cutoffStr);
    
    const totalPaper = filtered.reduce((sum, r) => sum + (r.paper || 0), 0);
    const totalPlastic = filtered.reduce((sum, r) => sum + (r.plastic || 0), 0);
    const totalMetal = filtered.reduce((sum, r) => sum + (r.metal || 0), 0);
    const grandTotal = totalPaper + totalPlastic + totalMetal;
    
    return {
      totalPaper,
      totalPlastic,
      totalMetal,
      grandTotal,
      recordCount: filtered.length,
      averagePerDay: filtered.length > 0 ? grandTotal / filtered.length : 0
    };
  },

  // Subscribe to real-time changes
  subscribeToChanges(callback: (payload: any) => void) {
    let userId: string | null = null;
    
    // First, get the current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userId = user.id;
      }
    });
    
    const channel = supabase
      .channel('waste_records_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waste_records',
        },
        async (payload) => {
          // Only process events for the current user
          const { data: { user } } = await supabase.auth.getUser();
          if (user && (!userId || userId === user.id)) {
            userId = user.id;
            
            // Transform payload to match expected format
            const transformedPayload = {
              eventType: payload.eventType.toUpperCase(),
              new: payload.new,
              old: payload.old
            };
            callback(transformedPayload);
          }
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
};