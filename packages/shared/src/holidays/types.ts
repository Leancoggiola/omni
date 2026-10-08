export interface Holiday {
  id: string;
  title: string;
  isArgentina: boolean;
}

export interface TodayHolidays {
  /** YYYY-MM-DD en APP_TIMEZONE. */
  date: string;
  /** MM con cero a la izquierda. */
  month: string;
  /** DD con cero a la izquierda. */
  day: string;
  count: number;
  /** Página del día en Wikipedia, anclada en la sección Celebraciones. */
  sourceUrl: string;
  items: Holiday[];
}

/** Respuesta cruda de Wikipedia: solo los campos que consumimos, todos opcionales porque no hay contrato. */
export interface WikipediaHolidayEntry {
  text?: string;
}

export interface WikipediaHolidaysResponse {
  holidays?: WikipediaHolidayEntry[];
}
