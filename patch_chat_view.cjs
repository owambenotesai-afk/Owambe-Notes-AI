const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// The checkmarks
code = code.replace(
  `{isMine && (
                      msg.readBy?.length > 1 ? <CheckCheck className="w-4 h-4 text-[#00BFA5] dark:text-[#00BFA5]" /> : 
                      msg.deliveredTo?.length > 1 ? <CheckCheck className="w-4 h-4 text-stone-400 dark:text-stone-500" /> : 
                      <Check className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                    )}`,
  `{isMine && (
                      msg.status === 'seen' || msg.readBy?.length > 1 ? <CheckCheck className="w-4 h-4 text-[#00BFA5] dark:text-[#00BFA5]" /> : 
                      msg.status === 'delivered' || msg.deliveredTo?.length > 1 ? <CheckCheck className="w-4 h-4 text-stone-400 dark:text-stone-500" /> : 
                      <Check className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                    )}`
);

// Status insertion inside handleSendMessage
code = code.replace(
  `deliveredTo: [user.uid],
        status: 'sent',
        seen: false`,
  `status: 'sent',
        deliveredAt: null,
        seenAt: null`
);

code = code.replace(
  `deliveredTo: [user.uid],
        status: 'sent'`,
  `status: 'sent',
        deliveredAt: null,
        seenAt: null`
);

// We need to inject the status effect and the typing sound.
// Let's find: `useEffect(() => {
//    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
//  }, [messages]);`

const effectToAdd = `
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing sound effect
  const typingSound = useRef(new Audio("data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//+7kAAAAAAAAAAAAAAAAAAAAAAABMYXZjNTguMTM0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAADg5yP0AAAAAAAAAAAAAAAAAAAA//MUxAAAAANIgAAAAAAA0gAAAAATEFNRTMuMTAwA8IAAAAAAAAAAIAgAECQgQAAoAAASAAA4Ocj9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxBQAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxEQAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUxHAAABMIgAAAAAAA0gAAAAATEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="));
  useEffect(() => {
    typingSound.current.loop = true;
    if (typingUsers.length > 0) {
      typingSound.current.play().catch(() => {});
    } else {
      typingSound.current.pause();
      typingSound.current.currentTime = 0;
    }
  }, [typingUsers.length]);

  // Message status update effect
  useEffect(() => {
    if (!messages || messages.length === 0 || !user || !chat) return;

    messages.forEach(msg => {
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
    });
  }, [messages, otherUser?.online, user?.uid, chat?.id, isGroup]);
`;

code = code.replace(
  `  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);`,
  effectToAdd
);

// We should also replace the readBy references to avoid rules errors if we don't have readBy in other updates.
// We'll leave it in handleSendMessage but remove "readBy: [user.uid]," if possible.
code = code.replace(
  `readBy: [user.uid],
        status: 'sent',`,
  `status: 'sent',`
);

fs.writeFileSync('src/components/ChatView.tsx', code);
console.log('Patched');
