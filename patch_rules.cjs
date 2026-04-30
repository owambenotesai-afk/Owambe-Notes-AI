const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// Replace users block
code = code.replace(/match \/users\/\{userId\} \{[\s\S]*?match \/notes\/\{noteId\}/g, `match /users/{userId} {
      allow read, write: if request.auth != null;

      match /notes/{noteId}`);

// Replace chats block
code = code.replace(/match \/chats\/\{chatId\} \{[\s\S]*?match \/calls\/\{callId\}/g, `match /chats/{chatId} {
      allow read, write: if request.auth != null;
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }

    match /calls/{callId}`);
fs.writeFileSync('firestore.rules', code);
