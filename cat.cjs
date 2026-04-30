const fs = require('fs');
const content = fs.readFileSync('src/wallet/screens/WalletScreen.tsx', 'utf8');
const lines = content.split('\n');
console.log("Lines 180 to 200:");
console.log(lines.slice(180, 200).join('\n'));
console.log("Lines 610 to 625:");
console.log(lines.slice(610, 625).join('\n'));
console.log("Lines 680 to 695:");
console.log(lines.slice(680, 695).join('\n'));
