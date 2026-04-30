const fs = require('fs');
let code = fs.readFileSync('src/components/NewChatModal.tsx', 'utf8');

code = code.replace(
`        onChatCreated({ id: chatDoc.id, ...chatDoc.data() });`,
`        onChatCreated({ id: chatDoc.id, ...chatDoc.data()! });`
);

fs.writeFileSync('src/components/NewChatModal.tsx', code);
