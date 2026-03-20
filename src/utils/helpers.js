// --- 🛠 工具函数 ---

export const timeToMins = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  export const minsToTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };
  
  export const formatMins = (diff) => {
    if (diff <= 0) return '0m';
    const h = Math.floor(diff / 60);
    const m = Math.floor(diff % 60);
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h 0m`;
    return `${m}m`;
  };
  
  export const formatDuration = (startMins, endMins) => formatMins(endMins - startMins);
  
  export const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  
  export const getDisplayDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`;
  };
  
  export const addDays = (dateStr, days) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return formatDate(d);
  };
  
  // 重叠检测（交集即重叠，边界相接不算）
  export const isOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && end1 > start2;
  };