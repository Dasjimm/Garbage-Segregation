'use client';

import { useState, useEffect, useRef } from 'react';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useRecyclingData } from '@/app/context/RecyclingDataContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  FileText,
  Package,
  Recycle,
  Calendar,
  Clock,
  MapPin,
  Trash2,
  Edit,
  Plus,
  X,
  Download,
  Filter,
  ArrowUpDown,
  BarChart3,
  TrendingUp,
  Printer,
  Leaf
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Image from 'next/image';

interface Disposal {
  id: number;
  type: string;
  item: string;
  date: string;
  time: string;
  weight: string;
  location?: string;
  paper?: number;
  plastic?: number;
  metal?: number;
}

export default function RecyclingSegregationPage() {
  const { wasteRecords, addWasteRecord, updateWasteRecord, deleteWasteRecord, error } = useRecyclingData();
  const { confirm } = useConfirmation();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('overview');
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDisposal, setEditingDisposal] = useState<Disposal | null>(null);
  const [formData, setFormData] = useState({ 
    type: '', 
    item: '', 
    date: '', 
    time: '', 
    weight: '',
    location: ''
  });

  const totalPaper = wasteRecords.reduce((sum, r) => sum + (r.paper || 0), 0);
  const totalPlastic = wasteRecords.reduce((sum, r) => sum + (r.plastic || 0), 0);
  const totalMetal = wasteRecords.reduce((sum, r) => sum + (r.metal || 0), 0);
  const grandTotal = totalPaper + totalPlastic + totalMetal;
  
  const averagePerDay = wasteRecords.length > 0 ? grandTotal / wasteRecords.length : 0;
  const averagePaper = wasteRecords.length > 0 ? totalPaper / wasteRecords.length : 0;
  const averagePlastic = wasteRecords.length > 0 ? totalPlastic / wasteRecords.length : 0;
  const averageMetal = wasteRecords.length > 0 ? totalMetal / wasteRecords.length : 0;

  const disposals: Disposal[] = wasteRecords
    .map(record => {
      let type = 'Mixed';
      if (record.paper > record.plastic && record.paper > record.metal) type = 'Paper';
      else if (record.plastic > record.paper && record.plastic > record.metal) type = 'Plastic';
      else if (record.metal > record.paper && record.metal > record.plastic) type = 'Metal';
      
      return {
        id: record.id,
        type: type,
        item: `Recyclable item - ${record.date}`,
        date: record.date,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        weight: `${(record.paper + record.plastic + record.metal).toFixed(1)} kg`,
        location: 'Zone A',
        paper: record.paper,
        plastic: record.plastic,
        metal: record.metal
      };
    })
    .sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc' 
          ? b.date.localeCompare(a.date) 
          : a.date.localeCompare(b.date);
      }
      if (sortField === 'type') {
        return sortDirection === 'desc' 
          ? b.type.localeCompare(a.type) 
          : a.type.localeCompare(b.type);
      }
      if (sortField === 'weight') {
        const weightA = parseFloat(a.weight) || 0;
        const weightB = parseFloat(b.weight) || 0;
        return sortDirection === 'desc' ? weightB - weightA : weightA - weightB;
      }
      return 0;
    })
    .filter(disposal => {
      if (filterType !== 'all' && disposal.type !== filterType) return false;
      if (searchTerm) {
        return disposal.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
               disposal.location?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });

  const recyclableCategories = [
    { id: 'paper', label: 'Paper', value: `${totalPaper.toFixed(1)} kg`, color: 'blue', icon: FileText },
    { id: 'plastic', label: 'Plastic', value: `${totalPlastic.toFixed(1)} kg`, color: 'yellow', icon: Package },
    { id: 'metal', label: 'Metal', value: `${totalMetal.toFixed(1)} kg`, color: 'purple', icon: Recycle },
  ];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const openAddModal = () => {
    setEditingDisposal(null);
    setFormData({ 
      type: '', 
      item: '', 
      date: new Date().toISOString().split('T')[0], 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      weight: '',
      location: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (disposal: Disposal) => {
    setEditingDisposal(disposal);
    setFormData({
      type: disposal.type,
      item: disposal.item,
      date: disposal.date,
      time: disposal.time,
      weight: disposal.weight.replace(' kg', ''),
      location: disposal.location || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.type || !formData.item || !formData.date || !formData.time || !formData.weight) {
      showNotification({
        message: 'Please fill all required fields before saving',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const weight = parseFloat(formData.weight) || 0;

    try {
      if (editingDisposal) {
        const paper = formData.type === 'Paper' ? weight : 0;
        const plastic = formData.type === 'Plastic' ? weight : 0;
        const metal = formData.type === 'Metal' ? weight : 0;

        await updateWasteRecord(editingDisposal.id, {
          date: formData.date,
          paper,
          plastic,
          metal
        });
        showNotification({
          message: 'Disposal record updated successfully!',
          type: 'success',
          duration: 3000
        });
      } else {
        const paper = formData.type === 'Paper' ? weight : 0;
        const plastic = formData.type === 'Plastic' ? weight : 0;
        const metal = formData.type === 'Metal' ? weight : 0;

        await addWasteRecord({
          date: formData.date,
          paper,
          plastic,
          metal
        });
        showNotification({
          message: 'Disposal record added successfully!',
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
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Delete Disposal Record',
      message: 'Are you sure you want to delete this disposal record? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          await deleteWasteRecord(id);
          showNotification({
            message: 'Disposal record deleted successfully!',
            type: 'success',
            duration: 3000
          });
        } catch (err: any) {
          showNotification({
            message: err.message || 'Error deleting record',
            type: 'error',
            duration: 3000
          });
        }
      }
    });
  };

  // Professional PDF Export with Your WebApp Logo - COMPLETE VERSION
  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      const element = document.createElement('div');
      element.style.padding = '30px';
      element.style.fontFamily = "'Segoe UI', 'Inter', Arial, sans-serif";
      element.style.backgroundColor = 'white';
      element.style.maxWidth = '1200px';
      element.style.margin = '0 auto';
      
      // Load your webapp logo as base64 for PDF
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
          <!-- Header with Your WebApp Logo -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 25px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 60px; height: 60px; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); background: #1a5c3e; display: flex; align-items: center; justify-content: center;">
                ${logoBase64 ? `<img src="${logoBase64}" style="width: 100%; height: 100%; object-fit: cover;" />` : `
                  <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" rx="14" fill="#1a5c3e"/>
                    <text x="50" y="28" text-anchor="middle" fill="white" font-size="12" font-weight="bold" font-family="Arial, sans-serif">BAN</text>
                    <text x="50" y="42" text-anchor="middle" fill="#4ade80" font-size="8" font-family="Arial, sans-serif">PAPER</text>
                    <text x="50" y="53" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="Arial, sans-serif">PLASTIC</text>
                    <text x="50" y="64" text-anchor="middle" fill="#c084fc" font-size="8" font-family="Arial, sans-serif">METAL</text>
                    <text x="50" y="76" text-anchor="middle" fill="white" font-size="7" font-family="Arial, sans-serif">WASTE</text>
                    <text x="50" y="87" text-anchor="middle" fill="#4ade80" font-size="6" font-family="Arial, sans-serif">SEGREGATION</text>
                  </svg>
                `}
              </div>
              <div>
                <h1 style="color: #0f172a; font-size: 24px; font-weight: 700; margin: 0;">EcoWaste</h1>
                <p style="color: #0d9488; font-size: 12px; margin: 2px 0 0 0; font-weight: 500;">Recycling Management System</p>
              </div>
            </div>
            <div style="text-align: right;">
              <p style="color: #64748b; font-size: 11px; margin: 0;">OFFICIAL REPORT</p>
              <p style="color: #94a3b8; font-size: 10px; margin: 4px 0 0 0;">Generated: ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #1e293b; font-size: 22px; margin: 0 0 8px 0;">Segregation Report</h2>
            <p style="color: #64748b; font-size: 13px; margin: 0;">Comprehensive waste composition analysis & material tracking</p>
          </div>
          
          <!-- Summary Statistics Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 35px;">
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 18px; border-radius: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">📄</div>
              <div style="font-size: 12px; color: #1e40af; font-weight: 600; margin-bottom: 4px;">PAPER WASTE</div>
              <div style="font-size: 28px; font-weight: 800; color: #1e3a8a;">${totalPaper.toFixed(1)} <span style="font-size: 14px;">kg</span></div>
              <div style="font-size: 11px; color: #3b82f6;">Daily avg: ${averagePaper.toFixed(1)} kg</div>
            </div>
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 18px; border-radius: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">🧴</div>
              <div style="font-size: 12px; color: #92400e; font-weight: 600; margin-bottom: 4px;">PLASTIC WASTE</div>
              <div style="font-size: 28px; font-weight: 800; color: #b45309;">${totalPlastic.toFixed(1)} <span style="font-size: 14px;">kg</span></div>
              <div style="font-size: 11px; color: #eab308;">Daily avg: ${averagePlastic.toFixed(1)} kg</div>
            </div>
            <div style="background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); padding: 18px; border-radius: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">🔩</div>
              <div style="font-size: 12px; color: #6b21a5; font-weight: 600; margin-bottom: 4px;">METAL WASTE</div>
              <div style="font-size: 28px; font-weight: 800; color: #7e22ce;">${totalMetal.toFixed(1)} <span style="font-size: 14px;">kg</span></div>
              <div style="font-size: 11px; color: #a855f7;">Daily avg: ${averageMetal.toFixed(1)} kg</div>
            </div>
            <div style="background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%); padding: 18px; border-radius: 16px; text-align: center;">
              <div style="font-size: 28px; margin-bottom: 8px;">♻️</div>
              <div style="font-size: 12px; color: #0f766e; font-weight: 600; margin-bottom: 4px;">GRAND TOTAL</div>
              <div style="font-size: 28px; font-weight: 800; color: #0d9488;">${grandTotal.toFixed(1)} <span style="font-size: 14px;">kg</span></div>
              <div style="font-size: 11px; color: #14b8a6;">Over ${wasteRecords.length} days</div>
            </div>
          </div>
          
          <!-- Statistics Table -->
          <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📊 Material Breakdown Summary</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                  <th style="padding: 12px; text-align: left;">Material Type</th>
                  <th style="padding: 12px; text-align: right;">Total (kg)</th>
                  <th style="padding: 12px; text-align: right;">Daily Average (kg)</th>
                  <th style="padding: 12px; text-align: right;">Percentage</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px;">📄 Paper</td>
                  <td style="padding: 12px; text-align: right;">${totalPaper.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right;">${averagePaper.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600; color: #3b82f6;">${((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0; background-color: #fafafa;">
                  <td style="padding: 12px;">🧴 Plastic</td>
                  <td style="padding: 12px; text-align: right;">${totalPlastic.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right;">${averagePlastic.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600; color: #eab308;">${((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 12px;">🔩 Metal</td>
                  <td style="padding: 12px; text-align: right;">${totalMetal.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right;">${averageMetal.toFixed(1)}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600; color: #a855f7;">${((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</td>
                </tr>
                <tr style="background-color: #f0fdf4; border-top: 2px solid #dcfce7;">
                  <td style="padding: 12px; font-weight: 700;">♻️ Grand Total</td>
                  <td style="padding: 12px; text-align: right; font-weight: 700;">${grandTotal.toFixed(1)} kg</td>
                  <td style="padding: 12px; text-align: right; font-weight: 700;">${averagePerDay.toFixed(1)} kg</td>
                  <td style="padding: 12px; text-align: right; font-weight: 700;">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Progress Bars Section -->
          <div style="margin-bottom: 35px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📈 Composition Distribution</h3>
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>📄 Paper</span>
                <span style="font-weight: 600;">${((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</span>
              </div>
              <div style="background-color: #e2e8f0; border-radius: 10px; height: 12px; overflow: hidden;">
                <div style="background-color: #3b82f6; width: ${((totalPaper / grandTotal) * 100 || 0)}%; height: 12px;"></div>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>🧴 Plastic</span>
                <span style="font-weight: 600;">${((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</span>
              </div>
              <div style="background-color: #e2e8f0; border-radius: 10px; height: 12px; overflow: hidden;">
                <div style="background-color: #eab308; width: ${((totalPlastic / grandTotal) * 100 || 0)}%; height: 12px;"></div>
              </div>
            </div>
            <div style="margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 12px;">
                <span>🔩 Metal</span>
                <span style="font-weight: 600;">${((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</span>
              </div>
              <div style="background-color: #e2e8f0; border-radius: 10px; height: 12px; overflow: hidden;">
                <div style="background-color: #a855f7; width: ${((totalMetal / grandTotal) * 100 || 0)}%; height: 12px;"></div>
              </div>
            </div>
          </div>
          
          <!-- Detailed Records -->
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #1e293b; border-left: 4px solid #0d9488; padding-left: 12px;">📋 Detailed Segregation Logs</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <thead>
                  <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                    <th style="padding: 10px; text-align: left;">Date</th>
                    <th style="padding: 10px; text-align: left;">Type</th>
                    <th style="padding: 10px; text-align: left;">Item Description</th>
                    <th style="padding: 10px; text-align: right;">Weight (kg)</th>
                    <th style="padding: 10px; text-align: left;">Location</th>
                  </tr>
                </thead>
                <tbody>
                  ${disposals.slice(0, 15).map(d => `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px;">${d.date}</td>
                      <td style="padding: 10px;">
                        <span style="background: ${d.type === 'Paper' ? '#dbeafe' : d.type === 'Plastic' ? '#fef3c7' : '#f3e8ff'}; color: ${d.type === 'Paper' ? '#1e40af' : d.type === 'Plastic' ? '#92400e' : '#6b21a5'}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;">
                          ${d.type}
                        </span>
                      </td>
                      <td style="padding: 10px;">${d.item}</td>
                      <td style="padding: 10px; text-align: right; font-weight: 500;">${d.weight}</td>
                      <td style="padding: 10px;">${d.location || 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${disposals.length > 15 ? `<p style="text-align: center; font-size: 11px; color: #64748b; margin-top: 12px;">* Showing latest 15 of ${disposals.length} records</p>` : ''}
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
      
      pdf.save(`EcoWaste_Recycling_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      document.body.removeChild(element);
      
      showNotification({
        message: 'Professional PDF exported successfully!',
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

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Paper': return 'bg-blue-100 text-blue-700';
      case 'Plastic': return 'bg-yellow-100 text-yellow-700';
      case 'Metal': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'Paper': return <FileText size={14} className="text-blue-600" />;
      case 'Plastic': return <Package size={14} className="text-yellow-600" />;
      case 'Metal': return <Recycle size={14} className="text-purple-600" />;
      default: return null;
    }
  };

  return (
    <ProtectedLayout activeMenu="garbage">
      <div className="w-full overflow-x-hidden animate-fade-in">
        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 py-4 sm:py-5 md:py-6 lg:py-8">
          
          {/* Header with Export Button Only */}
          <div className="flex flex-col sm:flex-row justify-end items-end gap-3 mb-6 sm:mb-8">
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg text-sm font-medium hover:from-teal-700 hover:to-teal-800 hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Export Professional PDF</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-blue-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-blue-600 mb-1 sm:mb-2">
                <FileText size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Paper</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalPaper.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averagePaper.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-yellow-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-yellow-600 mb-1 sm:mb-2">
                <Package size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Plastic</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalPlastic.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averagePlastic.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-purple-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-purple-600 mb-1 sm:mb-2">
                <Recycle size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Metal</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{totalMetal.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Avg: {averageMetal.toFixed(1)} kg</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-green-500 hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-1 sm:gap-2 text-green-600 mb-1 sm:mb-2">
                <TrendingUp size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Total</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{grandTotal.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">All materials</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-2 sm:p-4 border-l-2 sm:border-l-4 border-teal-500 hover:shadow-md transition-all duration-300 group col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1 sm:gap-2 text-teal-600 mb-1 sm:mb-2">
                <BarChart3 size={isMobile ? 16 : 20} className="group-hover:scale-110 transition-transform" />
                <span className="text-xs sm:text-sm font-medium truncate">Daily Avg</span>
              </div>
              <p className="text-sm sm:text-xl font-bold text-gray-900 truncate">{averagePerDay.toFixed(1)} kg</p>
              <p className="text-[10px] sm:text-xs text-gray-500">{wasteRecords.length} days</p>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {['overview', 'categories'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 sm:flex-none px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab 
                      ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'categories' && 'Categories'}
                </button>
              ))}
            </div>

            <div className="p-3 sm:p-6">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">Recyclable Categories</h3>
                    <div className="space-y-2">
                      {recyclableCategories.map((cat) => {
                        const Icon = cat.icon;
                        const colors = {
                          blue: 'bg-blue-100 text-blue-700',
                          yellow: 'bg-yellow-100 text-yellow-700',
                          purple: 'bg-purple-100 text-purple-700',
                        }[cat.color] || 'bg-gray-100 text-gray-700';

                        return (
                          <div key={cat.id} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                                <Icon className={`text-${cat.color}-600`} size={isMobile ? 16 : 20} />
                              </div>
                              <span className="text-xs sm:text-sm font-medium">{cat.label}</span>
                            </div>
                            <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${colors}`}>
                              {cat.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3">Material Breakdown</h3>
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-blue-600">
                            <FileText size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Paper</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-blue-600">
                            {((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-blue-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalPaper / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-yellow-600">
                            <Package size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Plastic</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-yellow-600">
                            {((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-yellow-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalPlastic / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2 text-purple-600">
                            <Recycle size={isMobile ? 16 : 20} />
                            <span className="text-xs sm:text-sm font-medium">Metal</span>
                          </div>
                          <span className="text-sm sm:text-base font-bold text-purple-600">
                            {((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div className="bg-purple-600 h-1.5 sm:h-2 rounded-full" style={{ width: `${(totalMetal / grandTotal) * 100 || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="border border-blue-200 rounded-lg p-3 sm:p-4 bg-blue-50 hover:bg-blue-100 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <FileText size={isMobile ? 20 : 24} className="text-blue-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Paper</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Newspapers, magazines, cardboard</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalPaper.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-blue-600">{((totalPaper / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="border border-yellow-200 rounded-lg p-3 sm:p-4 bg-yellow-50 hover:bg-yellow-100 transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Package size={isMobile ? 20 : 24} className="text-yellow-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Plastic</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Bottles, containers, jugs</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalPlastic.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-yellow-600">{((totalPlastic / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div className="border border-purple-200 rounded-lg p-3 sm:p-4 bg-purple-50 hover:bg-purple-100 transition-all group sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 sm:p-2 rounded-lg group-hover:scale-110 transition-transform">
                        <Recycle size={isMobile ? 20 : 24} className="text-purple-600" />
                      </div>
                      <h3 className="text-sm sm:text-base font-semibold">Metal</h3>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">Aluminum cans, tin cans, foil</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{totalMetal.toFixed(1)} kg</span>
                      <span className="text-xs font-medium text-purple-600">{((totalMetal / grandTotal) * 100 || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                {editingDisposal ? <Edit size={20} className="text-teal-600" /> : <Plus size={20} className="text-teal-600" />}
                {editingDisposal ? 'Edit Record' : 'Add New Record'}
              </h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select type</option>
                  <option value="Paper">Paper</option>
                  <option value="Plastic">Plastic</option>
                  <option value="Metal">Metal</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Item</label>
                <input
                  type="text"
                  name="item"
                  value={formData.item}
                  onChange={handleInputChange}
                  placeholder="Item description"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Zone A"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Time</label>
                <input
                  type="text"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  placeholder="e.g., 10:30 AM"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  placeholder="e.g., 3.2"
                  min="0"
                  step="0.1"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={closeModal} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">
                {editingDisposal ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}