import { existsSync, readFileSync, writeFileSync } from 'fs';
import { v4 as uuid } from 'uuid';
import { join } from 'path';

interface CheckConfig {
  path: string;
  pattern: string;
}

/**
 * 检查并替换单个配置文件
 */
async function checkAndReplaceFile(config: CheckConfig): Promise<void> {
  const filePath = join(process.cwd(), config.path);

  if (!existsSync(filePath)) {
    return;
  }

  let content = readFileSync(filePath, 'utf-8');
  if (content.includes(config.pattern)) {
    console.log(`${config.path}，key is default, auto replace it`);
    content = content.replace(config.pattern, uuid());
    writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * 检查配置文件
 */
export async function check() {
  const configs: CheckConfig[] = [
    {
      path: 'src/config/config.default.ts',
      pattern: 'cool-admin-keys-xxxxxx',
    },
    {
      path: 'src/modules/base/config.ts',
      pattern: 'cool-admin-xxxxxx',
    },
    {
      path: 'src/modules/user/config.ts',
      pattern: 'cool-app-xxxxx',
    },
  ];

  await Promise.all(configs.map(config => checkAndReplaceFile(config)));
}
