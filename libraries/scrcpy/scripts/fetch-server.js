#!/usr/bin/env node

const { fetchVersion } = require('gh-release-fetch');
const path = require('path');
const fs = require('fs').promises;

(async () => {
    const serverVerision = process.argv[2];
    console.log(`Downloading Scrcpy server binary version ${serverVerision}...`);

    const binFolder = path.resolve(__dirname, '..', 'bin');

    await fetchVersion({
        repository: 'Genymobile/scrcpy',
        version: `v${serverVerision}`,
        package: `scrcpy-server-v${serverVerision}`,
        destination: binFolder,
        extract: false,
    });

    await fs.rename(
        path.resolve(binFolder, `scrcpy-server-v${serverVerision}`),
        path.resolve(binFolder, 'scrcpy-server')
    );

    fs.writeFile(path.resolve(binFolder, 'version.js'), `export default '${serverVerision}';`);
    fs.writeFile(path.resolve(binFolder, 'version.d.ts'), `export default '${serverVerision}';`);
})();
