const fs = require('fs');
let content = fs.readFileSync('src/wallet/screens/WalletScreen.tsx', 'utf8');

const lines = content.split('\n');

const newLines = [];
let i = 0;
while (i < lines.length) {
  if (i === 613) {
    newLines.push("      {showConfirmTx && (");
    newLines.push("        <AppLock ");
    newLines.push("          isTransaction");
    newLines.push("          riskLevel={riskAssessment?.isHighRisk ? 'HIGH' : 'LOW'}");
    newLines.push("          actionExplanation={riskAssessment?.actionExplanation}");
    newLines.push("          onCancel={() => setShowConfirmTx(false)}");
    newLines.push("          onUnlock={() => {");
    newLines.push("             setShowConfirmTx(false);");
    newLines.push("             executeSend();");
    newLines.push("          }}");
    newLines.push("        />");
    newLines.push("      )}");
    i = 691;
  } else {
    newLines.push(lines[i]);
    i++;
  }
}

fs.writeFileSync('src/wallet/screens/WalletScreen.tsx', newLines.join('\n'), 'utf8');
console.log("Lines 614-690 perfectly replaced");
