import { ModuleConfig } from './../interface';
import {
  Scope,
  ScopeEnum,
  saveClassMetadata,
  saveModule,
  CONTROLLER_KEY,
  MiddlewareParamArray,
  WEB_ROUTER_KEY,
  attachClassMetadata,
  getClassMetadata,
} from '@midwayjs/core';
import * as fs from 'fs';
import * as _ from 'lodash';
import location from '../util/location';

export type ApiTypes = 'add' | 'delete' | 'update' | 'page' | 'info' | 'list';

/** 服务映射接口 */
export type ServiceApis = {
  /** 方法 */
  method: string;
  /** 描述 */
  summary: string;
};

// Crud配置
export interface CurdOption {
  // 路由前缀，不配置默认是按Controller下的文件夹路径
  prefix?: string;
  // curd api接口
  api?: ApiTypes[];
  // 服务映射接口
  serviceApis?: (ServiceApis | string)[];
  // 分页查询配置
  pageQueryOp?: QueryOp | Function;
  // 非分页查询配置
  listQueryOp?: QueryOp | Function;
  // 插入参数
  insertParam?: Function;
  // 操作之前
  before?: Function;
  // info 忽略返回属性
  infoIgnoreProperty?: string[];
  // 实体
  entity?: any;
  // 服务
  service?: any;
  // api标签
  urlTag?: {
    name: 'ignoreToken' | string;
    url: ApiTypes[];
  };
}
export interface JoinOp {
  // 实体
  entity: any;
  // 别名
  alias: string;
  // 关联条件
  condition: string;
  // 关联类型
  type?: 'innerJoin' | 'leftJoin';
}

// 字段匹配
export interface FieldEq {
  // 字段
  column: string;
  // 请求参数
  requestParam: string;
}
// 查询配置
export interface QueryOp {
  // 需要模糊查询的字段
  keyWordLikeFields?: string[];
  // 查询条件
  where?: Function | any[][];
  // 查询字段
  select?: string[];
  // 字段模糊查询
  fieldLike?: string[] | FieldEq[] | (string | FieldEq)[];
  // 字段相等
  fieldEq?: string[] | FieldEq[] | (string | FieldEq)[];
  // 添加排序条件
  addOrderBy?: {};
  // 关联配置
  join?: JoinOp[];
  // 其他条件
  extend?: Function;
}

// Controller 配置
export interface ControllerOption {
  // crud配置 如果是字符串则为路由前缀，不配置默认是按Controller下的文件夹路径
  curdOption?: CurdOption & string;
  // 路由配置
  routerOptions?: {
    // 是否敏感
    sensitive?: boolean;
    // 路由中间件
    middleware?: MiddlewareParamArray;
    // 别名
    alias?: string[];
    // 描述
    description?: string;
    // 标签名称
    tagName?: string;
  };
}

// 路由配置
export interface RouterOptions {
  sensitive?: boolean;
  middleware?: MiddlewareParamArray;
  description?: string;
  tagName?: string;
  ignoreGlobalPrefix?: boolean;
}

// COOL的装饰器
export function CoolController(
  curdOption?: CurdOption | string | RouterOptions,
  routerOptions: RouterOptions = { middleware: [], sensitive: true }
): ClassDecorator {
  return (target: any) => {
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(CONTROLLER_KEY, target);
    let prefix;
    if (curdOption) {
      // 判断 curdOption 的类型
      if (typeof curdOption === 'string') {
        prefix = curdOption;
      } else if (curdOption && 'api' in curdOption) {
        // curdOption 是 CurdOption 类型
        prefix = curdOption.prefix || '';
      } else {
        // curdOption 是 RouterOptions 类型 合并到 routerOptions
        routerOptions = { ...curdOption, ...routerOptions };
      }
    }
    // 如果不存在路由前缀，那么自动根据当前文件夹路径
    location.scriptPath(target).then(async (res: any) => {
      if (!res?.path) return;
      const pathSps = res.path.split('.');
      const paths = pathSps[pathSps.length - 2].split(/[/\\]/);
      const pathArr = [];
      let module = null;
      for (const path of paths.reverse()) {
        if (path != 'controller' && !module) {
          pathArr.push(path);
        }
        if (path == 'controller' && !paths.includes('modules')) {
          break;
        }
        if (path == 'controller' && paths.includes('modules')) {
          module = 'ready';
        }
        if (module && path != 'controller') {
          module = `${path}`;
          break;
        }
      }
      if (module) {
        pathArr.reverse();
        pathArr.splice(1, 0, module);
        // 追加模块中间件
        const path = `${
          res.path.split(new RegExp(`modules[/\\\\]${module}`))[0]
        }modules/${module}/config.${_.endsWith(res.path, 'ts') ? 'ts' : 'js'}`;
        if (fs.existsSync(path)) {
          const config: ModuleConfig = require(path).default();
          routerOptions.middleware = (config.middlewares || []).concat(
            routerOptions.middleware || []
          );
        }
      }
      if (!prefix) {
        prefix = `/${pathArr.join('/')}`;
      }
      saveMetadata(prefix, routerOptions, target, curdOption, module);
    });
  };
}

export const apiDesc = {
  add: '新增',
  delete: '删除',
  update: '修改',
  page: '分页查询',
  list: '列表查询',
  info: '单个信息',
};

// 保存一些元数据信息，任意你希望存的东西
function saveMetadata(prefix, routerOptions, target, curdOption, module) {
  if (module && !routerOptions.tagName) {
    routerOptions = routerOptions || {};
    routerOptions.tagName = module;
  }
  saveClassMetadata(
    CONTROLLER_KEY,
    {
      prefix,
      routerOptions,
      curdOption,
      module,
    } as ControllerOption,
    target
  );
  // 追加CRUD路由
  if (!_.isEmpty(curdOption?.api)) {
    // 获取已存在的路由
    const existingRoutes = getClassMetadata(WEB_ROUTER_KEY, target) || [];
    const existingPaths = existingRoutes.map(route => route.path);

    curdOption?.api.forEach(path => {
      const routePath = `/${path}`;
      // 检查路由是否已存在
      if (!existingPaths.includes(routePath)) {
        attachClassMetadata(
          WEB_ROUTER_KEY,
          {
            path: routePath,
            requestMethod: path == 'info' ? 'get' : 'post',
            method: path,
            summary: apiDesc[path] || path,
            description: '',
          },
          target
        );
      }
    });
  }
  if (!_.isEmpty(curdOption?.serviceApis)) {
    // 获取已存在的路由
    const existingRoutes = getClassMetadata(WEB_ROUTER_KEY, target) || [];
    const existingPaths = existingRoutes.map(route => route.path);

    curdOption.serviceApis.forEach(api => {
      const methodName = typeof api === 'string' ? api : api.method;
      const routePath = `/${methodName}`;
      // 检查路由是否已存在
      if (!existingPaths.includes(routePath)) {
        attachClassMetadata(
          WEB_ROUTER_KEY,
          {
            path: routePath,
            requestMethod: 'post',
            method: methodName,
            summary: typeof api === 'string' ? api : api.summary,
            description: '',
          },
          target
        );
      }
    });
  }
  Scope(ScopeEnum.Request)(target);
}
