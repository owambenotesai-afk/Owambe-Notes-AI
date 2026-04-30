const fs = require('fs');
const content = fs.readFileSync('src/wallet/screens/WalletScreen.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(590, 710).map((l, i) => (i+590) + ": " + l).join('\n'));
