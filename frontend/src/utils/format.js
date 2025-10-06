export function formatCurrency(amount, currency = "USD") {
  // simple local formatting
  const symbol = currency === "USD" ? "$" : currency + " ";
  if (typeof amount === "number") {
    return symbol + amount.toLocaleString();
  }
  return symbol + amount;
}
