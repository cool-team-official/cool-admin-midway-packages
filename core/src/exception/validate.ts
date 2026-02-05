import { GlobalConfig } from '../constant/global';
import { BaseException } from './base';

/**
 * 校验异常
 */
export class CoolValidateException extends BaseException {
  constructor(message: string, statusCode?: number) {
    const { RESCODE, RESMESSAGE } = GlobalConfig.getInstance();
    super(
      'CoolValidateException',
      RESCODE.VALIDATEFAIL,
      message ? message : RESMESSAGE.VALIDATEFAIL,
      statusCode
    );
  }
}
