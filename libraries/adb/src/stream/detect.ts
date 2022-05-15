// cspell: ignore vercel

// Always use polyfilled version because
// Vercel doesn't support Node.js 16 (`streams/web` module) yet
export * from './detect.polyfill.js';

// export * from './detect.native.js';
