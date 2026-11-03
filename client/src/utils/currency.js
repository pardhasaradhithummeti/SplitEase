/**
 * Format a number into currency string with symbol
 * @param {number} amount
 * @param {string} currencySymbol
 * @returns {string}
 */
export const formatCurrency = (amount, currencySymbol = '₹') => {
  const num = Number(amount || 0);
  return `${currencySymbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/**
 * Format date into readable string e.g. "Nov 1, 2026"
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

