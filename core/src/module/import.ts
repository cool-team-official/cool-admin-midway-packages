import { ILogger, IMidwayApplication, Scope, ScopeEnum } from '@midwayjs/core';
import { App, Config, Inject, Logger, Provide } from '@midwayjs/core';
import { InjectDataSource, TypeORMDataSourceManager } from '@midwayjs/typeorm';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as path from 'path';
import { DataSource, Equal } from 'typeorm';
import { CoolEventManager } from '../event';
import { CoolModuleConfig } from './config';
import { CoolModuleMenu } from './menu';
import location from '../util/location';

/**
 * 模块sql
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolModuleImport {
  @Config('typeorm.dataSource')
  ormConfig;

  @InjectDataSource('default')
  defaultDataSource: DataSource;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  @Config('cool')
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

  initJudge: 'file' | 'db';

  /**
   * 初始化
   */
  async init() {
    this.initJudge = this.coolConfig.initJudge;
    if (!this.initJudge) {
      this.initJudge = 'file';
    }
    // 是否需要导入
    if (this.coolConfig.initDB) {
      const modules = this.coolModuleConfig.modules;
      if (!modules || modules.length === 0) return;
      const metadatas = await this.getDbMetadatas();
      setTimeout(async () => {
        for (const module of modules) {
          if (this.initJudge == 'file') {
            const { exist, lockPath } = this.checkFileExist(module);
            if (!exist) {
              await this.initDataBase(module, metadatas, lockPath);
            }
          }
          if (this.initJudge == 'db') {
            const exist = await this.checkDbExist(module, metadatas);
            if (!exist) {
              await this.initDataBase(module, metadatas);
            }
          }
        }
        this.coolEventManager.emit('onDBInit', {});
        this.coolModuleMenu.init();
      }, 2000);
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
    const cKey = `init_db_${module}`;
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
      'db'
    );
    if (!fs.existsSync(importLockPath)) {
      fs.mkdirSync(importLockPath, { recursive: true });
    }
    const lockPath = path.join(importLockPath, module + '.db.lock');
    return {
      exist: fs.existsSync(lockPath),
      lockPath,
    };
  }

  /**
   * 导入数据库
   * @param module
   * @param lockPath 锁定导入
   */
  async initDataBase(module: string, metadatas, lockPath?: string) {
    // 计算耗时
    const startTime = new Date().getTime();
    // 模块路径
    const modulePath = `${location.getRunPath()}/modules/${module}`;
    // 数据路径
    const dataPath = `${modulePath}/db.json`;
    // 判断文件是否存在
    if (fs.existsSync(dataPath)) {
      // 读取数据
      const data = JSON.parse(fs.readFileSync(dataPath).toString() || '{}');
      // 导入数据
      for (const key in data) {
        try {
          for (const item of data[key]) {
            await this.importData(metadatas, item, key);
          }
        } catch (e) {
          this.coreLogger.error(
            '\x1B[36m [cool:core] midwayjs cool core init ' +
              module +
              ' database err \x1B[0m'
          );
          continue;
        }
      }
      const endTime = new Date().getTime();
      await this.lockImportData(
        module,
        metadatas,
        lockPath,
        endTime - startTime
      );
      this.coreLogger.info(
        '\x1B[36m [cool:core] midwayjs cool core init ' +
          module +
          ' database complete \x1B[0m'
      );
    }
  }

  /**
   * 锁定导入
   * @param module
   * @param metadatas
   * @param lockPath
   * @param time
   */
  async lockImportData(
    module: string,
    metadatas,
    lockPath: string,
    time: number
  ) {
    if (this.initJudge == 'file') {
      fs.writeFileSync(lockPath, `time consuming：${time}ms`);
    }
    if (this.initJudge == 'db') {
      const repository = this.defaultDataSource.getRepository(
        metadatas['base_sys_conf']
      );
      if (this.ormConfig.default.type == 'postgres') {
        await repository.save(
          repository.create({
            cKey: `init_db_${module}`,
            cValue: `time consuming：${time}ms`,
          })
        );
      } else {
        await repository.insert({
          cKey: `init_db_${module}`,
          cValue: `time consuming：${time}ms`,
        });
      }
    }
  }

  /**
   * 导入数据
   * @param metadatas
   * @param datas
   * @param tableName
   */
  async importData(
    metadatas: any[],
    item: any,
    tableName: string,
    parentItem: any = null
  ) {
    const repository = this.defaultDataSource.getRepository(
      metadatas[tableName]
    );
    // 处理当前项中的引用
    if (parentItem) {
      for (const key in item) {
        if (typeof item[key] === 'string' && item[key].startsWith('@')) {
          const parentKey = item[key].substring(1); // 移除"@"符号
          if (Object.prototype.hasOwnProperty.call(parentItem, parentKey)) {
            item[key] = parentItem[parentKey];
          }
        }
      }
    }
    // 插入当前项到数据库
    let insertedItem;
    if (this.ormConfig.default.type == 'postgres') {
      insertedItem = await repository.save(repository.create(item));
      if (item.id) {
        await repository.update(insertedItem.id, { id: item.id });
        await this.defaultDataSource.query(
          `SELECT setval('${tableName}_id_seq', (SELECT MAX(id) FROM ${tableName}));`
        );
      }
    } else {
      insertedItem = await repository.insert(item);
    }
    // 递归处理@childDatas
    if (!_.isEmpty(item['@childDatas'])) {
      const childDatas = item['@childDatas'];
      delete item['@childDatas'];
      for (const childKey in childDatas) {
        for (const childItem of childDatas[childKey]) {
          await this.importData(metadatas, childItem, childKey, item);
        }
      }
    }
  }
}
