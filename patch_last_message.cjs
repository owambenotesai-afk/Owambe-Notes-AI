const fs = require('fs');

// Patch Chats.tsx
let chatsCode = fs.readFileSync('src/pages/Chats.tsx', 'utf8');

chatsCode = chatsCode.replace(
  `msgsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.senderId !== user.uid) {
                  if (data.status === 'sent') {
                    batch.update(docSnap.ref, { 
                      status: 'delivered',
                      deliveredAt: serverTimestamp()
                    });
                    hasUpdates = true;
                  }
                }
              });
              if (hasUpdates) {
                await batch.commit();
              }`,
  `let shouldUpdateLastMessageDelivered = false;
              msgsSnap.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.senderId !== user.uid) {
                  if (data.status === 'sent') {
                    batch.update(docSnap.ref, { 
                      status: 'delivered',
                      deliveredAt: serverTimestamp()
                    });
                    hasUpdates = true;
                    // If this is the last message of the chat, update the chat itself so sender sees ticks
                    if (chat.lastMessage && chat.lastMessage.createdAt && data.createdAt) {
                        try {
                            if (chat.lastMessage.createdAt.toMillis() === data.createdAt.toMillis()) {
                                shouldUpdateLastMessageDelivered = true;
                            }
                        } catch(e) {}
                    }
                  }
                }
              });
              
              if (shouldUpdateLastMessageDelivered) {
                 batch.update(doc(db, 'chats', chat.id), {
                    'lastMessage.status': 'delivered',
                    'lastMessage.deliveredAt': serverTimestamp()
                 });
                 hasUpdates = true;
              }

              if (hasUpdates) {
                await batch.commit();
              }`
);

fs.writeFileSync('src/pages/Chats.tsx', chatsCode);

// Patch ChatView.tsx
let chatViewCode = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

chatViewCode = chatViewCode.replace(
  `messages.forEach(msg => {
      // If we received this message, mark it as seen
      if (msg.senderId !== user.uid && msg.status !== 'seen') {
        const msgRef = doc(db, \`chats/\${chat.id}/messages\`, msg.id);
        updateDoc(msgRef, {
          status: 'seen',
          seenAt: serverTimestamp()
        }).catch(e => console.error(e));
      }
      
      // If we sent this message, check if recipient is online to mark as delivered
      if (!isGroup && otherUser && msg.senderId === user.uid && msg.status === 'sent') {
        if (otherUser.online) {
          const msgRef = doc(db, \`chats/\${chat.id}/messages\`, msg.id);
          updateDoc(msgRef, {
            status: 'delivered',
            deliveredAt: serverTimestamp()
          }).catch(e => console.error(e));
        }
      }
    });`,
  `
    let hasUpdates = false;
    let shouldUpdateLastMsgSeen = false;
    let shouldUpdateLastMsgDelivered = false;

    messages.forEach(msg => {
      // If we received this message, mark it as seen
      if (msg.senderId !== user.uid && msg.status !== 'seen') {
        const msgRef = doc(db, \`chats/\${chat.id}/messages\`, msg.id);
        updateDoc(msgRef, {
          status: 'seen',
          seenAt: serverTimestamp()
        }).catch(e => console.error(e));
        
        if (chat.lastMessage && chat.lastMessage.senderId !== user.uid && chat.lastMessage.status !== 'seen') {
            if (chat.lastMessage.createdAt?.toMillis?.() === msg.createdAt?.toMillis?.() || chat.lastMessage.text === msg.text) {
                shouldUpdateLastMsgSeen = true;
            }
        }
      }
      
      // If we sent this message, check if recipient is online to mark as delivered
      if (!isGroup && otherUser && msg.senderId === user.uid && msg.status === 'sent') {
        if (otherUser.online) {
          const msgRef = doc(db, \`chats/\${chat.id}/messages\`, msg.id);
          updateDoc(msgRef, {
            status: 'delivered',
            deliveredAt: serverTimestamp()
          }).catch(e => console.error(e));
          
          if (chat.lastMessage && chat.lastMessage.senderId === user.uid && chat.lastMessage.status === 'sent') {
              if (chat.lastMessage.createdAt?.toMillis?.() === msg.createdAt?.toMillis?.() || chat.lastMessage.text === msg.text) {
                  shouldUpdateLastMsgDelivered = true;
              }
          }
        }
      }
    });

    if (shouldUpdateLastMsgSeen) {
        updateDoc(doc(db, 'chats', chat.id), {
            'lastMessage.status': 'seen',
            'lastMessage.seenAt': serverTimestamp()
        }).catch(e => console.error(e));
    }
    if (shouldUpdateLastMsgDelivered) {
        updateDoc(doc(db, 'chats', chat.id), {
            'lastMessage.status': 'delivered',
            'lastMessage.deliveredAt': serverTimestamp()
        }).catch(e => console.error(e));
    }
  `
);

fs.writeFileSync('src/components/ChatView.tsx', chatViewCode);

console.log('Patched lastMessage status sync');
