const fs = require('fs');
let code = fs.readFileSync('src/components/NewChatModal.tsx', 'utf8');

const oldLogic = `      // Check if private chat already exists
      const chatsRef = collection(db, 'chats');
      const q = query(
        chatsRef, 
        where('type', '==', 'private'),
        where('participantIds', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(q);
      let existingChat = null;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.participantIds.includes(otherUser.uid)) {
          existingChat = { id: doc.id, ...data };
          break;
        }
      }

      if (existingChat) {
        onChatCreated(existingChat);
        return;
      }

      // Create new private chat
      // Generate a unique chatId by sorting UIDs
      const sortedUids = [user.uid, otherUser.uid].sort();
      const chatId = \`\${sortedUids[0]}_\${sortedUids[1]}\`;`;

const newLogic = `      const sortedUids = [user.uid, otherUser.uid].sort();
      const chatId = \`\${sortedUids[0]}_\${sortedUids[1]}\`;

      // Check if private chat already exists
      const chatDocRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatDocRef);

      if (chatDoc.exists()) {
        onChatCreated({ id: chatDoc.id, ...chatDoc.data() });
        return;
      }`;

code = code.replace(oldLogic, newLogic);
code = code.replace(`import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';`, `import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';`);

fs.writeFileSync('src/components/NewChatModal.tsx', code);
