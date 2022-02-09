const fs = require('fs');
const path = require('path');

const PublicFolder = path.resolve(__dirname, '..', 'public');

const SourceFolder = path.dirname(require.resolve('streamsaver'));

const DistFolder = path.resolve(PublicFolder, 'StreamSaver');

if (!fs.existsSync(DistFolder)) {
    fs.mkdirSync(DistFolder);
}

function copyFile(name) {
    fs.copyFileSync(path.resolve(SourceFolder, name), path.resolve(DistFolder, name));
}

copyFile('mitm.html');
copyFile('sw.js');
