import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

const MODULES_PATH = 'src/modules';
const OUTPUT_FILE = 'src/entities.ts';

/**
 * 生成 entities.ts 文件
 */
export function generateEntitiesFile() {
  // 扫描所有的 ts 文件
  const entityFiles = glob.sync('*/entity/**/*.ts', {
    cwd: MODULES_PATH,
    absolute: true,
  });

  // 生成导入语句和导出数组
  const imports = entityFiles.map((file, index) => {
    const relativePath = path
      .relative(path.dirname(OUTPUT_FILE), file)
      .split(path.sep)
      .join('/');
    return `import * as entity${index} from './${relativePath.replace(
      /\.ts$/,
      ''
    )}';`;
  });

  const exportEntities = `export const entities = [
  ${entityFiles
    .map((_, index) => `...Object.values(entity${index})`)
    .join(',\n  ')},
];`;

  // 生成最终的文件内容
  const fileContent = `// 自动生成的文件，请勿手动修改
${imports.join('\n')}
${exportEntities}
`;

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, fileContent);
  console.log('Entities file generated successfully!');
}

/**
 * 清空 entities.ts 文件
 */
export function clearEntitiesFile() {
  const emptyContent = `// 自动生成的文件，请勿手动修改
export const entities = [];
`;
  fs.writeFileSync(OUTPUT_FILE, emptyContent);
  console.log('Entities file cleared successfully!');
}
