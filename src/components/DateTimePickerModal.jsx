import { useState, useEffect } from 'react';
import { Calendar, Clock, X, Check, Sun } from 'lucide-react';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function formatDateString(dateStr, horaInicio, horaFim, diaInteiro) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const mesNome = MESES[month - 1];
  const dataFormatada = `${day} de ${mesNome} de ${year}`;

  if (diaInteiro) {
    return `${dataFormatada} — Dia inteiro`;
  }
  if (horaInicio && horaFim) {
    return `${dataFormatada}, ${horaInicio} às ${horaFim}`;
  }
  if (horaInicio) {
    return `${dataFormatada}, a partir das ${horaInicio}`;
  }
  return dataFormatada;
}

export default function DateTimePickerModal({ isOpen, onClose, onConfirm, initialValue }) {
  const [data, setData] = useState('');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('16:00');
  const [diaInteiro, setDiaInteiro] = useState(false);

  // Set today as minimum date
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      // Reset to defaults when opening
      if (!initialValue) {
        setData('');
        setHoraInicio('08:00');
        setHoraFim('16:00');
        setDiaInteiro(false);
      }
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    if (!data) return;
    const formatted = formatDateString(data, horaInicio, horaFim, diaInteiro);
    onConfirm(formatted);
    onClose();
  };

  const preview = formatDateString(data, horaInicio, horaFim, diaInteiro);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Selecionar Data e Horário</h3>
                <p className="text-blue-100 text-xs">Escolha quando o evento acontecerá</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Data */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Calendar size={14} className="text-blue-500" />
              Data do evento
            </label>
            <input
              type="date"
              min={today}
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium"
            />
          </div>

          {/* Toggle Dia Inteiro */}
          <div
            className="flex items-center justify-between p-3.5 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => setDiaInteiro(!diaInteiro)}
          >
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Dia inteiro</span>
            </div>
            <div className={`w-11 h-6 rounded-full transition-all relative ${diaInteiro ? 'bg-amber-500' : 'bg-slate-300'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${diaInteiro ? 'left-5.5 translate-x-0.5' : 'left-0.5'}`} />
            </div>
          </div>

          {/* Horários */}
          {!diaInteiro && (
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-green-500" />
                  Hora início
                </label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-red-500" />
                  Hora fim
                </label>
                <input
                  type="time"
                  value={horaFim}
                  onChange={(e) => setHoraFim(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-800 font-medium"
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {data && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 animate-fade-in">
              <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-1">Preview</p>
              <p className="text-blue-900 font-bold text-sm">{preview}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!data}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={16} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
