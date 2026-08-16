const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Ensure public directory exists
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const output = fs.createWriteStream(path.join(publicDir, 'source.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('error', function(err) {
  console.error('Failed to write source.zip:', err.message);
  process.exit(1);
});

output.on('close', function() {
  console.log('📦 Source code zipped successfully: ' + archive.pointer() + ' total bytes');
});

archive.on('error', function(err) {
  console.error('Archive error:', err.message);
  process.exit(1);
});

archive.pipe(output);

// Files to include
const rootDir = path.join(__dirname, '..');

function addFileIfExists(relPath, name) {
    const abs = path.join(rootDir, relPath);
    if (!fs.existsSync(abs)) {
        console.warn('Skipping missing file: ' + relPath);
        return;
    }
    archive.file(abs, { name: name || relPath });
}

// Add specific files from root
addFileIfExists('package.json');
addFileIfExists('main.js');
addFileIfExists('preload.js');
addFileIfExists('tsconfig.json'); // If exists
addFileIfExists('tailwind.config.js');
addFileIfExists('spatiflac-extension-runtime.js');
addFileIfExists('sflx-http-worker.js');
addFileIfExists('sflx-extension-worker.js');
addFileIfExists('README.md');

// Add Directories
archive.directory(path.join(rootDir, 'src/'), 'src');
archive.directory(path.join(rootDir, 'public/'), 'public', (entry) => {
    // Exclude the zip file itself if it exists to avoid recursion loop
    return entry.name === 'source.zip' ? false : entry;
});
archive.directory(path.join(rootDir, 'scripts/'), 'scripts');

// Finalize
archive.finalize();