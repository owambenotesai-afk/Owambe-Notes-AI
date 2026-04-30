const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

code = code.replace(
`  const signUpWithEmail = async (email: string, password: string, username: string) => {
    // Check if username is unique
    const publicUsersRef = collection(db, 'users_public');
    const q = query(publicUsersRef, where('username', '==', username));`,
`  const signUpWithEmail = async (email: string, password: string, rawUsername: string) => {
    const username = rawUsername.toLowerCase();
    // Check if username is unique
    const publicUsersRef = collection(db, 'users_public');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));`
);

code = code.replace(
`    batch.set(doc(db, 'users', user.uid), {
      uid: user.uid,
      username,`,
`    batch.set(doc(db, 'users', user.uid), {
      uid: user.uid,
      username, // now lowercase`
);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
