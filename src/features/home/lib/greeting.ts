// Local time: "Bom dia" from 06:00, "Boa tarde" from 12:00, "Boa noite" from 20:00.
export function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour >= 6 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 20) return 'Boa tarde'
  return 'Boa noite'
}
