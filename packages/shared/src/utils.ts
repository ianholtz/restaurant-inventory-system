export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export const isExpiringSoon = (expirationDate: Date, daysThreshold: number = 7): boolean => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + daysThreshold);
  return new Date(expirationDate) <= threshold;
};

export const calculateWasteValue = (quantity: number, costPerUnit: number): number => {
  return quantity * costPerUnit;
};