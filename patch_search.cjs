const fs = require('fs');
let code = fs.readFileSync('src/components/NewChatModal.tsx', 'utf8');

code = code.replace(
`        // Search by exact username or exact uid
        const q = query(
          usersRef, 
          or(
            where('username', '==', searchQuery),
            where('uid', '==', searchQuery)
          )
        );`,
`        // Use "startsWith" search logic for Firestore
        const searchInput = searchQuery.toLowerCase();
        
        let q;
        if (searchQuery.length > 20) {
          // If it looks like a uid
          q = query(usersRef, where('uid', '==', searchQuery));
        } else {
          q = query(
            usersRef,
            where('username', '>=', searchInput),
            where('username', '<=', searchInput + '\\uf8ff')
          );
        }`
);

fs.writeFileSync('src/components/NewChatModal.tsx', code);
