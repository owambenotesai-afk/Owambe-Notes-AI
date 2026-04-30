const fs = require('fs');
const content = fs.readFileSync('src/wallet/screens/WalletScreen.tsx', 'utf8');
console.log("-----BEGIN-----");
console.log(content.substring(500, 3000));
console.log("-----END-----");
