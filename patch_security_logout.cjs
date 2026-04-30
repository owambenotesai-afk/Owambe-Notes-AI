const fs = require('fs');
let code = fs.readFileSync('src/wallet/screens/SecurityScreen.tsx', 'utf8');

if (!code.includes('useAuth')) {
  code = code.replace(
    'import { walletService } from "../services/walletService";',
    'import { walletService } from "../services/walletService";\nimport { useAuth } from "../../contexts/AuthContext";'
  );

  code = code.replace(
    'const [revealedSeed, setRevealedSeed] = useState("");',
    'const [revealedSeed, setRevealedSeed] = useState("");\n  const { logOut: firebaseLogOut } = useAuth();'
  );

  const lockSessionReplacement = `            <button onClick={onLogout} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Lock Session</p>
                  <p className="text-xs text-gray-500">Require PIN to re-enter</p>
                </div>
              </div>
            </button>
            <button onClick={firebaseLogOut} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm text-white">Log Out</p>
                  <p className="text-xs text-gray-500">Sign out of app account</p>
                </div>
              </div>
            </button>`;

  const lockSessionRegex = /<button onClick=\{onLogout\} className="w-full flex items-center justify-between p-4[\s\S]*?<\/button>/;
  code = code.replace(lockSessionRegex, lockSessionReplacement);

  fs.writeFileSync('src/wallet/screens/SecurityScreen.tsx', code);
}
