const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const JSON5 = require('json5');

const cwd = process.cwd();
const temp = path.resolve(__dirname, '..', 'temp', process.pid.toString());
fs.mkdirSync(temp, { recursive: true });

if (process.argv[2] !== '--incremental') {
    fs.rmSync(path.resolve(cwd, 'cjs'), { force: true, recursive: true });
    fs.rmSync(path.resolve(cwd, 'esm'), { force: true, recursive: true });
    fs.rmSync(path.resolve(cwd, 'dts'), { force: true, recursive: true });
}

const tsconfigPath = path.resolve(cwd, 'tsconfig.json');
const tsconfigValue = JSON5.parse(fs.readFileSync(tsconfigPath), 'utf8');

const cjsTsconfigPath = path.resolve(temp, 'tsconfig.cjs.json');
const cjsTsconfigValue = {
    ...tsconfigValue,
    extends: tsconfigPath,
    compilerOptions: {
        composite: false,
        outDir: path.resolve(cwd, 'cjs'),
        module: 'CommonJS',
        declaration: false,
        declarationDir: null,
        declarationMap: false,
        typeRoots: [
            ...(tsconfigValue.compilerOptions?.typeRoots || []),
            path.resolve(cwd, 'node_modules', '@types'),
            path.resolve(__dirname, '..', 'node_modules', '@types'),
        ],
    },
    references: [],
};
fs.writeFileSync(cjsTsconfigPath, JSON.stringify(cjsTsconfigValue, undefined, 4));

const esmTsconfigPath = path.resolve(temp, 'tsconfig.esm.json');
const testTypes = tsconfigValue.testTypes || ['jest'];
const esmTsconfigValue = {
    ...tsconfigValue,
    extends: tsconfigPath,
    compilerOptions: {
        composite: false,
        outDir: path.resolve(cwd, 'esm'),
        module: 'ESNext',
        types: (tsconfigValue.compilerOptions?.types || []).filter(x => !testTypes.includes(x)),
        typeRoots: [
            ...(tsconfigValue.compilerOptions?.typeRoots || []),
            path.resolve(cwd, 'node_modules', '@types'),
            path.resolve(__dirname, '..', 'node_modules', '@types'),
        ],
    },
    exclude: [
        ...(tsconfigValue.exclude || []).map(x => path.resolve(cwd, x)),
        cwd.replace(/\\/g, '/') + '/src/**/*.spec.ts',
    ],
    references: [],
};
fs.writeFileSync(esmTsconfigPath, JSON.stringify(esmTsconfigValue, undefined, 4));

const tsc = path.resolve(cwd, 'node_modules', '.bin', 'tsc');
const tscResult = childProcess.spawnSync(tsc, ['--build', cjsTsconfigPath, esmTsconfigPath], {
    cwd,
    stdio: 'inherit',
    shell: true,
    windowsHide: true,
});

fs.rmSync(temp, { force: true, recursive: true });

process.exit(tscResult.status);
