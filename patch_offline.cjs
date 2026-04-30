const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');

if (!code.includes('enableIndexedDbPersistence')) {
code = code.replace(
`import { getFirestore, collection, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setLogLevel } from 'firebase/firestore';`,
`import { getFirestore, collection, doc, setDoc, getDoc, getDocFromServer, getDocs, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, setLogLevel, enableIndexedDbPersistence } from 'firebase/firestore';`
);

code = code.replace(
`console.log('Firestore initialized successfully');`,
`console.log('Firestore initialized successfully');
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.log('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.log('The current browser does not support all of the features required to enable persistence');
  }
});`
);
fs.writeFileSync('src/firebase.ts', code);
}
