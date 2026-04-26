const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const isDev = process.argv.includes("--dev");
const outDir = "dist-ext";

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// Copy static assets
const assets = ["manifest.json", "popup.html", "popup.css", "blocked.html", "blocked.css"];
assets.forEach(asset => {
  const src = path.join("backup/extension", asset);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(outDir, asset));
  }
});

const buildOptions = [
  {
    entryPoints: ["src/extension/background.ts"],
    outfile: path.join(outDir, "background.js"),
    bundle: true,
    format: "esm",
    target: "es2020",
    minify: !isDev,
  },
  {
    entryPoints: ["src/extension/content.ts"],
    outfile: path.join(outDir, "content.js"),
    bundle: true,
    format: "iife",
    target: "es2020",
    minify: !isDev,
  }
];

async function build() {
  for (const opt of buildOptions) {
    if (isDev) {
      const ctx = await esbuild.context(opt);
      await ctx.watch();
    } else {
      await esbuild.build(opt);
    }
  }
  console.log("Extension build complete!");
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
