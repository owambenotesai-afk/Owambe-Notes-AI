const fs = require('fs');
let code = fs.readFileSync('src/pages/Chats.tsx', 'utf8');

// The checkmarks in Chats.tsx
code = code.replace(
  `{chat.lastMessage.senderId === user.uid && (
                  chat.lastMessage.readBy?.length > 1 ? <CheckCheck className="w-3 h-3 text-emerald-400 dark:text-emerald-500" /> : <Check className="w-3 h-3" />
                )}`,
  `{chat.lastMessage.senderId === user.uid && (
                  chat.lastMessage.status === 'seen' || chat.lastMessage.readBy?.length > 1 ? <CheckCheck className="w-3 h-3 text-[#00BFA5] dark:text-[#00BFA5]" /> : 
                  chat.lastMessage.status === 'delivered' ? <CheckCheck className="w-3 h-3 text-stone-400 dark:text-stone-500" /> : 
                  <Check className="w-3 h-3 text-stone-400 dark:text-stone-500" />
                )}`
);

// Update marking as delivered logic
code = code.replace(
  `const deliveredTo = data.deliveredTo || [];
                  if (!deliveredTo.includes(user.uid)) {
                    batch.update(docSnap.ref, { 
                      deliveredTo: [...deliveredTo, user.uid],
                      status: data.status === 'read' ? 'read' : 'delivered'
                    });
                    hasUpdates = true;
                  }`,
  `if (data.status === 'sent') {
                    batch.update(docSnap.ref, { 
                      status: 'delivered',
                      deliveredAt: serverTimestamp()
                    });
                    hasUpdates = true;
                  }`
);

fs.writeFileSync('src/pages/Chats.tsx', code);
console.log('Patched Chats.tsx');
