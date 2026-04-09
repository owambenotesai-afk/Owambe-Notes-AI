export function numberToWords(amount: number, currencyName: string = ''): string {
  if (amount === 0) return 'Zero ' + currencyName;

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
    'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (num: number): string => {
    if ((num = Math.floor(num)) === 0) return '';
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + a[num % 10] : '');
    if (num < 1000) return a[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + inWords(num % 100) : '');
    if (num < 1000000) return inWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + inWords(num % 1000) : '');
    if (num < 1000000000) return inWords(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 !== 0 ? ' ' + inWords(num % 1000000) : '');
    return inWords(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 !== 0 ? ' ' + inWords(num % 1000000000) : '');
  };

  const wholePart = Math.floor(amount);
  const decimalPart = Math.round((amount - wholePart) * 100);

  let words = inWords(wholePart);
  
  if (currencyName) {
    words += ' ' + currencyName;
  }
  
  if (decimalPart > 0) {
    words += ' and ' + inWords(decimalPart) + ' Cents';
  }

  return words + ' Only';
}