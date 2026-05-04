'use client';

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { date: string; paper: string; plastic: string; metal: string; notes: string }) => Promise<void>;
  editingRecord: any | null;
  initialData: {
    date: string;
    paper: string;
    plastic: string;
    metal: string;
    notes: string;
  };
}

export function RecordModal({ isOpen, onClose, onSave, editingRecord, initialData }: RecordModalProps) {
  const [localFormData, setLocalFormData] = useState(initialData);

  // Reset local form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setLocalFormData(initialData);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    await onSave(localFormData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-sm max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-bold">
            {editingRecord ? 'Edit Record' : 'Add Record'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={16} />
          </button>
        </div>
        
        <div className="space-y-3">
          <input
            type="date"
            name="date"
            value={localFormData.date}
            onChange={handleInputChange}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="number"
            name="paper"
            value={localFormData.paper}
            onChange={handleInputChange}
            placeholder="Paper (kg)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            step="0.1"
            min="0"
          />
          <input
            type="number"
            name="plastic"
            value={localFormData.plastic}
            onChange={handleInputChange}
            placeholder="Plastic (kg)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            step="0.1"
            min="0"
          />
          <input
            type="number"
            name="metal"
            value={localFormData.metal}
            onChange={handleInputChange}
            placeholder="Metal (kg)"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            step="0.1"
            min="0"
          />
          <textarea
            name="notes"
            value={localFormData.notes}
            onChange={handleInputChange}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 border rounded-lg text-xs">Cancel</button>
          <button onClick={handleSubmit} className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs flex items-center gap-1">
            <Save size={12} />
            {editingRecord ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}