const fs = require('fs');

let file = 'src/components/CallModal.tsx';
let code = fs.readFileSync(file, 'utf8');
let originalCode = code;

code = code.replace(
  `            setCallStatus('accepted');\n          }\n        });`,
  `            setCallStatus('accepted');\n          }\n        }, (error) => console.error('call status error', error));`
);

code = code.replace(
  `              pc.addIceCandidate(candidate);\n            }\n          });\n        });`,
  `              pc.addIceCandidate(candidate);\n            }\n          });\n        }, (error) => console.error('receiver cand error', error));`
);

code = code.replace(
  `            await updateDoc(callDocRef, { answer });\n          }\n        });`,
  `            await updateDoc(callDocRef, { answer });\n          }\n        }, (error) => console.error('receiver logic error', error));`
);

code = code.replace(
  `              pc.addIceCandidate(candidate);\n            }\n          });\n        });\n      }`,
  `              pc.addIceCandidate(candidate);\n            }\n          });\n        }, (error) => console.error('caller cand error', error));\n      }`
);

if (code !== originalCode) {
  fs.writeFileSync(file, code);
  console.log(`Patched CallModal.tsx`);
} else {
  console.log('No changes made to CallModal.tsx!!!');
}
