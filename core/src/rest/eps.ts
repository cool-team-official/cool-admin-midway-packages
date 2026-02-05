import {
  CONTROLLER_KEY,
  getClassMetadata,
  listModule,
  Provide,
} from '@midwayjs/core';
import * as _ from 'lodash';
import {
  Scope,
  ScopeEnum,
  Config,
  Inject,
  MidwayWebRouterService,
} from '@midwayjs/core';
import { TypeORMDataSourceManager } from '@midwayjs/typeorm';
import { CoolUrlTagData } from '../tag/data';
import { TagTypes } from '../decorator/tag';
import { CurdOption, QueryOp } from '../decorator/controller';

/**
 * 实体路径
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolEps {
  admin = {};

  app = {};

  module = {};

  @Inject()
  midwayWebRouterService: MidwayWebRouterService;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  @Config('cool.eps')
  epsConfig: boolean;

  @Config('module')
  moduleConfig: any;

  @Inject()
  coolUrlTagData: CoolUrlTagData;

  // @Init()
  async init() {
    if (!this.epsConfig) return;
    const entitys = await this.entity();
    const controllers = await this.controller();
    const routers = await this.router();
    await this.modules();
    const adminArr = [];
    const appArr = [];
    for (const controller of controllers) {
      const { prefix, module, curdOption, routerOptions } = controller;
      const pageQueryOp = await this.getPageOp(curdOption);
      const name = curdOption?.entity?.name;
      (_.startsWith(prefix, '/admin/') ? adminArr : appArr).push({
        module,
        info: {
          type: {
            name: prefix.split('/').pop(),
            description: routerOptions?.description || '',
          },
        },
        api: routers[prefix],
        name,
        columns: entitys[name] || [],
        pageQueryOp: {
          keyWordLikeFields:
            pageQueryOp?.keyWordLikeFields?.map(field =>
              field.includes('.') ? field : `a.${field}`
            ) || [],
          fieldEq:
            pageQueryOp?.fieldEq?.map(field =>
              typeof field === 'string'
                ? field.includes('.')
                  ? field
                  : `a.${field}`
                : field
            ) || [],
          fieldLike:
            pageQueryOp?.fieldLike?.map(field =>
              typeof field === 'string'
                ? field.includes('.')
                  ? field
                  : `a.${field}`
                : field
            ) || [],
        },
        pageColumns: await this.pageColumns(entitys, curdOption),
        prefix,
      });
    }
    this.admin = _.groupBy(adminArr, 'module');
    this.app = _.groupBy(appArr, 'module');
  }

  /**
   * 获取分页查询配置
   * @param curdOption
   * @returns
   */
  async getPageOp(curdOption: CurdOption) {
    let pageQueryOp: QueryOp | Function = curdOption?.pageQueryOp;
    if (typeof pageQueryOp === 'function') {
      pageQueryOp = await pageQueryOp();
    }
    return pageQueryOp as QueryOp;
  }

  /**
   * 处理列
   * @param entitys
   * @param entityColumns
   * @param curdOption
   */
  async pageColumns(entitys: Record<string, any[]>, curdOption: CurdOption) {
    const pageQueryOp = await this.getPageOp(curdOption);
    // 检查 pageQueryOp 是否为对象且具有 select 属性
    if (
      pageQueryOp &&
      typeof pageQueryOp === 'object' &&
      'select' in pageQueryOp &&
      curdOption?.entity?.name
    ) {
      const select = pageQueryOp.select;
      const join = pageQueryOp.join || [];
      // 所有的关联entitys
      const joinEntitys: {
        name: string;
        alias: string;
      }[] = [{ name: curdOption.entity.name, alias: 'a' }];

      if (join.length > 0) {
        joinEntitys.push(
          ...join.map(item => {
            return { name: item.entity.name, alias: item.alias };
          })
        );
      }

      // 处理 select
      const result = [];
      for (const selectItem of select) {
        // 处理 'a.*' 这种情况
        if (selectItem.endsWith('.*')) {
          const alias = selectItem.split('.')[0];
          const entity = joinEntitys.find(e => e.alias === alias);
          if (entity) {
            const entityColumns = entitys[entity.name] || [];
            result.push(
              ...entityColumns.map(e => {
                return {
                  ...e,
                  source: `${alias}.${e.propertyName}`,
                };
              })
            );
          }
          continue;
        }

        // 处理单个字段，如 'b.name' 或 'b.name as userName'
        const asRegex = /\s+as\s+/i;
        const [field, asName] = selectItem.split(asRegex).map(s => s.trim());
        const [alias, fieldName] = field.split('.');
        const entity = joinEntitys.find(e => e.alias === alias);

        if (entity) {
          const entityColumns = entitys[entity.name] || [];
          const column = entityColumns.find(
            col => col.propertyName === fieldName
          );
          if (column) {
            result.push({
              ...column,
              propertyName: asName || column.propertyName,
              source: `${alias}.${column.propertyName}`,
            });
          }
        }
      }
      // 将 createTime 和 updateTime 移到末尾
      const finalResult = [...result];
      const timeFields = ['createTime', 'updateTime'];
      const timeColumns = [];

      // 先找出并删除所有时间字段
      for (let i = finalResult.length - 1; i >= 0; i--) {
        if (timeFields.includes(finalResult[i].propertyName)) {
          timeColumns.unshift(finalResult.splice(i, 1)[0]);
        }
      }

      // 将时间字段添加到末尾
      finalResult.push(...timeColumns);

      return finalResult;
    }
    return [];
  }

  /**
   * 模块信息
   * @param module
   */
  async modules(module?: string) {
    for (const key in this.moduleConfig) {
      const config = this.moduleConfig[key];
      this.module[key] = {
        name: config.name,
        description: config.description,
      };
    }
    return module ? this.module[module] : this.module;
  }

  /**
   * 所有controller
   * @returns
   */
  async controller() {
    const result = [];
    const controllers = listModule(CONTROLLER_KEY);
    for (const controller of controllers) {
      result.push(getClassMetadata(CONTROLLER_KEY, controller));
    }
    return result;
  }

  /**
   * 所有路由
   * @returns
   */
  async router() {
    let ignoreUrls: string[] = this.coolUrlTagData.byKey(TagTypes.IGNORE_TOKEN);
    if (_.isEmpty(ignoreUrls)) {
      ignoreUrls = [];
    }
    return _.groupBy(
      (await this.midwayWebRouterService.getFlattenRouterTable()).map(item => {
        return {
          method: item.requestMethod,
          path: item.url,
          summary: item.summary,
          dts: {},
          tag: '',
          prefix: item.prefix,
          ignoreToken: ignoreUrls.includes(item.prefix + item.url),
        };
      }),
      'prefix'
    );
  }

  /**
   * 所有实体
   * @returns
   */
  async entity() {
    const result = {};
    const dataSourceNames = this.typeORMDataSourceManager.getDataSourceNames();
    for (const dataSourceName of dataSourceNames) {
      const entityMetadatas = await this.typeORMDataSourceManager.getDataSource(
        dataSourceName
      ).entityMetadatas;
      for (const entityMetadata of entityMetadatas) {
        const commColums = [];
        let columns = entityMetadata.columns;
        if (entityMetadata.tableType != 'regular') continue;
        columns = _.filter(
          columns.map(e => {
            return {
              propertyName: e.propertyName,
              type:
                typeof e.type === 'string' ? e.type : e.type.name.toLowerCase(),
              length: e.length,
              comment: e.comment,
              nullable: e.isNullable,
              defaultValue: e.default,
              dict: e['dict'],
              source: `a.${e.propertyName}`,
            };
          }),
          o => {
            if (['createTime', 'updateTime'].includes(o.propertyName)) {
              commColums.push(o);
            }
            return (
              o &&
              !['createTime', 'updateTime', 'tenantId'].includes(o.propertyName)
            );
          }
        ).concat(commColums);
        result[entityMetadata.name] = columns;
      }
    }
    return result;
  }
}
