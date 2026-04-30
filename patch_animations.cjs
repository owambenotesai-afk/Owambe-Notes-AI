const fs = require('fs');
let code = fs.readFileSync('src/wallet/screens/TrendingScreen.tsx', 'utf8');

code = code.replace(
  '<div className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full animate-in slide-in-from-right-4">',
  '<motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">'
);
code = code.replace(
  '</div>\n    </div>\n  );\n};',
  '      </div>\n    </motion.div>\n  );\n};'
);
fs.writeFileSync('src/wallet/screens/TrendingScreen.tsx', code);

code = fs.readFileSync('src/wallet/screens/SecurityScreen.tsx', 'utf8');
code = code.replace(
  '<div className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full animate-in slide-in-from-right-4">',
  '<motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3, ease: "easeOut" }} className="fixed inset-0 z-[200] bg-[#0B0F1A] text-white flex flex-col h-full">'
);
code = code.replace(
  '</div>\n    </div>\n  );\n};',
  '      </div>\n    </motion.div>\n  );\n};'
);
fs.writeFileSync('src/wallet/screens/SecurityScreen.tsx', code);
