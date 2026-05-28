import { useEffect, useState } from 'react';

export default function StatsCard({ icon: Icon, value, label, color = 'blue', delay = 0 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(interval);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const colors = {
    blue: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
    red: { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-100' },
  };

  const c = colors[color] || colors.blue;

  return (
    <div className={`${c.bg} ${c.border} border rounded-2xl p-4 flex items-center gap-4 animate-slide-up transition-smooth hover:shadow-md`} style={{ animationDelay: `${delay}ms` }}>
      <div className={`h-12 w-12 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon className={c.icon} size={24} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-800 tabular-nums">{count}</p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
