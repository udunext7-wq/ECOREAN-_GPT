const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '..', 'ui', 'dist');
const targetDir = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(path.join(sourceDir, 'index.html'))) {
  throw new Error(`UI build output not found: ${sourceDir}`);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied UI dist to ${targetDir}`);
