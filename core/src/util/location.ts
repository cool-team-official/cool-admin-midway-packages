import { Init, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Location 工具类
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class LocationUtil {
  private locationCache = new Map<string, any>();

  distPath: string;

  @Init()
  async init() {
    this.distPath = this.getRunPath();
  }

  /**
   * 获取编译后的文件路径
   * @returns 编译后的文件路径
   */
  getDistPath(): string {
    return this.distPath;
  }

  /**
   * 获取目标类的定义位置
   * @param target 目标类
   * @returns 目标类的定义位置
   */
  async scriptPath(target: any) {
    const targetName = target.name;

    // 检查缓存
    if (this.locationCache.has(targetName)) {
      return this.locationCache.get(targetName);
    }

    const originalPrepareStackTrace = Error.prepareStackTrace;
    let targetFile;

    try {
      Error.prepareStackTrace = (error, stack) => stack;
      const stack = new Error().stack as any;

      for (const site of stack) {
        const fileName = site.getFileName();
        // 如果文件名不存在，则跳过
        if (!fileName || !fs.existsSync(fileName)) continue;
        if (
          !fileName.includes('/modules/') &&
          !fileName.includes('\\modules\\')
        )
          continue;
        targetFile = {
          path: fileName,
          line: site.getLineNumber(),
          column: site.getColumnNumber(),
          source: `file://${fileName}`,
        };
        this.locationCache.set(targetName, targetFile);
        break;
      }
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }

    return targetFile;
  }

  /**
   * 获取使用此包的项目的真实根目录路径
   * @returns 项目根目录的绝对路径
   */
  getRunPath(): string {
    const err = new Error();
    const callerfile = err.stack.split('\n')[2].match(/\(([^)]+)\)/)[1];
    const dirPath = path.dirname(callerfile);
    const nodeModulesIndex =
      dirPath.indexOf('/node_modules/') !== -1
        ? dirPath.indexOf('/node_modules/')
        : dirPath.indexOf('\\node_modules\\');
    if (nodeModulesIndex !== -1) {
      return path.join(dirPath.substring(0, nodeModulesIndex), 'dist');
    }
    return dirPath;
  }
}

// 不再需要单例模式，直接导出实例即可
export default new LocationUtil();
