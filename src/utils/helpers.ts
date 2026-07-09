export const inr = (value: number, maxFractionDigits: number = 0): string => {
  const formatted = Math.abs(value).toLocaleString('en-IN', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0
  });
  return `${value < 0 ? '-' : ''}₹${formatted}`;
};

export const dateKey = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const todayKey = (): string => dateKey(new Date());

export const keyOf = (dateStrOrObj: string | Date): string => {
  return dateKey(new Date(dateStrOrObj));
};

export const isToday = (dateStr: string): boolean => {
  return keyOf(dateStr) === todayKey();
};

export const isThisMonth = (dateStr: string): boolean => {
  return keyOf(dateStr).slice(0, 7) === todayKey().slice(0, 7);
};

export const lastNDays = (daysCount: number): string[] => {
  const keys: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(dateKey(d));
  }
  return keys;
};

export const fmtDate = (dateStrOrObj: string | Date): string => {
  return new Date(dateStrOrObj).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
};

export const fmtDateTime = (dateStrOrObj: string | Date): string => {
  const d = new Date(dateStrOrObj);
  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
  const timePart = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${datePart}, ${timePart}`;
};

export const dayLabel = (dateStr: string): string => {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'short'
  });
};

export const daysBetween = (start: string, end: string): string[] => {
  const keys: string[] = [];
  const u = new Date(start + 'T12:00:00');
  const c = new Date(end + 'T12:00:00');
  while (u <= c && keys.length < 62) {
    keys.push(dateKey(u));
    u.setDate(u.getDate() + 1);
  }
  return keys;
};

export const uid = (): string => {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
};

export const parseNum = (value: string | number): number => {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
