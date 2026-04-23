const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);
const isDev = args.includes('--dev');
const extOnly = args.includes('--ext-only');

const copyAssets = () => {
  // Ensure output directories exist
  if (!fs.existsSync('docs')) fs.mkdirSync('docs', { recursive: true });
  if (!fs.existsSync('dist-ext')) fs.mkdirSync('dist-ext', { recursive: true });

  // Web assets
  if (!extOnly) {
    const webFiles = ['index.html', 'login.html', 'signup.html', 'dashboard.html', 'timer.html', 'styles.css'];
    webFiles.forEach(f => {
      if (fs.existsSync(`src/${f}`)) fs.copyFileSync(`src/${f}`, `docs/${f}`);
    });
  }

  // Extension assets
  if (fs.existsSync('extension/manifest.json')) fs.copyFileSync('extension/manifest.json', 'dist-ext/manifest.json');
  if (fs.existsSync('extension/popup.html')) fs.copyFileSync('extension/popup.html', 'dist-ext/popup.html');
  if (fs.existsSync('extension/popup.css')) fs.copyFileSync('extension/popup.css', 'dist-ext/popup.css');
  if (fs.existsSync('extension/blocked.html')) fs.copyFileSync('extension/blocked.html', 'dist-ext/blocked.html');
  if (fs.existsSync('extension/blocked.css')) fs.copyFileSync('extension/blocked.css', 'dist-ext/blocked.css');
};

const buildOptions = {
  webDashboard: {
    entryPoints: ['src/app.ts'],
    bundle: true,
    outfile: 'docs/app.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  webAuth: {
    entryPoints: ['src/auth.ts'],
    bundle: true,
    outfile: 'docs/auth.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  webTimer: {
    entryPoints: ['src/timer-page.ts'],
    bundle: true,
    outfile: 'docs/timer-page.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  extBackground: {
    entryPoints: ['extension/background.ts'],
    bundle: true,
    outfile: 'dist-ext/background.js',
    format: 'esm', // Background service workers use ES modules in MV3
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  extPopup: {
    entryPoints: ['extension/popup.ts'],
    bundle: true,
    outfile: 'dist-ext/popup.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  extBlocked: {
    entryPoints: ['extension/blocked.ts'],
    bundle: true,
    outfile: 'dist-ext/blocked.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  },
  extContent: {
    entryPoints: ['extension/content.ts'],
    bundle: true,
    outfile: 'dist-ext/content.js',
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
  }
};

async function run() {
  copyAssets();

  const contexts = [];
  
  if (!extOnly) {
    contexts.push(await esbuild.context(buildOptions.webDashboard));
    contexts.push(await esbuild.context(buildOptions.webAuth));
    contexts.push(await esbuild.context(buildOptions.webTimer));
  }
  contexts.push(await esbuild.context(buildOptions.extBackground));
  contexts.push(await esbuild.context(buildOptions.extPopup));
  contexts.push(await esbuild.context(buildOptions.extBlocked));
  contexts.push(await esbuild.context(buildOptions.extContent));

  if (isDev) {
    console.log('Watching for changes...');
    for (const ctx of contexts) {
      await ctx.watch();
    }

    // Serve docs folder on port 3000
    const serve = spawn('npx', ['serve', 'docs', '-p', '3000'], { stdio: 'inherit', shell: true });
    
    // Simple custom watcher for non-ts files
    fs.watch('src', (eventType, filename) => {
      if (filename.endsWith('.html') || filename.endsWith('.css')) copyAssets();
    });
    fs.watch('extension', (eventType, filename) => {
      if (filename.endsWith('.html') || filename.endsWith('.css') || filename.endsWith('.json')) copyAssets();
    });

    process.on('SIGINT', () => {
      serve.kill();
      process.exit();
    });
  } else {
    for (const ctx of contexts) {
      await ctx.rebuild();
      await ctx.dispose();
    }
    console.log('Build complete!');
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
