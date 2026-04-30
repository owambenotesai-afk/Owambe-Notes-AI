const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

// remove effectToAdd
const effectToAdd = `  // Typing sound effect
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
  }, [messages, otherUser?.online, user?.uid, chat?.id, isGroup]);`;

code = code.replace(effectToAdd, '');

// now insert it correctly after typingUsers
code = code.replace(
  `  const typingUsers = chat?.typing ? Object.entries(chat.typing)
    .filter(([uid, isTyping]) => isTyping && uid !== user?.uid)
    .map(([uid]) => chat.participantNames?.[uid] || 'Someone') : [];`,
  `  const typingUsers = chat?.typing ? Object.entries(chat.typing)
    .filter(([uid, isTyping]) => isTyping && uid !== user?.uid)
    .map(([uid]) => chat.participantNames?.[uid] || 'Someone') : [];\n\n` + effectToAdd
);

fs.writeFileSync('src/components/ChatView.tsx', code);
console.log('Fixed hook position');
