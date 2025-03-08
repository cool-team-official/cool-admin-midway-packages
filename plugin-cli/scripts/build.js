console.log("cool-plugin-cli run build");

const esbuild = require('esbuild');
const copyPlugin = require('esbuild-plugin-copy').default;
const packageJson = require('../package.json');
const path = require('path');
const fs = require('fs');

const projectRoot = process.cwd();

// 输出目录
const outdir = path.join(projectRoot, 'dist');

// 删除 dist 目录
if (fs.existsSync(outdir)) {
  fs.rmdirSync(outdir, { recursive: true });
}

// 构建
module.exports.result = esbuild.build({
  entryPoints: [path.join(projectRoot, 'src', 'index.ts'), path.join(projectRoot, 'test', 'index.ts')],
  external: Object.keys(packageJson.devDependencies),
  bundle: true,
  platform: 'node',
  outdir,
  plugins: [
    copyPlugin({
      assets: [{
        from: ['./README.md'],
        to: ['./README.md']
      },{
        from: ['./package.json'],
        to: ['./package.json']
      },{
        from: ['./plugin.json'],
        to: ['./plugin.json']
      },{
        from: ['./assets/*'],
        to: ['./assets']
      },{
        from: ['./src/*'],
        to: ['./source']
      }]
    })
  ]
}).catch(() => process.exit(1));

