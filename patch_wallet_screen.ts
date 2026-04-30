import * as fs from 'fs';

const path = 'src/wallet/screens/WalletScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Inject imports if not present
if (!content.includes('RiskAssessment')) {
  content = content.replace(
    'import { analyticsService } from "../services/analyticsService";',
    'import { analyticsService } from "../services/analyticsService";\nimport { securityEngine, RiskAssessment } from "../services/securityEngine";'
  );
}

if (!content.includes('import {') || !content.includes(', Info')) {
  // Try adding Info to lucide-react import
  content = content.replace(
    /import \{\s*([^}]*?)\s*\}\s*from "lucide-react";/,
    (match, imports) => {
      if (!imports.includes('Info')) {
        return `import { ${imports}, Info } from "lucide-react";`;
      }
      return match;
    }
  );
}

// Add AppLock import just in case
if (!content.includes('AppLock')) {
  content = content.replace(
    'import { QrScannerModal } from "../components/QrScannerModal";',
    'import { QrScannerModal } from "../components/QrScannerModal";\nimport { AppLock } from "../components/AppLock";'
  );
}

// Ensure securityEngine.analyzeTransaction uses a valid format
// E.g., make sure we use AppLock for Transactions
// Wait, the prompt requested: "Require 4-digit PIN for transactions only" 
// Let's replace the whole Confirm Transaction modal with our AppLock if it is ConfirmTX
content = content.replace(
  /<div className="fixed inset-0 z-\[150\].*?Confirm Transaction.*?<\/div>.*?<\/div>.*?<\/div>/s,
  (match) => {
    return `{/* Replaced Confirm Modal with AppLock for transaction pinning */}`;
  }
);

// We need an alternative patching strategy for the Confirm popup.
// To satisfy "Require 4-digit PIN for transactions only":
// We should render <AppLock isTransaction riskLevel={riskAssessment?.isHighRisk ? 'HIGH' : 'LOW'} />
content = content.replace(
  /\{showConfirmTx && \([\s\S]*?\}\)/,
  `{showConfirmTx && (
    <AppLock 
      isTransaction
      riskLevel={riskAssessment?.isHighRisk ? 'HIGH' : 'LOW'}
      actionExplanation={riskAssessment?.actionExplanation}
      onCancel={() => setShowConfirmTx(false)}
      onUnlock={() => {
        setShowConfirmTx(false);
        executeSend();
      }}
    />
  )}`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Patched WalletScreen.tsx');
