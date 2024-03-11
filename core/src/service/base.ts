import { App, Config, Init, Inject, Provide } from "@midwayjs/decorator";
import { Scope, ScopeEnum } from "@midwayjs/core";
import { BaseMysqlService } from "./mysql";
import { BasePgService } from "./postgres";
import { CoolValidateException } from "../exception/validate";
import { ERRINFO } from "../constant/global";
import { Application, Context } from "@midwayjs/koa";
import { TypeORMDataSourceManager } from "@midwayjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { QueryOp } from "../decorator/controller";
import * as _ from "lodash";
import { CoolEventManager } from "../event";
import { CoolCoreException } from "../exception/core";
import { BaseSqliteService } from "./sqlite";

/**
 * 服务基类
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export abstract class BaseService {
  // mysql的基类
  @Inject()
  baseMysqlService: BaseMysqlService;

  // postgres的基类
  @Inject()
  basePgService: BasePgService;

  @Inject()
  baseSqliteService: BaseSqliteService;

  // 数据库类型
  @Config("typeorm.dataSource.default.type")
  ormType;

  // 当前服务名称
  service: BaseMysqlService | BasePgService | BaseSqliteService;

  // 模型
  protected entity: Repository<any>;

  protected sqlParams;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  @Inject()
  coolEventManager: CoolEventManager;

  @Inject("ctx")
  baseCtx: Context;

  @App()
  baseApp: Application;

  @Init()
  async init() {
    const services = {
      mysql: this.baseMysqlService,
      postgres: this.basePgService,
      sqlite: this.baseSqliteService,
    };
    this.service = services[this.ormType];
    if (!this.service) throw new CoolCoreException("暂不支持当前数据库类型");
    this.sqlParams = this.service.sqlParams;
    await this.service.init();
  }

  // 设置模型
  setEntity(entity: any) {
    this.entity = entity;
    this.service.setEntity(entity);
  }

  // 设置请求上下文
  setCtx(ctx: Context) {
    this.baseCtx = ctx;
    this.service.setCtx(ctx);
  }

  // 设置应用对象
  setApp(app: Application) {
    this.baseApp = app;
    this.service.setApp(app);
  }

  /**
   * 设置sql
   * @param condition 条件是否成立
   * @param sql sql语句
   * @param params 参数
   */
  setSql(condition, sql, params) {
    return this.service.setSql(condition, sql, params);
  }

  /**
   * 获得查询个数的SQL
   * @param sql
   */
  getCountSql(sql) {
    return this.service.getCountSql(sql);
  }

  /**
   * 参数安全性检查
   * @param params
   */
  async paramSafetyCheck(params) {
    return await this.service.paramSafetyCheck(params);
  }

  /**
   * 原生查询
   * @param sql
   * @param params
   * @param connectionName
   */
  async nativeQuery(sql, params?, connectionName?) {
    return await this.service.nativeQuery(sql, params, connectionName);
  }

  /**
   * 获得ORM管理
   *  @param connectionName 连接名称
   */
  getOrmManager(connectionName = "default") {
    return this.service.getOrmManager(connectionName);
  }

  /**
   * 操作entity获得分页数据，不用写sql
   * @param find QueryBuilder
   * @param query
   * @param autoSort
   * @param connectionName
   */
  async entityRenderPage(
    find: SelectQueryBuilder<any>,
    query,
    autoSort = true
  ) {
    return await this.service.entityRenderPage(find, query, autoSort);
  }

  /**
   * 执行SQL并获得分页数据
   * @param sql 执行的sql语句
   * @param query 分页查询条件
   * @param autoSort 是否自动排序
   * @param connectionName 连接名称
   */
  async sqlRenderPage(sql, query, autoSort = true, connectionName?) {
    return await this.service.sqlRenderPage(
      sql,
      query,
      autoSort,
      connectionName
    );
  }

  /**
   * 获得单个ID
   * @param id ID
   * @param infoIgnoreProperty 忽略返回属性
   */
  async info(id: any, infoIgnoreProperty?: string[]) {
    this.service.setEntity(this.entity);
    return await this.service.info(id, infoIgnoreProperty);
  }

  /**
   * 删除
   * @param ids 删除的ID集合 如：[1,2,3] 或者 1,2,3
   */
  async delete(ids: any) {
    this.service.setEntity(this.entity);
    await this.modifyBefore(ids, "delete");
    await this.service.delete(ids);
    await this.modifyAfter(ids, "delete");
  }

  /**
   * 软删除
   * @param ids 删除的ID数组
   * @param entity 实体
   */
  async softDelete(ids: number[], entity?: Repository<any>) {
    this.service.setEntity(this.entity);
    await this.service.softDelete(ids, entity);
  }

  /**
   * 修改
   * @param param 数据
   */
  async update(param: any) {
    this.service.setEntity(this.entity);
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    if (!param.id && !(param instanceof Array))
      throw new CoolValidateException(ERRINFO.NOID);
    await this.addOrUpdate(param, "update");
  }

  /**
   * 新增
   * @param param 数据
   */
  async add(param: any | any[]): Promise<Object> {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    await this.addOrUpdate(param, "add");
    return {
      id:
        param instanceof Array
          ? param.map((e) => {
              return e.id ? e.id : e._id;
            })
          : param.id
          ? param.id
          : param._id,
    };
  }

  /**
   * 新增|修改
   * @param param 数据
   */
  async addOrUpdate(param: any | any[], type: "add" | "update" = "add") {
    this.service.setEntity(this.entity);
    await this.modifyBefore(param, type);
    await this.service.addOrUpdate(param, type);
    await this.modifyAfter(param, type);
  }

  /**
   * 非分页查询
   * @param query 查询条件
   * @param option 查询配置
   * @param connectionName 连接名
   */
  async list(query, option, connectionName?): Promise<any> {
    this.service.setEntity(this.entity);
    return await this.service.list(query, option, connectionName);
  }

  /**
   * 分页查询
   * @param query 查询条件
   * @param option 查询配置
   * @param connectionName 连接名
   */
  async page(query, option, connectionName?) {
    this.service.setEntity(this.entity);
    return await this.service.page(query, option, connectionName);
  }

  /**
   * 构建查询配置
   * @param query 前端查询
   * @param option
   */
  async getOptionFind(query, option: QueryOp) {
    this.service.setEntity(this.entity);
    return await this.service.getOptionFind(query, option);
  }

  /**
   * 新增|修改|删除 之后的操作
   * @param data 对应数据
   */
  async modifyAfter(
    data: any,
    type: "delete" | "update" | "add"
  ): Promise<void> {}

  /**
   * 新增|修改|删除 之前的操作
   * @param data 对应数据
   */
  async modifyBefore(
    data: any,
    type: "delete" | "update" | "add"
  ): Promise<void> {}
}
