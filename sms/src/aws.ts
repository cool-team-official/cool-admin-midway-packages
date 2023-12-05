import { Config, Provide } from '@midwayjs/core';
import { CoolSmsAwsConfig } from './interface';
import { CoolCommException } from '@cool-midway/core';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * 亚马逊云短信
 */
@Provide()
export class SmsAws {
  @Config('cool.sms.aws')
  config: CoolSmsAwsConfig;

  /**
   * 配置
   * @param config
   */
  setConfig(config: CoolSmsAwsConfig) {
    this.config = config;
  }

  /**
   * 发送短信
   * @param phone 手机号
   * @param params 参数
   * @returns
   */
  async send(phone: string, content: string) {
    const { region, accessKeyId, secretAccessKey, extend = {} } = this.config;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new CoolCommException('请配置AWS短信');
    }
    // 配置 AWS
    const client = new SNSClient({
      region, // 例如 'us-east-1'
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...extend,
    });

    const data = {
      Message: content,
      PhoneNumber: phone,
    };
    const result = await client.send(new PublishCommand(data));
    return result;
  }
}
