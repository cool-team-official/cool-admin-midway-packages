import { ILogger } from '@midwayjs/core';
import { Catch, Logger } from '@midwayjs/core';
import { GlobalConfig } from '../constant/global';

/**
 * 全局异常处理
 */
@Catch()
export class CoolExceptionFilter {
  @Logger()
  coreLogger: ILogger;

  async catch(err) {
    const { RESCODE } = GlobalConfig.getInstance();
    this.coreLogger.error(err);
    return {
      code: err.status || RESCODE.COMMFAIL,
      message: err.message,
    };
  }
}
