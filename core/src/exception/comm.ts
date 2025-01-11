import { GlobalConfig } from '../constant/global';
import { BaseException } from './base';

/**
 * 通用异常
 */
export class CoolCommException extends BaseException {
  constructor(message: string) {
    const { RESCODE, RESMESSAGE } = GlobalConfig.getInstance();
    super(
      'CoolCommException',
      RESCODE.COMMFAIL,
      message ? message : RESMESSAGE.COMMFAIL
    );
  }
}
