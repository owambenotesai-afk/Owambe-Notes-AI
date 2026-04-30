const fs = require('fs');
let code = fs.readFileSync('src/components/NewChatModal.tsx', 'utf8');

code = code.replace(
`          .map(doc => ({ uid: doc.id, ...doc.data() } as any))`,
`          .map(doc => ({ uid: doc.id, ...(doc.data() as any) }))`
);

fs.writeFileSync('src/components/NewChatModal.tsx', code);
