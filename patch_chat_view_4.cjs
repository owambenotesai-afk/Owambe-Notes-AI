const fs = require('fs');
let code = fs.readFileSync('src/components/ChatView.tsx', 'utf8');

const oldUnlock = `    // Try unlocking audio context on first user interaction if needed
    const unlockAudio = () => {
      // Just resolving the interaction requirement
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };`;

const newUnlock = `    // Try unlocking audio context on first user interaction if needed
    const unlockAudio = () => {
      // Just resolving the interaction requirement
      if (typingAudioRef.current) {
        typingAudioRef.current.play().then(() => {
          typingAudioRef.current?.pause();
          typingAudioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };`;

code = code.replace(oldUnlock, newUnlock);

fs.writeFileSync('src/components/ChatView.tsx', code);
console.log('Fixed unlock logic');
