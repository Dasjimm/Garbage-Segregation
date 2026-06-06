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

export const recyclingService = {
  // Get all records for the current user
  async getAllRecords(): Promise<WasteRecord[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('waste_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching records:', error);
      throw new Error(error.message);
    }

    return data || [];
  },

  // Get record by date
  async getRecordByDate(date: string): Promise<WasteRecord | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('waste_records')
      .select('*')
      .eq('date', date)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching record by date:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Add new record
  async addRecord(record: {
    date: string;
    paper: number;
    plastic: number;
    metal: number;
    notes?: string;
  }): Promise<WasteRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

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

    if (error) {
      console.error('Error adding record:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Update existing record
  async updateRecord(id: number, updates: {
    date?: string;
    paper?: number;
    plastic?: number;
    metal?: number;
    notes?: string;
  }): Promise<WasteRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Calculate new total if paper, plastic, or metal is updated
    let total = undefined;
    if (updates.paper !== undefined || updates.plastic !== undefined || updates.metal !== undefined) {
      const currentRecord = await this.getRecordById(id);
      const paper = updates.paper !== undefined ? updates.paper : currentRecord.paper;
      const plastic = updates.plastic !== undefined ? updates.plastic : currentRecord.plastic;
      const metal = updates.metal !== undefined ? updates.metal : currentRecord.metal;
      total = paper + plastic + metal;
    }

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

    if (error) {
      console.error('Error updating record:', error);
      throw new Error(error.message);
    }

    return data;
  },

  // Delete record
  async deleteRecord(id: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('waste_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting record:', error);
      throw new Error(error.message);
    }
  },

  // Get single record by ID
  async getRecordById(id: number): Promise<WasteRecord> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('waste_records')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching record:', error);
      throw new Error(error.message);
    }

    return data;
  }
};