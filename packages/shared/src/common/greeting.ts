/** Saludo según la hora local de `date`: "Buenos días" de 6 a 12, "Buenas tardes" de 12 a 20 y "Buenas noches" el resto. */
export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour >= 6 && hour < 12) {
    return 'Buenos días';
  }

  if (hour >= 12 && hour < 20) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}
