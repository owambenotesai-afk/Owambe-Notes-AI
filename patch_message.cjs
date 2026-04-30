const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

code = code.replace(
`      const messageData: any = {
        senderId: user.uid,
        text: messageText,
        type: messageType,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
        deliveredTo: [user.uid],
        status: 'sent'
      };`,
`      const messageData: any = {
        senderId: user.uid,
        text: messageText,
        type: messageType,
        createdAt: serverTimestamp(),
        readBy: [user.uid],
        deliveredTo: [user.uid],
        status: 'sent',
        seen: false
      };`
);

fs.writeFileSync('src/components/ChatView.tsx', code);
