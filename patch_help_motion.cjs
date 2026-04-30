const fs = require('fs');
let code = fs.readFileSync('src/wallet/screens/HelpScreen.tsx', 'utf8');

if (!code.includes('framer-motion')) {
  code = code.replace(
    'import {',
    'import { motion } from "framer-motion";\nimport {'
  );

  code = code.replace(
    '<div className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full animate-in slide-in-from-right-4">',
    '<motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">'
  );

  code = code.replace(
    '</div>\n  );\n};',
    '    </motion.div>\n  );\n};'
  );
  
  fs.writeFileSync('src/wallet/screens/HelpScreen.tsx', code);
}
