/**
 * Location 工具类
 */
class LocationUtil {
  private locationCache = new Map<string, any>();

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
        if (!fileName) continue;
        
        const content = require('fs').readFileSync(fileName, 'utf-8');
        if (content.includes(`class ${targetName}`)) {
          targetFile = {
            path: fileName,
            line: site.getLineNumber(),
            column: site.getColumnNumber(),
            source: `file://${fileName}`
          };
          this.locationCache.set(targetName, targetFile);
          break;
        }
      }
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }

    return targetFile;
  }
}

// 不再需要单例模式，直接导出实例即可
export default new LocationUtil();
