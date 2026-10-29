// Tudo no fuso de São Paulo. O Brasil não tem horário de verão desde 2019,
// então o deslocamento é sempre -03:00.
export const FUSO = "America/Sao_Paulo";
export const DESLOCAMENTO = "-03:00";

// "2026-10-26" (data de hoje em São Paulo)
export function hojeSP(): string {
  return dataSP(new Date());
}

// Data (YYYY-MM-DD) de um instante, no fuso de São Paulo
export function dataSP(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

// "segunda-feira, 26 de outubro de 2026, 17:05"
export function agoraPorExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());
}

// "05/11/2026 14:00 (quinta-feira)"
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  const dataHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long" }).format(d);
  return `${dataHora.replace(",", "")} (${semana})`;
}

// "26/10/2026" a partir de "2026-10-26"
export function formatarData(data: string): string {
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}`;
}

export function dataValida(texto: unknown): texto is string {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

// Converte "2026-11-05T14:00" (hora local de SP) para um instante ISO.
// Se já vier com fuso (Z ou -03:00), respeita. Devolve null se for inválido.
export function horaLocalParaISO(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  let t = texto.trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return null; // precisa de horário
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t)) t += ":00";
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(t)) t += DESLOCAMENTO;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Soma dias a uma data YYYY-MM-DD
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Primeiro e último dia do mês de uma data YYYY-MM-DD (ou "YYYY-MM")
export function limitesDoMes(data: string): { inicio: string; fim: string } {
  const [a, m] = data.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { inicio: `${a}-${mm}-01`, fim: `${a}-${mm}-${String(ultimoDia).padStart(2, "0")}` };
}

// Início e fim de um dia de SP como instantes ISO (para filtrar timestamptz)
export function inicioDoDiaISO(data: string): string {
  return new Date(`${data}T00:00:00${DESLOCAMENTO}`).toISOString();
}
export function fimDoDiaISO(data: string): string {
  return new Date(`${data}T23:59:59.999${DESLOCAMENTO}`).toISOString();
}

// ISO -> "2026-11-05T14:00" no horário de SP (para campos de data e hora)
export function paraHoraLocal(iso: string): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "00";
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}

// "Hoje", "Ontem", "Amanhã" ou "qui., 5 de nov."
export function rotuloDoDia(data: string): string {
  const hoje = hojeSP();
  if (data === hoje) return "Hoje";
  if (data === somarDias(hoje, -1)) return "Ontem";
  if (data === somarDias(hoje, 1)) return "Amanhã";
  const d = new Date(`${data}T12:00:00Z`);
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(data.slice(0, 4) !== hoje.slice(0, 4) ? { year: "numeric" } : {}),
  }).format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "14:00"
export function horaSP(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
