#!/usr/bin/env node
const args = process.argv.slice(2); // 去掉数组的前两个元素

// 发布
if(args.includes('--release')){
    require('./release.js');
}

// 打包
if(args.includes('--build')){
    require('./build.js');
}