export function addBusinessDays(start: Date, amount: number): Date {
  const result = new Date(start);
  let remaining = amount;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}
