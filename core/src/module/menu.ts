import { App, Config, ILogger, IMidwayApplication, Inject, Logger, Provide, Scope, ScopeEnum } from "@midwayjs/core";
import * as fs from "fs";
import { CoolModuleConfig } from "./config";
import * as path from "path";
import { CoolConfig } from "../interface";
import { CoolEventManager } from "../event";

/**
 * 菜单
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolModuleMenu {

    @Inject()
    coolModuleConfig: CoolModuleConfig;

    @Config("cool")
    coolConfig: CoolConfig;

    @App()
    app: IMidwayApplication;

    @Logger()
    coreLogger: ILogger;

    @Inject()
    coolEventManager: CoolEventManager;

    async init() {
        // 是否需要导入
        if (this.coolConfig.initMenu) {
          const modules = this.coolModuleConfig.modules;
          const importLockPath = path.join(
            `${this.app.getBaseDir()}`,
            "..",
            "lock"
          );
          if (!fs.existsSync(importLockPath)) {
            fs.mkdirSync(importLockPath);
          }
            for (const module of modules) {
              const lockPath = path.join(importLockPath, module + ".menu.lock");
              if (!fs.existsSync(lockPath)) {
                await this.importMenu(module, lockPath);
              }
            }
            this.coolEventManager.emit("onMenuInit", {});
        }
      }

    /**
     * 导入菜单
     * @param module 
     * @param lockPath 
     */
    async importMenu(module: string, lockPath: string){
        // 模块路径
        const modulePath = `${this.app.getBaseDir()}/modules/${module}`;
        // json 路径
        const menuPath = `${modulePath}/menu.json`;
        // 导入
        if (fs.existsSync(menuPath)) {
            const data = fs.readFileSync(menuPath);
            try {
                this.coolEventManager.emit("onMenuImport", module, JSON.parse(data.toString()));
                fs.writeFileSync(lockPath, data);
            } catch (error) {
                this.coreLogger.error(error);
                this.coreLogger.error(
                    `自动初始化模块[${module}]菜单失败，请检查对应的数据结构是否正确`
                  );
            }
        }
    }
}