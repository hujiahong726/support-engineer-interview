export function normalizeCardNumber(v: string) {
  return v.replace(/[\s-]/g, ""); // remove spaces + hyphens
}

export function isLuhnValid(num: string) {
  // num should be digits only
  let sum = 0;
  let doubleIt = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digit = +num[i];
    if (digit < 0 || digit > 9) return false;

    if (doubleIt) {
      digit *= 2;
      if (digit > 9){
        digit -= 9;
      }
    }
    sum += digit;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}