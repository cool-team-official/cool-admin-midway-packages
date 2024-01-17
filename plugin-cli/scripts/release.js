console.log("cool-plugin-cli run release");

const projectRoot = process.cwd();

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const pluginJson = require(path.join(projectRoot, 'plugin.json'));

const packFolder = (folderPath, outputPath) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    // 创建文件写入流
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // 设置压缩级别
    });

    // 监听关闭事件
    output.on('close', function() {
        console.log(`cool plugin package successfully. Total size: ${archive.pointer()} bytes`);
    });

    // 监听错误事件
    archive.on('error', function(err) {
        throw err;
    });

    // 将压缩内容流连接到文件写入流
    archive.pipe(output);

    // 添加文件夹
    archive.directory(folderPath, false);

    // 完成归档
    archive.finalize();
}

// 打包
const folderPath = path.join(projectRoot, 'dist'); // 替换为你的文件夹路径
const outputPath = path.join(projectRoot, 'release', `${pluginJson.name}_v${pluginJson.version}.cool`); // 替换为你希望创建的 .cool 文件路径

const { result } = require('./build.js');

result.then(()=>{
    packFolder(folderPath, outputPath);
})


