import { Configuration } from '@midwayjs/core';
import * as DefaultConfig from './config/config.default';

@Configuration({
  namespace: 'cool',
  importConfigs: [
    {
      default: DefaultConfig,
    },
  ],
})
export class BookConfiguration {
  async onReady() {
    // TODO something
  }
}
