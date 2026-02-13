export function yearsAgo(years: number) {
  const today = new Date();
  return new Date(
    today.getFullYear() - years, 
    today.getMonth(), 
    today.getDate()
);
}