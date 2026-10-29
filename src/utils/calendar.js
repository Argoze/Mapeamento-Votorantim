// Utilitário para exportação de eventos/campanhas de saúde
// para Google Calendar, Apple Calendar, Outlook e arquivo .ICS (iCal).

const MESES = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  marco: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Converte Date para string UTC no padrão iCalendar: YYYYMMDDTHHmmssZ
 */
function formatIsoUtc(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Formata ano, mês e dia no padrão YYYYMMDD (para eventos de dia inteiro)
 */
function formatDateOnly(year, month, day) {
  return `${year}${pad(month)}${pad(day)}`;
}

/**
 * Escapa caracteres reservados do padrão iCalendar (RFC 5545)
 */
function escapeIcsText(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Analisa a string de data do evento (ex: "30 de Março de 2026 — Dia inteiro",
 * "15 de Novembro de 2026, 08:00 às 17:00", "2026-11-15", etc.)
 * e retorna objetos Date para início e fim.
 */
export function parseEventoDate(dataStr, fallbackCriadoEm) {
  if (!dataStr || typeof dataStr !== 'string') {
    const fb = fallbackCriadoEm ? new Date(fallbackCriadoEm) : new Date();
    const start = isNaN(fb.getTime()) ? new Date() : fb;
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return {
      start,
      end,
      isAllDay: false,
      year: start.getFullYear(),
      month: start.getMonth() + 1,
      day: start.getDate(),
    };
  }

  const s = dataStr.trim();

  // Padrão em português gerado pelo DateTimePickerModal:
  // "30 de Março de 2026 — Dia inteiro" ou "15 de Novembro de 2026, 08:00 às 17:00"
  const ptMatch = s.match(/(\d{1,2})\s+de\s+([A-Za-zçÇãÃáÁéÉíÍóÓúÚ]+)\s+de\s+(\d{4})(.*)/i);
  if (ptMatch) {
    const day = parseInt(ptMatch[1], 10);
    const monthKey = ptMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const month = MESES[monthKey] ?? MESES[ptMatch[2].toLowerCase()] ?? 0;
    const year = parseInt(ptMatch[3], 10);
    const rest = ptMatch[4] || '';

    const isAllDay = /dia\s*inteiro/i.test(rest) || !/:\d{2}/.test(rest);

    if (isAllDay) {
      const start = new Date(year, month, day, 0, 0, 0);
      const end = new Date(year, month, day + 1, 0, 0, 0);
      return { start, end, isAllDay: true, year, month: month + 1, day };
    }

    // Intervalo de horário: "08:00 às 17:00" ou "08:00 as 17:00" ou "08:00 - 17:00"
    const rangeMatch = rest.match(/(\d{1,2}):(\d{2})\s*(?:às|as|-|ate|até)\s*(\d{1,2}):(\d{2})/i);
    if (rangeMatch) {
      const startH = parseInt(rangeMatch[1], 10);
      const startM = parseInt(rangeMatch[2], 10);
      const endH = parseInt(rangeMatch[3], 10);
      const endM = parseInt(rangeMatch[4], 10);
      return {
        start: new Date(year, month, day, startH, startM, 0),
        end: new Date(year, month, day, endH, endM, 0),
        isAllDay: false,
        year,
        month: month + 1,
        day,
      };
    }

    // Apenas horário de início: "a partir das 08:00"
    const singleMatch = rest.match(/(\d{1,2}):(\d{2})/);
    if (singleMatch) {
      const startH = parseInt(singleMatch[1], 10);
      const startM = parseInt(singleMatch[2], 10);
      return {
        start: new Date(year, month, day, startH, startM, 0),
        end: new Date(year, month, day, startH + 2, startM, 0),
        isAllDay: false,
        year,
        month: month + 1,
        day,
      };
    }

    // Fallback do padrão pt: dia inteiro
    return {
      start: new Date(year, month, day, 8, 0, 0),
      end: new Date(year, month, day, 18, 0, 0),
      isAllDay: true,
      year,
      month: month + 1,
      day,
    };
  }

  // Padrão ISO YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    return {
      start: new Date(year, month - 1, day, 0, 0, 0),
      end: new Date(year, month - 1, day + 1, 0, 0, 0),
      isAllDay: true,
      year,
      month,
      day,
    };
  }

  // Padrão brasileiro DD/MM/YYYY
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    const year = parseInt(brMatch[3], 10);
    return {
      start: new Date(year, month - 1, day, 0, 0, 0),
      end: new Date(year, month - 1, day + 1, 0, 0, 0),
      isAllDay: true,
      year,
      month,
      day,
    };
  }

  // Fallback genérico com Date.parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return {
      start: parsed,
      end: new Date(parsed.getTime() + 2 * 60 * 60 * 1000),
      isAllDay: false,
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate(),
    };
  }

  const today = new Date();
  return {
    start: today,
    end: new Date(today.getTime() + 2 * 60 * 60 * 1000),
    isAllDay: true,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

/**
 * Gera URL direta para adicionar o evento ao Google Calendar.
 */
export function generateGoogleCalendarUrl(evento) {
  if (!evento) return '';
  const parsed = parseEventoDate(evento.data_evento, evento.criado_em);

  const title = encodeURIComponent(evento.titulo || 'Campanha de Saúde - Votorantim');
  const descCurta = (evento.descricao || '').slice(0, 320);
  const details = encodeURIComponent(
    `${descCurta}${evento.descricao && evento.descricao.length > 320 ? '...' : ''}\n\n📍 Local: ${evento.local_evento || 'Consulte a unidade'}\n📅 Data: ${evento.data_evento || ''}\n\nPortal da Saúde de Votorantim`
  );
  const location = encodeURIComponent(evento.local_evento || 'Votorantim, SP');

  let datesParam;
  if (parsed.isAllDay) {
    const startStr = formatDateOnly(parsed.year, parsed.month, parsed.day);
    const nextDate = new Date(parsed.year, parsed.month - 1, parsed.day + 1);
    const endStr = formatDateOnly(
      nextDate.getFullYear(),
      nextDate.getMonth() + 1,
      nextDate.getDate()
    );
    datesParam = `${startStr}/${endStr}`;
  } else {
    datesParam = `${formatIsoUtc(parsed.start)}/${formatIsoUtc(parsed.end)}`;
  }

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}&ctz=America/Sao_Paulo`;
}

/**
 * Gera URL direta para Outlook Web (Outlook.com / Microsoft 365).
 */
export function generateOutlookCalendarUrl(evento) {
  if (!evento) return '';
  const parsed = parseEventoDate(evento.data_evento, evento.criado_em);

  const subject = encodeURIComponent(evento.titulo || 'Campanha de Saúde - Votorantim');
  const body = encodeURIComponent(
    `${evento.descricao || ''}\n\n📍 Local: ${evento.local_evento || 'Consulte a unidade'}\n📅 Data: ${evento.data_evento || ''}\n\nPortal da Saúde de Votorantim`
  );
  const location = encodeURIComponent(evento.local_evento || 'Votorantim, SP');

  const startIso = parsed.start.toISOString();
  const endIso = parsed.end.toISOString();
  const allDayParam = parsed.isAllDay ? '&allday=true' : '';

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${subject}&startdt=${encodeURIComponent(startIso)}&enddt=${encodeURIComponent(endIso)}&body=${body}&location=${location}${allDayParam}`;
}

/**
 * Gera o conteúdo no formato iCalendar (.ics) compatível com
 * Apple Calendar, iOS, Android, Microsoft Outlook e outros.
 */
export function generateIcsContent(evento) {
  if (!evento) return '';
  const parsed = parseEventoDate(evento.data_evento, evento.criado_em);
  const nowUtc = formatIsoUtc(new Date());
  const uid = `${evento.id || Date.now()}@saude.votorantim.sp.gov.br`;

  let dtStartLine;
  let dtEndLine;

  if (parsed.isAllDay) {
    const startStr = formatDateOnly(parsed.year, parsed.month, parsed.day);
    const nextDate = new Date(parsed.year, parsed.month - 1, parsed.day + 1);
    const endStr = formatDateOnly(
      nextDate.getFullYear(),
      nextDate.getMonth() + 1,
      nextDate.getDate()
    );
    dtStartLine = `DTSTART;VALUE=DATE:${startStr}`;
    dtEndLine = `DTEND;VALUE=DATE:${endStr}`;
  } else {
    dtStartLine = `DTSTART:${formatIsoUtc(parsed.start)}`;
    dtEndLine = `DTEND:${formatIsoUtc(parsed.end)}`;
  }

  const summary = escapeIcsText(evento.titulo || 'Campanha de Saúde - Votorantim');
  const description = escapeIcsText(
    `${evento.descricao || ''}\n\n📍 Local: ${evento.local_evento || 'Consulte a unidade'}\n📅 Data informada: ${evento.data_evento || ''}\n\nPortal da Saúde de Votorantim`
  );
  const location = escapeIcsText(evento.local_evento || 'Votorantim, SP');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Saude Votorantim//Campanhas de Saude//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowUtc}`,
    dtStartLine,
    dtEndLine,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Dispara o download automático do arquivo .ics para o dispositivo do usuário.
 */
export function downloadIcsFile(evento) {
  const content = generateIcsContent(evento);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Nome do arquivo amigável e limpo
  const cleanTitle = (evento.titulo || 'evento-saude-votorantim')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${cleanTitle || 'evento-votorantim'}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
