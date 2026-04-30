const fs = require('fs');
let code = fs.readFileSync('src/wallet/screens/SettingsScreen.tsx', 'utf8');

// replace 
const oldLogout = `  const FullPageLogoutButton = () => (
    <button
      onClick={() => {
        // As per prompt: DO NOT delete wallet, only lock session
        onLogout();
      }}
      className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-colors border border-red-500/20 mt-8"
    >
      <div className="flex items-center gap-3">
        <LogOut className="w-5 h-5" />
        <span className="font-medium text-sm">Lock Session</span>
      </div>
      <ChevronRight className="w-4 h-4 opacity-50" />
    </button>
  );`;

code = code.replace(oldLogout, '');

const imports = `import { SecurityScreen } from "./SecurityScreen";
import { TrendingScreen } from "./TrendingScreen";
import { Flame } from "lucide-react";`;

code = code.replace('import { HelpScreen } from "./HelpScreen";', `import { HelpScreen } from "./HelpScreen";\n${imports}`);

code = code.replace(
`  const [showHelp, setShowHelp] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);`,
  `  const [showHelp, setShowHelp] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const [showTrending, setShowTrending] = useState(false);`
);

// We need to strip the Pin Change section from the DOM
const securitySectionRegex = /<section>[\s\S]*?<h3 className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-3 px-1">\s*Security\s*<\/h3>[\s\S]*?<\/section>/;

code = code.replace(securitySectionRegex, `        <section>
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            <button
              onClick={() => setShowTrending(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Trending</p>
                  <p className="text-xs text-gray-500">News, listings & insights</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => setShowSecurity(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Security & Backup</p>
                  <p className="text-xs text-gray-500">PIN, Passphrase, and Lock Session</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <div className="w-full flex items-center justify-between p-4 border-b border-white/5 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Biometric Unlock</p>
                  <p className="text-xs text-gray-500">Face ID / Touch ID (Simulated)</p>
                </div>
              </div>
              <div className="w-10 h-6 bg-emerald-500 rounded-full flex justify-end p-1">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
            </div>
            <div className="w-full flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Auto-Lock Timer</p>
                  <p className="text-xs text-gray-500">Currently fixed to 1 minute</p>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-400/10 px-2 py-1 rounded">Active</span>
            </div>
          </div>
        </section>`);

// Remove the Danger Zone
code = code.replace('{/* Danger Zone */}\n        <FullPageLogoutButton />', '');
code = code.replace('{/* Danger Zone */}\n        <FullPageLogoutButton />\n', '');

// Also remove the pin methods if they are still there
const pinMethodsRegex = /\/\/ Pin Change State[\s\S]*?\} \(\);\s*\}, 2000\);\s*\};/g;
code = code.replace(pinMethodsRegex, '');

// Append Modals
code = code.replace(
  '{showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}',
  `{showHelp && <HelpScreen onClose={() => setShowHelp(false)} />}
      {showTrending && <TrendingScreen onClose={() => setShowTrending(false)} />}
      {showSecurity && <SecurityScreen onClose={() => setShowSecurity(false)} onLogout={onLogout} />}
`
);

fs.writeFileSync('src/wallet/screens/SettingsScreen.tsx', code);
