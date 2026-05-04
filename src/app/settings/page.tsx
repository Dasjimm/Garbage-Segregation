'use client';

import { useState, useEffect } from 'react';
import ProtectedLayout from '@/app/components/ProtectedLayout';
import { useSupabaseAuth } from '@/app/context/SupabaseAuthContext';
import { useConfirmation } from '@/app/context/ConfirmationContext';
import { useNotification } from '@/app/context/NotificationContext';
import {
  Save,
  CheckCircle,
  Settings,
  Bell,
  Users,
  RefreshCw,
  AlertTriangle,
  FileText,
  Clock,
  Edit,
  X,
  Calendar,
  Lock
} from 'lucide-react';
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
}

export default function SettingsPage() {
  const { user } = useSupabaseAuth();
  const { showNotification } = useNotification();
  const { confirm } = useConfirmation();
  const [activeTab, setActiveTab] = useState('notifications');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    dailyReports: true,
    weeklyReports: true,
    criticalAlerts: true,
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(' ') || ['', ''];
      setProfile({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: user.email || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const savedNotificationSettings = localStorage.getItem('notificationSettings');
    if (savedNotificationSettings) {
      setNotificationSettings(JSON.parse(savedNotificationSettings));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    
    applyNotificationSettings(notificationSettings);
  }, [notificationSettings]);

  const applyNotificationSettings = (settings: typeof notificationSettings) => {
    if (settings.dailyReports) {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'dailyReports', enabled: true }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'dailyReports', enabled: false }
      }));
    }

    if (settings.weeklyReports) {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'weeklyReports', enabled: true }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'weeklyReports', enabled: false }
      }));
    }

    if (settings.criticalAlerts) {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'criticalAlerts', enabled: true }
      }));
    } else {
      window.dispatchEvent(new CustomEvent('notification-control', {
        detail: { type: 'criticalAlerts', enabled: false }
      }));
    }
  };

  const triggerNotification = (type: 'daily' | 'weekly' | 'critical') => {
    switch(type) {
      case 'daily':
        if (notificationSettings.dailyReports) {
          window.dispatchEvent(new CustomEvent('daily-report-ready', {
            detail: {
              date: new Date().toLocaleDateString(),
              paper: Math.floor(Math.random() * 50) + 10,
              plastic: Math.floor(Math.random() * 40) + 5,
              metal: Math.floor(Math.random() * 30) + 5
            }
          }));
          
          showNotification({
            message: 'Daily report is ready for review',
            type: 'info',
            duration: 3000
          });
        }
        break;
        
      case 'weekly':
        if (notificationSettings.weeklyReports) {
          window.dispatchEvent(new CustomEvent('weekly-report-ready', {
            detail: {
              week: 'Week ' + Math.floor(Math.random() * 4 + 1),
              total: Math.floor(Math.random() * 500) + 100
            }
          }));
          
          showNotification({
            message: 'Weekly report is ready for review',
            type: 'info',
            duration: 3000
          });
        }
        break;
        
      case 'critical':
        if (notificationSettings.criticalAlerts) {
          window.dispatchEvent(new CustomEvent('critical-alert', {
            detail: {
              level: 'high',
              message: 'Sensor calibration required',
              component: 'Main sensor'
            }
          }));
          
          showNotification({
            message: 'Critical alert: Sensor calibration required',
            type: 'warning',
            duration: 5000
          });
        }
        break;
    }
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = () => {
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.email.trim()) {
      showNotification({
        message: 'Please fill in all fields',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      showNotification({
        message: 'Please enter a valid email address',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    setIsEditing(false);
    showNotification({
      message: 'Profile updated successfully!',
      type: 'success',
      duration: 3000
    });
  };

  const handleChangePassword = () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showNotification({
        message: 'Please fill in all password fields',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotification({
        message: 'New passwords do not match',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showNotification({
        message: 'Password must be at least 6 characters',
        type: 'warning',
        duration: 3000
      });
      return;
    }

    confirm({
      title: 'Change Password',
      message: 'Are you sure you want to change your password?',
      confirmText: 'Yes, Change',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => {
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showNotification({
          message: 'Password changed successfully!',
          type: 'success',
          duration: 3000
        });
      }
    });
  };

  const handleCancelEdit = () => {
    confirm({
      title: 'Cancel Editing',
      message: 'Are you sure you want to cancel? Any unsaved changes will be lost.',
      confirmText: 'Yes, Cancel',
      cancelText: 'Continue Editing',
      type: 'warning',
      onConfirm: () => {
        setIsEditing(false);
        if (user) {
          const nameParts = user.name?.split(' ') || ['', ''];
          setProfile({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: user.email || ''
          });
        }
      }
    });
  };

  const getDisplayName = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }
    if (profile.email) {
      return profile.email.split('@')[0];
    }
    return 'User';
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNotificationSettings(prev => ({ ...prev, [name]: checked }));
    
    showNotification({
      message: `${name === 'dailyReports' ? 'Daily reports' : 
                name === 'weeklyReports' ? 'Weekly reports' : 
                'Critical alerts'} ${checked ? 'enabled' : 'disabled'}`,
      type: 'info',
      duration: 2000
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      
      window.dispatchEvent(new CustomEvent('settings-updated', {
        detail: {
          tab: activeTab,
          timestamp: new Date().toLocaleTimeString()
        }
      }));
      
      showNotification({
        message: 'Settings saved successfully!',
        type: 'success',
        duration: 3000
      });
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  return (
    <ProtectedLayout activeMenu="settings">
      <div className="w-full overflow-x-hidden animate-fade-in">
        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8 py-4 sm:py-5 md:py-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3">
              <Settings size={isMobile ? 24 : 28} className="text-teal-600 flex-shrink-0" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure system preferences and profile</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {showSuccess && (
                <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 order-first sm:order-none animate-fade-in">
                  <CheckCircle size={14} />
                  Settings saved
                </div>
              )}
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span className="hidden sm:inline">Save</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-md p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">Test Notifications</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => triggerNotification('daily')}
                disabled={!notificationSettings.dailyReports}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  notificationSettings.dailyReports
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <FileText size={14} />
                Daily Report
              </button>
              <button
                onClick={() => triggerNotification('weekly')}
                disabled={!notificationSettings.weeklyReports}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  notificationSettings.weeklyReports
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Calendar size={14} />
                Weekly Report
              </button>
              <button
                onClick={() => triggerNotification('critical')}
                disabled={!notificationSettings.criticalAlerts}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  notificationSettings.criticalAlerts
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <AlertTriangle size={14} />
                Critical Alert
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden mb-6">
            <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 sm:flex-none px-3 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'notifications'
                    ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Bell size={isMobile ? 16 : 18} />
                <span className={isMobile ? 'sr-only' : ''}>Notifications</span>
                {isMobile && <span className="text-[10px]">Notif</span>}
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex-1 sm:flex-none px-3 sm:px-5 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition flex items-center justify-center gap-1 sm:gap-2 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Users size={isMobile ? 16 : 18} />
                <span className={isMobile ? 'sr-only' : ''}>Profile</span>
                {isMobile && <span className="text-[10px]">Profile</span>}
              </button>
            </div>

            <div className="p-3 sm:p-4 md:p-5 lg:p-6">
              {activeTab === 'notifications' && (
                <div className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                      <input
                        type="checkbox"
                        name="dailyReports"
                        checked={notificationSettings.dailyReports}
                        onChange={handleNotificationChange}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 flex-shrink-0"
                      />
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <FileText size={isMobile ? 14 : 16} className="text-purple-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 block truncate">Daily Reports</span>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">Daily summary</p>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
                      <input
                        type="checkbox"
                        name="weeklyReports"
                        checked={notificationSettings.weeklyReports}
                        onChange={handleNotificationChange}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 flex-shrink-0"
                      />
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <Calendar size={isMobile ? 14 : 16} className="text-orange-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 block truncate">Weekly Reports</span>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">Weekly analytics</p>
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer sm:col-span-2">
                      <input
                        type="checkbox"
                        name="criticalAlerts"
                        checked={notificationSettings.criticalAlerts}
                        onChange={handleNotificationChange}
                        className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 flex-shrink-0"
                      />
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        <AlertTriangle size={isMobile ? 14 : 16} className="text-red-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs sm:text-sm font-medium text-gray-700 block truncate">Critical Alerts Only</span>
                          <p className="text-[10px] sm:text-xs text-gray-500 truncate">Only critical alerts</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">{getDisplayName()}</h2>
                          <p className="text-sm text-gray-500">{profile.email}</p>
                        </div>
                        {!isEditing ? (
                          <button
                            onClick={() => setIsEditing(true)}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                          >
                            <Edit size={16} />
                            Edit Profile
                          </button>
                        ) : (
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                          >
                            <X size={16} />
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                            <input
                              type="text"
                              name="firstName"
                              value={profile.firstName}
                              onChange={handleProfileChange}
                              disabled={!isEditing}
                              placeholder="First name"
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                            <input
                              type="text"
                              name="lastName"
                              value={profile.lastName}
                              onChange={handleProfileChange}
                              disabled={!isEditing}
                              placeholder="Last name"
                              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            placeholder="Email address"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                      </div>

                      {isEditing && (
                        <div className="flex justify-end mt-6">
                          <button
                            onClick={handleSaveProfile}
                            className="px-6 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition flex items-center gap-2"
                          >
                            <Save size={16} />
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
                      >
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    placeholder="Enter new password"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordForm.confirmPassword}
                    onChange={handlePasswordChange}
                    placeholder="Confirm new password"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedLayout>
  );
}