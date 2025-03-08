import { MidwayCache } from "@midwayjs/cache-manager";
import { IMidwayContext, IMidwayApplication } from "@midwayjs/core";
import { CoolCacheStore, FsCacheStore } from "./cache/store";

// 文件上传
export * from "./hook/upload";

// 异常处理
export * from "./exception/base";
export * from "./exception/comm";
export * from "./exception/core";
export * from "./exception/validate";

// 全局参数
export * from "./constant/global";

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
  /** 缓存 */
  cache: FsCacheStore | MidwayCache;
  /** 插件 */
  pluginService: PluginService;
  /** 基础目录位置 */
  baseDir: string;

  setCtx(ctx: IMidwayContext) {
    this.ctx = ctx;
  }

  setApp(app: IMidwayApplication) {
    this.app = app;
    this.baseDir = app.getBaseDir();
    this.configDir();
  }

  constructor() {}

  /**
   * 获得App级别的实例
   * @param name
   * @returns
   */
  async getAppInstance(name: string) {
    return await this.app.getApplicationContext().getAsync(name);
  }

  /**
   * 获得请求级别的实例
   * @param name
   * @returns
   */
  async getCtxInstance(name: string) {
    return await this.ctx.requestContext.getAsync(name);
  }

  /**
   * 初始化插件
   * @param pluginInfo
   * @param ctx
   * @param app
   */
  async init(
    pluginInfo: PluginInfo,
    ctx?: IMidwayContext,
    app?: IMidwayApplication,
    other?: any
  ) {
    this.pluginInfo = pluginInfo;
    this.ctx = ctx;
    this.app = app;
    this.baseDir = process.cwd();
    if (this.app) {
      this.baseDir = this.app?.getBaseDir();
    }
    this.configDir();
    this.cache = CoolCacheStore({});
    if (other) {
      this.cache = other.cache;
      this.pluginService = other.pluginService;
    }
    await this.ready();
  }

  /**
   * 处理配置目录
   */
  private configDir() {
    // 替换\为/
    this.baseDir = this.baseDir.replace(/\\/g, "/");
    let config = this.pluginInfo.config || {};
    config = JSON.stringify(config);
    this.pluginInfo.config = JSON.parse(
      config.replace(/@baseDir/g, this.baseDir)
    );
  }

  /**
   * 插件就绪
   */
  async ready() {}
}

/**
 * 插件服务
 */
export declare class PluginService {
  /**
   * 调用插件
   * @param key 插件key
   * @param method 方法
   * @param params 参数
   * @returns
   */
  invoke(key: string, method: string, ...params: any[]): Promise<any>;
  /**
   * 获得插件实例
   * @param key
   * @returns
   */
  getInstance(key: string): Promise<any>;
  /**
   * 检查状态
   * @param key
   */
  checkStatus(key: string): Promise<void>;
}
