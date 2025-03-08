/**
 * 返回码
 */
export enum RESCODE {
  // 成功
  SUCCESS = 1000,
  // 失败
  COMMFAIL = 1001,
  // 参数验证失败
  VALIDATEFAIL = 1002,
  // 参数验证失败
  COREFAIL = 1003,
}

/**
 * 返回信息
 */
export enum RESMESSAGE {
  // 成功
  SUCCESS = "success",
  // 失败
  COMMFAIL = "comm fail",
  // 参数验证失败
  VALIDATEFAIL = "validate fail",
  // 核心异常
  COREFAIL = "core fail",
}

/**
 * 错误提示
 */
export enum ERRINFO {
  NOENTITY = "未设置操作实体",
  NOID = "查询参数[id]不存在",
  SORTFIELD = "排序参数不正确",
}

/**
 * 事件
 */
export enum EVENT {
  // 软删除
  SOFT_DELETE = "onSoftDelete",
  // 服务成功启动
  SERVER_READY = "onServerReady",
  // 服务就绪
  READY = "onReady",
  // ES 数据改变
  ES_DATA_CHANGE = "esDataChange",
}


export class GlobalConfig {
  private static instance: GlobalConfig;

  RESCODE = {
    SUCCESS: 1000,
    COMMFAIL: 1001,
    VALIDATEFAIL: 1002,
    COREFAIL: 1003,
  };

  RESMESSAGE = {
    SUCCESS: "success",
    COMMFAIL: "comm fail",
    VALIDATEFAIL: "validate fail",
    COREFAIL: "core fail",
  };

  // ... 其他的配置 ...

  private constructor() {}

  static getInstance(): GlobalConfig {
    if (!GlobalConfig.instance) {
      GlobalConfig.instance = new GlobalConfig();
    }
    return GlobalConfig.instance;
  }
}




