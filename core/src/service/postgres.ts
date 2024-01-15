import { Init, Provide, Inject, App, Config } from "@midwayjs/decorator";
import { CoolValidateException } from "../exception/validate";
import { ERRINFO, EVENT } from "../constant/global";
import { Application, Context } from "@midwayjs/koa";
import { Scope, ScopeEnum } from "@midwayjs/core";
import { CoolConfig } from "../interface";
import { TypeORMDataSourceManager } from "@midwayjs/typeorm";
import { Brackets, In, Repository, SelectQueryBuilder } from "typeorm";
import { QueryOp } from "../decorator/controller";
import * as _ from "lodash";
import { CoolEventManager } from "../event";

/**
 * 服务基类
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export abstract class BasePgService {
  // 分页配置
  @Config("cool")
  private _coolConfig: CoolConfig;

  // 模型
  entity: Repository<any>;

  sqlParams;

  @Inject()
  typeORMDataSourceManager: TypeORMDataSourceManager;

  @Inject()
  coolEventManager: CoolEventManager;

  // 设置模型
  setEntity(entity: any) {
    this.entity = entity;
  }

  // 设置请求上下文
  setCtx(ctx: Context) {
    this.baseCtx = ctx;
  }

  @App()
  baseApp: Application;

  // 设置应用对象
  setApp(app: Application) {
    this.baseApp = app;
  }

  @Inject("ctx")
  baseCtx: Context;

  // 初始化
  @Init()
  init() {
    this.sqlParams = [];
  }

  /**
   * 设置sql
   * @param condition 条件是否成立
   * @param sql sql语句
   * @param params 参数
   */
  setSql(condition, sql, params) {
    let rSql = false;
    if (condition || (condition === 0 && condition !== "")) {
      rSql = true;
      for(let i = 0; i < params.length; i++) {
        const param = params[i];
        if (param instanceof Array) {
          // 将这个? 替换成 $1,$2,$3
          const replaceStr = [];
          for(let j = 0; j < param.length; j++) {
            replaceStr.push('$' + (this.sqlParams.length + j + 1));
          }
          this.sqlParams = this.sqlParams.concat(...params);
          sql = sql.replace('?', replaceStr.join(','));
        } else {
          sql = sql.replace('?', '$' + (this.sqlParams.length + 1));
          this.sqlParams.push(param);
        }
      }
    }
    return rSql ? sql : "";
  }

  /**
   * 获得查询个数的SQL
   * @param sql
   */
  getCountSql(sql) {
    sql = sql
      .replace(new RegExp("LIMIT", "gm"), "limit ")
      .replace(new RegExp("\n", "gm"), " ");
    if (sql.includes("limit")) {
      const sqlArr = sql.split("limit ");
      sqlArr.pop();
      sql = sqlArr.join("limit ");
    }
    return `select count(*) as count from (${sql}) a`;
  }

  /**
   * 参数安全性检查
   * @param params
   */
  async paramSafetyCheck(params) {
    const lp = params.toLowerCase();
    return !(
      lp.indexOf("update ") > -1 ||
      lp.indexOf("select ") > -1 ||
      lp.indexOf("delete ") > -1 ||
      lp.indexOf("insert ") > -1
    );
  }

  /**
   * 原生查询
   * @param sql
   * @param params
   * @param connectionName
   */
  async nativeQuery(sql, params?, connectionName?) {
    sql = this.convertToPostgres(sql);
    if (_.isEmpty(params)) {
      params = this.sqlParams;
    }
    let newParams = [];
    // sql没处理过?的情况下
    if(sql.includes('?')){
      for (const item of params) {
        // 如果是数组，将这个? 替换成 $1,$2,$3
        if (item instanceof Array) {
          const replaceStr = [];
          for(let i = 0; i < item.length; i++) {
            replaceStr.push('$' + (newParams.length + i + 1));
          }
          newParams.push(...item)
          sql = sql.replace('?', replaceStr.join(','));
        } else {
          sql = sql.replace('?', '$' + (newParams.length + 1));
          newParams.push(item);
        }
      }
    }else{
      newParams = params;
    }
    this.sqlParams = [];
    return await this.getOrmManager(connectionName).query(sql, newParams || []);
  }

  /**
   * 获得ORM管理
   *  @param connectionName 连接名称
   */
  getOrmManager(connectionName = "default") {
    return this.typeORMDataSourceManager.getDataSource(connectionName);
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
    const {
      size = this._coolConfig.crud.pageSize,
      page = 1,
      order = "createTime",
      sort = "desc",
      isExport = false,
      maxExportLimit,
    } = query;
    const count = await find.getCount();
    let dataFind: SelectQueryBuilder<any>;
    if (isExport && maxExportLimit > 0) {
      dataFind = find.limit(maxExportLimit);
    } else {
      dataFind = find.offset((page - 1) * size).limit(size);
    }
    if (autoSort) {
      find.addOrderBy(order, sort.toUpperCase());
    }
    return {
      list: await dataFind.getMany(),
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: count,
      },
    };
  }

  /**
   * 将mysql语句转换为postgres语句
   * @param sql 
   * @returns 
   */
  protected convertToPostgres(sql) {
      // 首先确保表名被正确引用
      sql = sql.replace(/(?<!")(\b\w+\b)\.(?!\w+")/g, '"$1".');
      // 然后确保字段名被正确引用
      return sql.replace(/\.(\w+)(?!\w)/g, '."$1"');
  }

  /**
   * 查询sql中的参数个数
   * @param sql 
   * @returns 
   */
  protected countDollarSigns(sql) {
    const matches = sql.match(/\$\d+/g);
    return matches ? matches.length : 0;
  }

  /**
   * 执行SQL并获得分页数据
   * @param sql 执行的sql语句
   * @param query 分页查询条件
   * @param autoSort 是否自动排序
   * @param connectionName 连接名称
   */
  async sqlRenderPage(sql, query, autoSort = true, connectionName?) {
    const {
      size = this._coolConfig.crud.pageSize,
      page = 1,
      order = "createTime",
      sort = "desc",
      isExport = false,
      maxExportLimit,
    } = query;
    sql = `SELECT * FROM (${sql}) a `
    if (order && sort && autoSort) {
      if (!(await this.paramSafetyCheck(order + sort))) {
        throw new CoolValidateException("非法传参~");
      }
      sql += `ORDER BY a."${order}" ${this.checkSort(sort)}`
    }
    let cutParams = 0;
    let paramCount = this.countDollarSigns(sql);
    if (isExport && maxExportLimit > 0) {
        this.sqlParams.push(parseInt(maxExportLimit));
        cutParams = 1;
        sql += ` LIMIT $${paramCount+1}`;
    }
    if (!isExport) {
        this.sqlParams.push(parseInt(size));
        this.sqlParams.push((page - 1) * size);
        cutParams = 2;
        sql += ` LIMIT $${ paramCount + 1} OFFSET $${ paramCount+ 2 }`;
    }
    let params = [];
    params = params.concat(this.sqlParams);
    const result = await this.nativeQuery(sql, params, connectionName);
    params = params.slice(0, -cutParams);
    const countResult = await this.nativeQuery(
      this.getCountSql(sql),
      params,
      connectionName
    );
    return {
      list: result,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: parseInt(countResult[0] ? countResult[0].count : 0),
      },
    };
  }

  /**
   * 检查排序
   * @param sort 排序
   * @returns
   */
  checkSort(sort) {
    if (!["desc", "asc"].includes(sort.toLowerCase())) {
      throw new CoolValidateException("sort 非法传参~");
    }
    return sort;
  }

  /**
   * 获得单个ID
   * @param id ID
   * @param infoIgnoreProperty 忽略返回属性
   */
  async info(id: any, infoIgnoreProperty?: string[]) {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    if (!id) {
      throw new CoolValidateException(ERRINFO.NOID);
    }
    const info = await this.entity.findOneBy({ id });
    if (info && infoIgnoreProperty) {
      for (const property of infoIgnoreProperty) {
        delete info[property];
      }
    }
    return info;
  }

  /**
   * 删除
   * @param ids 删除的ID集合 如：[1,2,3] 或者 1,2,3
   */
  async delete(ids: any) {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    if (ids instanceof String) {
      ids = ids.split(",");
    }
    // 启动软删除发送事件
    if (this._coolConfig.crud?.softDelete) {
      this.softDelete(ids);
    }
    await this.entity.delete(ids);
  }

  /**
   * 软删除
   * @param ids 删除的ID数组
   * @param entity 实体
   */
  async softDelete(ids: number[], entity?: Repository<any>) {
    const data = await this.entity.find({
      where: {
        id: In(ids),
      },
    });
    if (_.isEmpty(data)) return;
    const _entity = entity ? entity : this.entity;
    const params = {
      data,
      ctx: this.baseCtx,
      entity: _entity,
    };
    if (data.length > 0) {
      this.coolEventManager.emit(EVENT.SOFT_DELETE, params);
    }
  }

  /**
   * 新增|修改
   * @param param 数据
   */
  async addOrUpdate(param: any | any[], type: 'add' | 'update' = 'add') {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    delete param.createTime;
    // 判断是否是批量操作
    if (param instanceof Array) {
        param.forEach((item) => {
          item.updateTime = new Date();
          item.createTime = new Date();
        });
        await this.entity.save(param);
    } else{
      const upsert = this._coolConfig.crud?.upsert || 'normal';
      if (type == 'update') {
        if(upsert == 'save') {
          const info = await this.entity.findOneBy({id: param.id})
          param = {
            ...info,
            ...param
          }
        }
        param.updateTime = new Date();
        upsert == 'normal'? await this.entity.update(param.id, param): await this.entity.save(param);
      }
      if(type =='add'){
        param.createTime = new Date();
        param.updateTime = new Date();
        upsert == 'normal'? await this.entity.insert(param): await this.entity.save(param);
      }
    }
  }

  /**
   * 非分页查询
   * @param query 查询条件
   * @param option 查询配置
   * @param connectionName 连接名
   */
  async list(query, option, connectionName?): Promise<any> {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    const sql = await this.getOptionFind(query, option);
    return this.nativeQuery(sql, [], connectionName);
  }

  /**
   * 分页查询
   * @param query 查询条件
   * @param option 查询配置
   * @param connectionName 连接名
   */
  async page(query, option, connectionName?) {
    if (!this.entity) throw new CoolValidateException(ERRINFO.NOENTITY);
    const sql = await this.getOptionFind(query, option);
    return this.sqlRenderPage(sql, query, false, connectionName);
  }

  /**
   * 构建查询配置
   * @param query 前端查询
   * @param option
   */
  async getOptionFind(query, option: QueryOp) {
    let { order = "createTime", sort = "desc", keyWord = "" } = query;
    const sqlArr = ["SELECT"];
    const selects = ["a.*"];
    const find = this.entity.createQueryBuilder("a");
    if (option) {
      if (typeof option == "function") {
        // @ts-ignore
        option = await option(this.baseCtx, this.baseApp);
      }
      // 判断是否有关联查询，有的话取个别名
      if (!_.isEmpty(option.join)) {
        for (const item of option.join) {
          selects.push(`${item.alias}.*`);
          find[item.type || "leftJoin"](
            item.entity,
            item.alias,
            item.condition
          );
        }
      }
      // 默认条件
      if (option.where) {
        const wheres =
          typeof option.where == "function"
            ? await option.where(this.baseCtx, this.baseApp)
            : option.where;
        if (!_.isEmpty(wheres)) {
          for (const item of wheres) {
            if (
              item.length == 2 ||
              (item.length == 3 &&
                (item[2] || (item[2] === 0 && item[2] != "")))
            ) {
              for (const key in item[1]) {
                this.sqlParams.push(item[1][key]);
              }
              find.andWhere(item[0], item[1]);
            }
          }
        }
      }
      // 附加排序
      if (!_.isEmpty(option.addOrderBy)) {
        for (const key in option.addOrderBy) {
          if (order && order == key) {
            sort = option.addOrderBy[key].toUpperCase();
          }
          find.addOrderBy(
            `${this.matchColumn(option?.select, key)}.${key}`,
            this.checkSort(option.addOrderBy[key].toUpperCase())
          );
        }
      }
      // 关键字模糊搜索
      if (keyWord || (keyWord == 0 && keyWord != "")) {
        keyWord = `%${keyWord}%`;
        find.andWhere(
          new Brackets((qb) => {
            const keyWordLikeFields = option.keyWordLikeFields || [];
            for (let i = 0; i < option.keyWordLikeFields?.length || 0; i++) {
              let column = keyWordLikeFields[i];
              column = column.includes('.')? column: `a.${column}`;
              const values = {};
              values[`keyWord${i}`] = keyWord;
              qb.orWhere(`${column} like :keyWord${i}`,values);
              this.sqlParams.push(keyWord);
            }
          })
        );
      }
      // 筛选字段
      if (!_.isEmpty(option.select)) {
        sqlArr.push(option.select.join(","));
        find.select(option.select);
      } else {
        sqlArr.push(selects.join(","));
      }
      // 字段全匹配
      if (!_.isEmpty(option.fieldEq)) {
        for (let key of option.fieldEq) {
          const c = {};
          let column;
          // 如果key有包含.的情况下操作
          if(typeof key === "string" && key.includes('.')){
            const keys = key.split('.');
            const lastKey = keys.pop();
            key = {requestParam: lastKey, column: key};
            column = key
          }else{
            column = `a.${key}`
          }
          // 单表字段无别名的情况下操作
          if (typeof key === "string") {
            if (query[key] || (query[key] == 0 && query[key] == "")) {
              c[key] = query[key];
              const eq = query[key] instanceof Array ? "in" : "=";
              if (eq === "in") {
                find.andWhere(`${column} ${eq} (:...${key})`, c);
              } else {
                find.andWhere(`${column} ${eq} :${key}`, c);
              }
              this.sqlParams.push(query[key]);
            }
          } else {
            if (
              query[key.requestParam] ||
              (query[key.requestParam] == 0 && query[key.requestParam] !== "")
            ) {
              c[key.column] = query[key.requestParam];
              const eq = query[key.requestParam] instanceof Array ? "in" : "=";
              if (eq === "in") {
                find.andWhere(`${key.column} ${eq} (:${key.column})`, c);
              } else {
                find.andWhere(`${key.column} ${eq} :${key.column}`, c);
              }
              this.sqlParams.push(query[key.requestParam]);
            }
          }
        }
      }
    } else {
      sqlArr.push(selects.join(","));
    }
    // 接口请求的排序
    if (sort && order) {
      const sorts = sort.toUpperCase().split(",");
      const orders = order.split(",");
      if (sorts.length != orders.length) {
        throw new CoolValidateException(ERRINFO.SORTFIELD);
      }
      for (const i in sorts) {
        find.addOrderBy(
          `${this.matchColumn(option?.select, orders[i])}.${orders[i]}`,
          this.checkSort(sorts[i])
        );
      }
    }
    if (option?.extend) {
      await option?.extend(find, this.baseCtx, this.baseApp);
    }
    const sqls = find.getSql().split("FROM");
    sqlArr.push("FROM");
    // 取sqls的最后一个
    sqlArr.push(sqls[sqls.length - 1]);
    return sqlArr.join(" ");
  }

  /**
   * 筛选的字段匹配
   * @param select 筛选的字段
   * @param field 字段
   * @returns 字段在哪个表中
   */
  protected matchColumn(select: string[] = [], field: string) {
    for (const column of select) {
          // 检查字段是否有别名，考虑 'AS' 关键字的不同大小写形式
          const aliasPattern = new RegExp(`\\b\\w+\\s+as\\s+${field}\\b`, 'i');
          const aliasMatch = column.match(aliasPattern);
          if (aliasMatch) {
              // 提取别名前的字段和表名
              const fieldPattern = new RegExp(`(\\w+)\\.(\\w+)\\s+as\\s+${field}`, 'i');
              const fieldMatch = column.match(fieldPattern);
              if (fieldMatch) {
                  // 返回匹配到的表名
                  return fieldMatch[1];
              }
          }

          // 检查字段是否直接在选择列表中
          const fieldPattern = new RegExp(`\\b(\\w+)\\.${field}\\b`, 'i');
          const fieldMatch = column.match(fieldPattern);
          if (fieldMatch) {
              // 如果直接匹配到字段，返回字段所属的表名
              return fieldMatch[1];
          }
    }

    // 如果没有匹配到任何特定的表或别名，返回默认的 'a' 表
    return 'a';
  }

}
