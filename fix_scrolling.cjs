const fs = require('fs');

const files = [
  'src/wallet/screens/TrendingScreen.tsx',
  'src/wallet/screens/HelpScreen.tsx',
  'src/wallet/screens/SecurityScreen.tsx',
  'src/wallet/screens/BuySellScreen.tsx',
  'src/wallet/screens/DiscoverScreen.tsx',
  'src/wallet/screens/SwapScreen.tsx',
  'src/wallet/screens/WalletScreen.tsx',
  'src/wallet/screens/SettingsScreen.tsx',
  'src/wallet/navigation/WalletNavigator.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace generic pb-20 or pb-something with pb-28
  content = content.replace(/pb-20/g, 'pb-28');
  content = content.replace(/pb-24/g, 'pb-28');

  // Add scrollbar-hide to overflow-y-auto instances if not present
  const regex = /(overflow-y-auto(?![\s\w-]*scrollbar-hide))/g;
  content = content.replace(regex, 'overflow-y-auto scrollbar-hide');

  // Specific screens that might need explicit padding to prevent nav overlap
  if (file.includes('BuySellScreen.tsx')) {
    content = content.replace('pb-12', 'pb-32');
  }
  if (file.includes('DiscoverScreen.tsx')) {
    content = content.replace('pb-12', 'pb-32');
  }
  if (file.includes('SwapScreen.tsx')) {
    content = content.replace('pb-6', 'pb-32'); 
  }
  if (file.includes('WalletScreen.tsx')) {
    content = content.replace('pb-2">', 'pb-32">');
  }
  if (file.includes('SettingsScreen.tsx')) {
    content = content.replace('p-6">', 'p-6 pb-32">');
  }

  if (file.includes('WalletNavigator.tsx')) {
    content = content.replace(/className="h-full"/g, 'className="h-full"');
  }

  fs.writeFileSync(file, content);
}
