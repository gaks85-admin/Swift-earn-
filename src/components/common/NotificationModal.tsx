import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Bell, AlertCircle, Users, ArrowUpRight, Check } from 'lucide-react';
import { NotificationItem } from '../../types';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, refreshUserData } = useAuth();

  const loadNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (err: any) {
      if (!err?.message?.includes('Authentication')) {
        console.warn('Notice: Could not load notifications:', err?.message || err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      await refreshUserData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      await refreshUserData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="notification-modal-card"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#6C2BD9] text-[#B8F500] flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900">Notifications</h2>
              <p className="text-xs text-zinc-500">Reward alerts, payouts & activity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                id="btn-mark-all-read"
                onClick={handleMarkAllAsRead}
                className="text-xs font-semibold text-[#6C2BD9] hover:underline flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              id="btn-close-notifications"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1 divide-y divide-zinc-100">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">You have no notifications yet.</p>
              <p className="text-xs text-zinc-400">Complete rewarded opportunities to earn verified rewards.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => !item.read && handleMarkAsRead(item.id)}
                className={`pt-3 pb-3 px-3 rounded-xl transition-colors cursor-pointer ${
                  item.read ? 'bg-white hover:bg-zinc-50' : 'bg-purple-50/70 border border-purple-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        item.type === 'reward'
                          ? 'bg-[#B8F500] text-[#0F172A]'
                          : item.type === 'withdrawal'
                          ? 'bg-[#6C2BD9] text-white'
                          : item.type === 'referral'
                          ? 'bg-[#B8F500] text-[#0F172A]'
                          : 'bg-zinc-800 text-white'
                      }`}
                    >
                      {item.type === 'reward' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : item.type === 'withdrawal' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : item.type === 'referral' ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                        {!item.read && (
                          <span className="w-2 h-2 rounded-full bg-[#6C2BD9]"></span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">{item.message}</p>
                      <span className="text-[11px] text-zinc-400 mt-1.5 block">
                        {new Date(item.created_at).toLocaleDateString()} at{' '}
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-center">
          <button
            onClick={() => {
              onClose();
              onNavigate('earn');
            }}
            className="w-full py-2.5 rounded-xl bg-[#6C2BD9] hover:bg-[#5821B0] text-white font-bold text-sm transition-colors"
          >
            Explore Available Rewards
          </button>
        </div>
      </div>
    </div>
  );
};
