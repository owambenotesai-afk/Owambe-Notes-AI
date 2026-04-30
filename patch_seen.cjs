const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

code = code.replace(
`          batch.update(docSnap.ref, { 
            readBy: [...readBy, user.uid],
            status: 'read'
          });`,
`          batch.update(docSnap.ref, { 
            readBy: [...readBy, user.uid],
            status: 'read',
            seen: true
          });`
);

fs.writeFileSync('src/components/ChatView.tsx', code);
