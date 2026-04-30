const fs = require('fs');
let code = fs.readFileSync('src/wallet/navigation/WalletNavigator.tsx', 'utf8');

if (!code.includes('BuySellScreen')) {
  code = code.replace(
    'import { SettingsScreen } from "../screens/SettingsScreen";',
    'import { SettingsScreen } from "../screens/SettingsScreen";\nimport { BuySellScreen } from "../screens/BuySellScreen";'
  );
}

if (!code.includes('CreditCard')) {
  code = code.replace(
    'import { Wallet, SplitSquareHorizontal, Compass, Settings } from "lucide-react";',
    'import { Wallet, SplitSquareHorizontal, Compass, Settings, CreditCard } from "lucide-react";'
  );
}

if (!code.includes('id: "buysell"')) {
  code = code.replace(
    /const tabs = \[[\s\S]*?\] as const;/, 
    `const tabs = [
    { id: "wallet", icon: Wallet, label: "Home" },
    { id: "swap", icon: SplitSquareHorizontal, label: "Swap" },
    { id: "buysell", icon: CreditCard, label: "Buy/Sell" },
    { id: "discover", icon: Compass, label: "Discover" },
    { id: "settings", icon: Settings, label: "Settings" },
  ] as const;`
  );
}

if (!code.includes('activeTab === "buysell"')) {
  code = code.replace(
    '{activeTab === "discover" && <DiscoverScreen />}',
    '{activeTab === "buysell" && <BuySellScreen />}\n            {activeTab === "discover" && <DiscoverScreen />}'
  );
}

fs.writeFileSync('src/wallet/navigation/WalletNavigator.tsx', code);
