import { IMidwayContext, IMidwayApplication } from "@midwayjs/core";

/**
 * 插件信息
 */
export interface PluginInfo {
  /** 名称 */
  name: string;
  /** 唯一标识 */
  key: string;
  /** 钩子 */
  hook: string;
  /** 版本 */
  version: string;
  /** 描述 */
  description: string;
  /** 作者 */
  author: string;
  /** logo */
  logo: string;
  /** README 使用说明 */
  readme: string;
  /** 配置 */
  config: any;
}

/**
 * 插件基类，不建议修改
 */
export abstract class BasePlugin {
  /** 插件信息 */
  pluginInfo: PluginInfo;
  /** 请求上下文，用到此项无法本地调试，需安装到cool-admin中才能调试 */
  ctx: IMidwayContext;
  /** 应用实例，用到此项无法本地调试，需安装到cool-admin中才能调试 */
  app: IMidwayApplication;

  setCtx(ctx: IMidwayContext) {
    this.ctx = ctx;
  }

  setApp(app: IMidwayApplication) {
    this.app = app;
  }

  constructor() {}

  /**
   * 初始化插件
   * @param pluginInfo
   * @param ctx
   * @param app
   */
  async init(
    pluginInfo: PluginInfo,
    ctx?: IMidwayContext,
    app?: IMidwayApplication
  ) {
    this.pluginInfo = pluginInfo;
    this.ctx = ctx;
    this.app = app;
  }
}
