import fs from 'fs';
const content = fs.readFileSync('/app/applet/src/pages/tools/ReceiptGenerator.tsx', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('const CURRENCIES = ['));
const end = lines.findIndex(l => l.includes('export const ReceiptGenerator = () => {'));
if (start !== -1 && end !== -1) {
  const newCurrencies = [
    '  { code: \\'USD\\', symbol: \\'$\\', name: \\'US Dollar\\' },',
    '  { code: \\'EUR\\', symbol: \\'€\\', name: \\'Euro\\' },',
    '  { code: \\'GBP\\', symbol: \\'£\\', name: \\'British Pound\\' },',
    '  { code: \\'JPY\\', symbol: \\'¥\\', name: \\'Japanese Yen\\' },',
    '  { code: \\'AUD\\', symbol: \\'A$\\', name: \\'Australian Dollar\\' },',
    '  { code: \\'CAD\\', symbol: \\'C$\\', name: \\'Canadian Dollar\\' },',
    '  { code: \\'CHF\\', symbol: \\'CHF\\', name: \\'Swiss Franc\\' },',
    '  { code: \\'CNY\\', symbol: \\'¥\\', name: \\'Chinese Yuan\\' },',
    '  { code: \\'INR\\', symbol: \\'₹\\', name: \\'Indian Rupee\\' },',
    '  { code: \\'BRL\\', symbol: \\'R$\\', name: \\'Brazilian Real\\' },',
    '  { code: \\'ZAR\\', symbol: \\'R\\', name: \\'South African Rand\\' },',
    '  { code: \\'NGN\\', symbol: \\'₦\\', name: \\'Nigerian Naira\\' },',
    '  { code: \\'GHS\\', symbol: \\'GH₵\\', name: \\'Ghanaian Cedi\\' },',
    '  { code: \\'KES\\', symbol: \\'KSh\\', name: \\'Kenyan Shilling\\' },',
    '  { code: \\'SGD\\', symbol: \\'S$\\', name: \\'Singapore Dollar\\' },',
    '  { code: \\'NZD\\', symbol: \\'NZ$\\', name: \\'New Zealand Dollar\\' },',
    '  { code: \\'SEK\\', symbol: \\'kr\\', name: \\'Swedish Krona\\' },',
    '  { code: \\'KRW\\', symbol: \\'₩\\', name: \\'South Korean Won\\' },',
    '  { code: \\'TRY\\', symbol: \\'₺\\', name: \\'Turkish Lira\\' },',
    '  { code: \\'RUB\\', symbol: \\'₽\\', name: \\'Russian Ruble\\' },',
    '];',
    ''
  ];
  const newLines = [...lines.slice(0, start + 1), ...newCurrencies, ...lines.slice(end)];
  fs.writeFileSync('/app/applet/src/pages/tools/ReceiptGenerator.tsx', newLines.join('\n'));
  console.log('Fixed file');
} else {
  console.log('Could not find start or end', start, end);
}
