import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { getTemaInicial, aplicarTema } from '../lib/theme';

export default function ThemeToggle({ className = '' }) {
    const [tema, setTema] = useState(getTemaInicial);

    const alternar = () => {
        const proximo = tema === 'escuro' ? 'claro' : 'escuro';
        setTema(proximo);
        aplicarTema(proximo);
    };

    return (
        <button
            type="button"
            onClick={alternar}
            aria-pressed={tema === 'escuro'}
            aria-label={tema === 'escuro' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            title={tema === 'escuro' ? 'Modo claro' : 'Modo escuro'}
            className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors ${className}`}
        >
            {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}