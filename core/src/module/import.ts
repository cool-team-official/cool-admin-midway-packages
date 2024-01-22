import { ILogger, IMidwayApplication } from "@midwayjs/core";
import {
  App,
  Config,
  Init,
  Inject,
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from "@midwayjs/decorator";
import * as fs from "fs";
import { CoolModuleConfig } from "./config";
import * as path from "path";
import { InjectDataSource, TypeORMDataSourceManager } from "@midwayjs/typeorm";
import { DataSource } from "typeorm";
import { CoolEventManager } from "../event";
import { CoolModuleMenu } from "./menu";
import * as _ from "lodash";

/**
 * 模块sql
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolModuleImport {
  @Config("typeorm.dataSource")
  ormConfig;

  @InjectDataSource("default")
  defaultDataSource: DataSource;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  @Config("cool")
  coolConfig;

  @Logger()
  coreLogger: ILogger;

  @Inject()
  coolModuleConfig: CoolModuleConfig;

  @Inject()
  coolEventManager: CoolEventManager;

  @App()
  app: IMidwayApplication;

  @Inject()
  coolModuleMenu: CoolModuleMenu;

  @Init()
  async init() {
    // 是否需要导入
    if (this.coolConfig.initDB) {
      const modules = this.coolModuleConfig.modules;
      const importLockPath = path.join(
        `${this.app.getBaseDir()}`,
        "..",
        "lock",
        "db"
      );
      if (!fs.existsSync(importLockPath)) {
        fs.mkdirSync(importLockPath, { recursive: true });
      }
      setTimeout(async () => {
        for (const module of modules) {
          const lockPath = path.join(importLockPath, module + ".db.lock");
          if (!fs.existsSync(lockPath)) {
            await this.initDataBase(module, lockPath);
          }
        }
        this.coolEventManager.emit("onDBInit", {});
        this.coolModuleMenu.init();
      }, 2000);
    }
  }

  /**
   * 导入数据库
   * @param module
   * @param lockPath 锁定导入
   */
  async initDataBase(module: string, lockPath: string) {
    // 计算耗时
    const startTime = new Date().getTime();
    // 模块路径
    const modulePath = `${this.app.getBaseDir()}/modules/${module}`;
    // 数据路径
    const dataPath = `${modulePath}/db.json`;
    // 判断文件是否存在
    if (fs.existsSync(dataPath)) {
      // 获得所有的实体
      const entityMetadatas = this.defaultDataSource.entityMetadatas;
      const metadatas = _.mapValues(
        _.keyBy(entityMetadatas, "tableName"),
        "target"
      );
      // 读取数据
      const data = JSON.parse(fs.readFileSync(dataPath).toString() || "{}");
      // 导入数据
      for (const key in data) {
        try {
          const repository = this.defaultDataSource.getRepository(
            metadatas[key]
          );
          if (this.ormConfig.default.type == "postgres") {
            for (const item of data[key]) {
              const result: any = await repository.save(
                repository.create(item)
              );
              if (item.id) {
                await repository.update(result.id, { id: item.id });
                // 更新pgsql序列
                await this.defaultDataSource.query(
                  `SELECT setval('${key}_id_seq', (SELECT MAX(id) FROM ${key}));`
                );
              }
            }
          } else {
            await repository.insert(data[key]);
          }
        } catch (e) {
          this.coreLogger.error(
            "\x1B[36m [cool:core] midwayjs cool core init " +
              module +
              " database err \x1B[0m"
          );
          continue;
        }
      }
      const endTime = new Date().getTime();
      fs.writeFileSync(lockPath, `time consuming：${endTime - startTime}ms`);
      this.coreLogger.info(
        "\x1B[36m [cool:core] midwayjs cool core init " +
          module +
          " database complete \x1B[0m"
      );
    }
  }
}
