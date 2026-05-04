import { supabase } from './supabase';

export interface WasteRecord {
  id: number;
  date: string;
  paper: number;
  plastic: number;
  metal: number;
  total: number;
  notes?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export const recyclingService = {
  async getAllRecords() {
    const { data, error } = await supabase
      .from('daily_recycling')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data as WasteRecord[];
  },

  async getRecordById(id: number) {
    const { data, error } = await supabase
      .from('daily_recycling')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as WasteRecord;
  },

  async getRecordByDate(date: string) {
    const { data, error } = await supabase
      .from('daily_recycling')
      .select('*')
      .eq('date', date)
      .maybeSingle();

    if (error) throw error;
    return data as WasteRecord | null;
  },

  async addRecord(record: Omit<WasteRecord, 'id' | 'total' | 'created_at' | 'updated_at'>) {
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
      .select()
      .single();

    if (error) throw error;
    return data as WasteRecord;
  },

  async updateRecord(id: number, record: Partial<WasteRecord>) {
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
      .select()
      .single();

    if (error) throw error;
    return data as WasteRecord;
  },

  async deleteRecord(id: number) {
    const { data: existing } = await supabase
      .from('daily_recycling')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (!existing) {
      throw new Error('Record not found');
    }

    const { error } = await supabase
      .from('daily_recycling')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getRecordsByDateRange(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('daily_recycling')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return data as WasteRecord[];
  },

  async getStatistics() {
    const { data, error } = await supabase
      .from('daily_recycling')
      .select('*');

    if (error) throw error;

    const records = data as WasteRecord[];
    const totalPaper = records.reduce((sum, r) => sum + (r.paper || 0), 0);
    const totalPlastic = records.reduce((sum, r) => sum + (r.plastic || 0), 0);
    const totalMetal = records.reduce((sum, r) => sum + (r.metal || 0), 0);
    const grandTotal = totalPaper + totalPlastic + totalMetal;

    return {
      totalPaper,
      totalPlastic,
      totalMetal,
      grandTotal,
      recordCount: records.length,
      averagePerDay: records.length > 0 ? grandTotal / records.length : 0
    };
  }
};