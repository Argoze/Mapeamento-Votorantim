import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!message) return null;

  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle className="text-emerald-500 flex-shrink-0" size={22} />,
      text: 'text-emerald-800',
      progress: 'bg-emerald-400',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="text-red-500 flex-shrink-0" size={22} />,
      text: 'text-red-800',
      progress: 'bg-red-400',
    },
  };

  const s = styles[type] || styles.success;

  return (
    <div className={`fixed top-20 right-4 z-[9999] max-w-sm w-full transition-all duration-300 ${visible ? 'animate-slide-in-right' : 'opacity-0 translate-x-8'}`}>
      <div className={`${s.bg} border rounded-2xl shadow-xl overflow-hidden`}>
        <div className="flex items-start gap-3 p-4">
          {s.icon}
          <p className={`${s.text} text-sm font-semibold flex-1 leading-relaxed`}>{message}</p>
          <button onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 300); }} className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
            <X size={16} />
          </button>
        </div>
        <div className={`h-1 ${s.progress} toast-progress`} style={{ animationDuration: `${duration}ms` }}></div>
      </div>
    </div>
  );
}
