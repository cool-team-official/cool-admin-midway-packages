#!/usr/bin/env node

import { Command } from 'commander';
import { check } from './check';
import { generateEntitiesFile } from './entity';
import { obfuscate } from './obfuscate';
const program = new Command();

// 设置版本号（从 package.json 中获取）
program.version(require('../../package.json').version);

// 修改命令定义部分
const commands = {
  check: async () => await check(),
  entity: async () => await generateEntitiesFile(),
  obfuscate: async () => await obfuscate(),
};

// 移除原有的单独命令定义
program
  .arguments('[cmds...]')
  .description('Run one or multiple commands: check, entity, obfuscate')
  .action(async (cmds: string[]) => {
    if (!cmds.length) {
      program.outputHelp();
      return;
    }

    for (const cmd of cmds) {
      if (cmd in commands) {
        console.log(`Executing ${cmd}...`);
        await commands[cmd]();
      } else {
        console.error(`Unknown command: ${cmd}`);
      }
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有任何命令，显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
