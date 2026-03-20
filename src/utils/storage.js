import { formatDate } from './helpers';

// --- 💾 数据持久化 ---
export const loadData = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('读取本地数据失败:', e); }
  return fallback;
};

export const saveData = (key, data) => {
  try { localStorage.setItem(key, JSON.stringify(data)); }
  catch (e) { console.warn('保存本地数据失败:', e); }
};

export const getInitialPlans = () => {
  const TODAY = formatDate(new Date());
  return [
    { id: 'p1', date: TODAY, name: '方案策划', emoji: '📝', timeType: 'range', startTime: '09:00', endTime: '10:30', color: '#f57c6e', completed: true },
    { id: 'p2', date: TODAY, name: '团队周会', emoji: '📞', timeType: 'range', startTime: '10:30', endTime: '11:30', color: '#f2b56f', completed: false },
    { id: 'p3', date: TODAY, name: '回复邮件', emoji: '📧', timeType: 'point', startTime: '13:00', endTime: '13:00', color: '#fae69e', completed: false },
    { id: 'p4', date: TODAY, name: '阅读行业报告', emoji: '📖', timeType: 'none', startTime: null, endTime: null, color: '#84c3b7', completed: false },
  ];
};

export const getInitialActuals = () => {
  const TODAY = formatDate(new Date());
  return [
    { id: 'a1', date: TODAY, name: '方案策划', emoji: '📝', actualStart: '09:10', actualEnd: '10:45', fromPlanId: 'p1', color: '#f57c6e', source: 'manual' },
    { id: 'a2', date: TODAY, name: '午后散步', emoji: '🏃‍♂️', actualStart: '14:00', actualEnd: '14:30', fromPlanId: null, color: '#88d8db', source: 'manual' },
  ];
};