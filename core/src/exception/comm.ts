import { GlobalConfig } from '../constant/global';
import { BaseException } from './base';

/**
 * 通用异常
 */
export class CoolCommException extends BaseException {
  constructor(message: string, statusCode?: number) {
    const { RESCODE, RESMESSAGE } = GlobalConfig.getInstance();
    super(
      'CoolCommException',
      RESCODE.COMMFAIL,
      message ? message : RESMESSAGE.COMMFAIL,
      statusCode
    );
  }
}
