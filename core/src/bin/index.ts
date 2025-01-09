#!/usr/bin/env node

import { Command } from 'commander';
import { check } from './check';

const program = new Command();

// 设置版本号（从 package.json 中获取）
program.version(require('../../package.json').version);

// 添加 check 命令
program
  .command('check')
  .description('Run check command')
  .action(async () => {
    await check();
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有任何命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
