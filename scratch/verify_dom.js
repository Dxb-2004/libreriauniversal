const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/app.js', 'utf8');

// Find all document.getElementById('...') in js/app.js
const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const ids = new Set();
while ((match = regex.exec(js)) !== null) {
  ids.add(match[1]);
}

console.log(`Found ${ids.size} unique getElementById IDs in js/app.js:`);
const missing = [];
ids.forEach(id => {
  if (id.startsWith('line-alerts-')) return; // dynamically generated
  const exists = html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  if (!exists) {
    missing.push(id);
  }
});

if (missing.length === 0) {
  console.log('✅ ALL IDs referenced in js/app.js exist in index.html!');
} else {
  console.error('❌ Missing IDs:', missing);
}
