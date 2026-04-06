const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace primary button classes
  content = content.replace(/bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900/g, 'bg-[#00BFA5] text-white');
  content = content.replace(/bg-stone-900 dark:bg-stone-100/g, 'bg-[#00BFA5]');
  content = content.replace(/text-white dark:text-stone-900/g, 'text-white');
  content = content.replace(/hover:bg-stone-800 dark:hover:bg-stone-200/g, 'hover:bg-[#00A892]');
  content = content.replace(/hover:bg-stone-800 dark:hover:bg-white/g, 'hover:bg-[#00A892]');
  content = content.replace(/border-stone-900 dark:border-stone-100/g, 'border-[#00BFA5]');
  content = content.replace(/focus:ring-stone-900 dark:focus:ring-stone-100/g, 'focus:ring-[#00BFA5]');
  content = content.replace(/focus:ring-stone-900/g, 'focus:ring-[#00BFA5]');
  
  // Also replace bg-stone-800 dark:bg-stone-200 (secondary buttons)
  content = content.replace(/bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900/g, 'bg-[#00A892] text-white');
  content = content.replace(/hover:bg-stone-700 dark:hover:bg-stone-300/g, 'hover:bg-[#009688]');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
