import {
  ALL,
  App,
  Config,
  ILifeCycle,
  ILogger,
  IMidwayApplication,
  IMidwayContainer,
  Inject,
  Logger,
  MidwayWebRouterService,
} from '@midwayjs/core';
import { Configuration } from '@midwayjs/core';
import * as DefaultConfig from './config/config.default';
import { CoolExceptionFilter } from './exception/filter';
import { FuncUtil } from './util/func';
import * as koa from '@midwayjs/koa';
import { CoolModuleConfig } from './module/config';
import { CoolModuleImport } from './module/import';
import { CoolEventManager } from './event';
import { CoolEps } from './rest/eps';
import { CoolDecorator } from './decorator';
import * as cache from '@midwayjs/cache-manager';
import { LocationUtil } from './util/location';

@Configuration({
  namespace: 'cool',
  imports: [cache],
  importConfigs: [
    {
      default: DefaultConfig,
    },
  ],
})
export class CoolConfiguration implements ILifeCycle {
  @Logger()
  coreLogger: ILogger;

  @App()
  app: koa.Application;

  @Inject()
  coolEventManager: CoolEventManager;

  @Config(ALL)
  allConfig;

  @Inject()
  webRouterService: MidwayWebRouterService;

  async onReady(container: IMidwayContainer) {
    this.coolEventManager.emit('onReady');
    this.coolEventManager.globalEmit('onReadyOnce', true);
    // 处理模块配置
    await container.getAsync(CoolModuleConfig);
    // 常用函数处理
    await container.getAsync(FuncUtil);
    // 异常处理
    this.app.useFilter([CoolExceptionFilter]);
    // 装饰器
    await container.getAsync(CoolDecorator);
    // 注册一个路由，用于处理静态资源
    this.webRouterService.addRouter(
      async ctx => {
        ctx.redirect('/index.html');
      },
      {
        url: '/',
        requestMethod: 'GET',
      }
    );
  }

  async onConfigLoad(container: IMidwayContainer, app: IMidwayApplication) {
    await container.getAsync(LocationUtil);
    // 替换app的getBaseDir
    app.getBaseDir = () => {
      return container.get(LocationUtil).getDistPath();
    };
  }

  async onServerReady(container: IMidwayContainer) {
    // 事件
    await (await container.getAsync(CoolEventManager)).init();
    // 导入模块数据
    (await container.getAsync(CoolModuleImport)).init();
    // 实体与路径
    const eps: CoolEps = await container.getAsync(CoolEps);
    eps.init();
    await this.eventInit();
  }

  /**
   * 事件初始化
   */
  async eventInit() {
    this.coolEventManager.emit('onServerReady');
    const env = this.app.getEnv();
    const isMainProcess = process.env.NODE_APP_INSTANCE == '0';
    if (env == 'local' || isMainProcess) {
      this.coolEventManager.globalEmit('onServerReadyOnce', true);
    }
  }
}
