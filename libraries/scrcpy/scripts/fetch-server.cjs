#!/usr/bin/env node

const { fetchVersion } = require('gh-release-fetch');
const path = require('path');
const fs = require('fs').promises;

(async () => {
    const serverVersion = process.argv[2];
    console.log(`Downloading Scrcpy server binary version ${serverVersion}...`);

    const binFolder = path.resolve(__dirname, '..', 'bin');

    await fetchVersion({
        repository: 'Genymobile/scrcpy',
        version: `v${serverVersion}`,
        package: `scrcpy-server-v${serverVersion}`,
        destination: binFolder,
        extract: false,
    });

    await fs.rename(
        path.resolve(binFolder, `scrcpy-server-v${serverVersion}`),
        path.resolve(binFolder, 'scrcpy-server')
    );

    fs.writeFile(path.resolve(binFolder, 'version.js'), `export default '${serverVersion}';`);
    fs.writeFile(path.resolve(binFolder, 'version.d.ts'), `export default '${serverVersion}';`);
})();
