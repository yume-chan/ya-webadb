const { fetchVersion } = require('gh-release-fetch');
const path = require('path');
const fs = require('fs').promises;

const SERVER_VERSION = '1.19';

(async () => {
    console.log('Downloading scrcpy server binary...');

    const binFolder = path.resolve(__dirname, '..', 'bin');

    await fetchVersion({
        repository: 'Genymobile/scrcpy',
        version: `v${SERVER_VERSION}`,
        package: `scrcpy-server-v${SERVER_VERSION}`,
        destination: binFolder,
        extract: false,
    });

    await fs.rename(
        path.resolve(binFolder, `scrcpy-server-v${SERVER_VERSION}`),
        path.resolve(binFolder, 'scrcpy-server')
    );

    fs.writeFile(path.resolve(__dirname, '..', 'src', 'version.ts'), `export const BUNDLED_SERVER_VERSION = "${SERVER_VERSION}";`);
})();
