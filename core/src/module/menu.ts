import {
  App,
  Config,
  ILogger,
  IMidwayApplication,
  Inject,
  Logger,
  Provide,
  Scope,
  ScopeEnum,
} from '@midwayjs/core';
import { InjectDataSource, TypeORMDataSourceManager } from '@midwayjs/typeorm';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import { DataSource, Equal } from 'typeorm';
import { CoolEventManager } from '../event';
import { CoolConfig } from '../interface';
import { CoolModuleConfig } from './config';
import location from '../util/location';

/**
 * 菜单
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolModuleMenu {
  @Inject()
  coolModuleConfig: CoolModuleConfig;

  @Config('cool')
  coolConfig: CoolConfig;

  @App()
  app: IMidwayApplication;

  @Logger()
  coreLogger: ILogger;

  @Inject()
  coolEventManager: CoolEventManager;

  initJudge: 'file' | 'db';

  @Config('typeorm.dataSource')
  ormConfig;

  @InjectDataSource('default')
  defaultDataSource: DataSource;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  datas = {};

  async init() {
    this.initJudge = this.coolConfig.initJudge;
    if (!this.initJudge) {
      this.initJudge = 'file';
    }
    // 是否需要导入
    if (this.coolConfig.initMenu) {
      const modules = this.coolModuleConfig.modules;
      const metadatas = await this.getDbMetadatas();
      for (const module of modules) {
        if (this.initJudge == 'file') {
          const { exist, lockPath } = this.checkFileExist(module);
          if (!exist) {
            await this.importMenu(module, metadatas, lockPath);
          }
        }
        if (this.initJudge == 'db') {
          const exist = await this.checkDbExist(module, metadatas);
          if (!exist) {
            await this.importMenu(module, metadatas);
          }
        }
      }
      this.coolEventManager.emit('onMenuImport', this.datas);
    }
  }

  /**
   * 导入菜单
   * @param module
   * @param lockPath
   */
  async importMenu(module: string, metadatas, lockPath?: string) {
    // 模块路径
    const modulePath = `${location.getRunPath()}/modules/${module}`;
    // json 路径
    const menuPath = `${modulePath}/menu.json`;
    // 导入
    if (fs.existsSync(menuPath)) {
      const data = fs.readFileSync(menuPath);
      try {
        // this.coolEventManager.emit("onMenuImport", module, JSON.parse(data.toString()));
        this.datas[module] = JSON.parse(data.toString());
        await this.lockImportData(module, metadatas, lockPath);
      } catch (error) {
        this.coreLogger.error(error);
        this.coreLogger.error(
          `自动初始化模块[${module}]菜单失败，请检查对应的数据结构是否正确`
        );
      }
    }
  }

  /**
   * 获取数据库元数据
   */
  async getDbMetadatas() {
    // 获得所有的实体
    const entityMetadatas = this.defaultDataSource.entityMetadatas;
    const metadatas = _.mapValues(
      _.keyBy(entityMetadatas, 'tableName'),
      'target'
    );
    return metadatas;
  }

  /**
   * 检查数据是否存在
   * @param module
   * @param metadatas
   */
  async checkDbExist(module: string, metadatas) {
    const cKey = `init_menu_${module}`;
    const repository = this.defaultDataSource.getRepository(
      metadatas['base_sys_conf']
    );
    const data = await repository.findOneBy({ cKey: Equal(cKey) });
    return !!data;
  }

  /**
   * 检查文件是否存在
   * @param module
   */
  checkFileExist(module: string) {
    const importLockPath = path.join(
      `${location.getRunPath()}`,
      '..',
      'lock',
      'menu'
    );
    if (!fs.existsSync(importLockPath)) {
      fs.mkdirSync(importLockPath, { recursive: true });
    }
    const lockPath = path.join(importLockPath, module + '.menu.lock');
    return {
      exist: fs.existsSync(lockPath),
      lockPath,
    };
  }

  /**
   * 锁定导入
   * @param module
   * @param metadatas
   * @param lockPath
   * @param time
   */
  async lockImportData(module: string, metadatas, lockPath: string) {
    if (this.initJudge == 'file') {
      fs.writeFileSync(lockPath, 'success');
    }
    if (this.initJudge == 'db') {
      const repository = this.defaultDataSource.getRepository(
        metadatas['base_sys_conf']
      );
      if (this.ormConfig.default.type == 'postgres') {
        await repository.save(
          repository.create({
            cKey: `init_menu_${module}`,
            cValue: 'success',
          })
        );
      } else {
        await repository.insert({
          cKey: `init_menu_${module}`,
          cValue: 'success',
        });
      }
    }
  }
}
