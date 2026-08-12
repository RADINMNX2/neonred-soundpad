
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

output.on('close', function() {
  console.log('📦 Source code zipped successfully: ' + archive.pointer() + ' total bytes');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Files to include
const rootDir = path.join(__dirname, '..');

// Add specific files from root
archive.file(path.join(rootDir, 'package.json'), { name: 'package.json' });
archive.file(path.join(rootDir, 'main.js'), { name: 'main.js' });
archive.file(path.join(rootDir, 'preload.js'), { name: 'preload.js' });
archive.file(path.join(rootDir, 'tsconfig.json'), { name: 'tsconfig.json' }); // If exists
archive.file(path.join(rootDir, 'tailwind.config.js'), { name: 'tailwind.config.js' });

// Add Directories
archive.directory(path.join(rootDir, 'src/'), 'src');
archive.directory(path.join(rootDir, 'public/'), 'public', (entry) => {
    // Exclude the zip file itself if it exists to avoid recursion loop
    return entry.name === 'source.zip' ? false : entry;
});
archive.directory(path.join(rootDir, 'scripts/'), 'scripts');

// Finalize
archive.finalize();
