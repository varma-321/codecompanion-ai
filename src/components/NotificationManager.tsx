import { useEffect, useCallback } from 'react';
import { useUser } from '@/lib/user-context';
import { supabase } from '@/integrations/supabase/client';

const NOTIFICATION_KEY = 'dsa-last-notification';
const REMINDER_HOUR = 19; // 7 PM

export function useNotificationReminders() {
  const { authUser } = useUser();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/placeholder.svg',
      badge: '/placeholder.svg',
      tag: 'dsa-reminder',
    });
  }, []);

  const checkAndNotify = useCallback(async () => {
    if (!authUser) return;

    const lastNotif = localStorage.getItem(NOTIFICATION_KEY);
    const today = new Date().toDateString();
    if (lastNotif === today) return;

    const now = new Date();
    if (now.getHours() < REMINDER_HOUR) return;

    // Check if user solved anything today
    const { data } = await supabase
      .from('user_problem_progress')
      .select('problem_key')
      .eq('user_id', authUser.id)
      .eq('solved', true)
      .gte('last_attempted', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString());

    if (!data || data.length === 0) {
      // Check streak
      const { data: allSolved } = await supabase
        .from('user_problem_progress')
        .select('last_attempted')
        .eq('user_id', authUser.id)
        .eq('solved', true)
        .not('last_attempted', 'is', null)
        .order('last_attempted', { ascending: false })
        .limit(7);

      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const hadStreakYesterday = allSolved?.some(
        p => new Date(p.last_attempted!).toDateString() === yesterday.toDateString()
      );

      if (hadStreakYesterday) {
        sendNotification('🔥 Streak at risk!', "You haven't solved any problems today. Don't break your streak!");
      } else {
        sendNotification('📚 Daily reminder', 'Time to practice! Solve at least one problem today.');
      }
    }

    localStorage.setItem(NOTIFICATION_KEY, today);
  }, [authUser, sendNotification]);

  useEffect(() => {
    if (!authUser) return;
    requestPermission();

    // Check immediately and then every 30 min
    checkAndNotify();
    const interval = setInterval(checkAndNotify, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [authUser, checkAndNotify, requestPermission]);
}

export default useNotificationReminders;
