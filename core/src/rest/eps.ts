import {
  CONTROLLER_KEY,
  getClassMetadata,
  listModule,
  Provide,
} from "@midwayjs/decorator";
import * as _ from "lodash";
import {
  Scope,
  ScopeEnum,
  Config,
  Inject,
  MidwayWebRouterService,
} from "@midwayjs/core";
import { TypeORMDataSourceManager } from "@midwayjs/typeorm";
import { CoolUrlTagData } from "../tag/data";
import { TagTypes } from "../decorator/tag";

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

  @Config("cool.eps")
  epsConfig: boolean;

  @Config("module")
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
      const name = curdOption?.entity?.name;
      (_.startsWith(prefix, "/admin/") ? adminArr : appArr).push({
        module,
        info: {
          type: {
            name: prefix.split("/").pop(),
            description: routerOptions?.description || "",
          },
        },
        api: routers[prefix],
        name,
        columns: entitys[name] || [],
        prefix,
      });
    }
    this.admin = _.groupBy(adminArr, "module");
    this.app = _.groupBy(appArr, "module");
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
      (await this.midwayWebRouterService.getFlattenRouterTable()).map(
        (item) => {
          return {
            method: item.requestMethod,
            path: item.url,
            summary: item.summary,
            dts: {},
            tag: "",
            prefix: item.prefix,
            ignoreToken: ignoreUrls.includes(item.prefix + item.url),
          };
        }
      ),
      "prefix"
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
        if (entityMetadata.tableType != "regular") continue;
        columns = _.filter(
          columns.map((e) => {
            return {
              propertyName: e.propertyName,
              type:
                typeof e.type == "string" ? e.type : e.type.name.toLowerCase(),
              length: e.length,
              comment: e.comment,
              nullable: e.isNullable,
            };
          }),
          (o) => {
            if (["createTime", "updateTime"].includes(o.propertyName)) {
              commColums.push(o);
            }
            return o && !["createTime", "updateTime"].includes(o.propertyName);
          }
        ).concat(commColums);
        result[entityMetadata.name] = columns;
      }
    }
    return result;
  }
}
