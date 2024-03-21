import {
  App,
  getClassMetadata,
  listModule,
  Provide,
} from "@midwayjs/decorator";
import * as Events from "events";
import { Scope, ScopeEnum, IMidwayApplication, Config } from "@midwayjs/core";
import { COOL_CLS_EVENT_KEY, COOL_EVENT_KEY } from "../decorator/event";
import * as pm2 from "pm2";
import * as _ from "lodash";

export const COOL_EVENT_MESSAGE = "cool:event:message";

/**
 * 事件
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolEventManager extends Events {
  @App()
  app: IMidwayApplication;

  @Config("keys")
  keys: string;

  // 事件数据 某个事件对应的模块对应的方法
  eventData = {} as {
    [key: string]: {
      module: any;
      method: string;
    }[];
  };

  /**
   * 初始化
   */
  async init() {
    const eventModules = listModule(COOL_CLS_EVENT_KEY);
    for (const module of eventModules) {
      await this.handlerEvent(module);
    }
    await this.commEvent();
    await this.globalEvent();
  }

  /**
   * 发送事件
   * @param event
   * @param args
   * @returns
   */
  emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(COOL_EVENT_MESSAGE, {
      type: COOL_EVENT_MESSAGE,
      data: {
        event,
        args,
      },
    });
  }

  /**
   * 发送全局事件
   * @param event 事件
   * @param random 是否随机一个
   * @param args 参数
   * @returns
   */
  async globalEmit(event: string, random: boolean = false, ...args) {
    // 如果是本地运行还是转普通模式
    if (this.app.getEnv() === "local") {
      this.emit(event, ...args);
      return;
    }
    pm2.connect(() => {
      pm2.list((err, list) => {
        const ps = list.map((e) => {
          return {
            id: e.pm_id,
            name: e.name,
          };
        });
        // random 为 true 时随机发给同名称的一个进程
        if (random) {
          // 按名称分组
          const group = _.groupBy(ps, "name");
          const names = Object.keys(group);
          // 遍历名称
          names.forEach((name) => {
            const pss = group[name];
            // 随机一个
            const index = _.random(0, pss.length - 1);
            const ps = pss[index];
            // 发给这个进程
            // @ts-ignore
            pm2.sendDataToProcessId(
              {
                type: "process:msg",
                data: {
                  type: `${COOL_EVENT_MESSAGE}@${this.keys}`,
                  event,
                  args,
                },
                id: ps.id,
                topic: "cool:event:topic",
              },
              (err, res) => {}
            );
          });
        } else {
          // 发给所有进程
          ps.forEach((e) => {
            // @ts-ignore
            pm2.sendDataToProcessId(
              {
                type: "process:msg",
                data: {
                  type: `${COOL_EVENT_MESSAGE}@${this.keys}`,
                  event,
                  args,
                },
                id: e.id,
                topic: "cool:event:topic",
              },
              (err, res) => {}
            );
          });
        }
      });
    });
  }

  /**
   * 处理事件
   * @param module
   */
  async handlerEvent(module) {
    const events = getClassMetadata(COOL_EVENT_KEY, module);
    for (const event of events) {
      const listen = event.eventName ? event.eventName : event.propertyKey;
      if (!this.eventData[listen]) {
        this.eventData[listen] = [];
      }
      this.eventData[listen].push({
        module,
        method: event.propertyKey,
      });
    }
  }

  /**
   * 全局事件
   */
  async globalEvent() {
    process.on("message", async (message: any) => {
      const data = message.data;
      if (data.type != `${COOL_EVENT_MESSAGE}@${this.keys}`) return;
      await this.doAction(message);
    });
  }

  /**
   * 普通事件
   */
  async commEvent() {
    this.on(COOL_EVENT_MESSAGE, async (message: any) => {
      await this.doAction(message);
    });
  }

  /**
   * 执行事件
   * @param message
   */
  async doAction(message) {
    const data = message.data;
    const method = data.event;
    const args = data.args;
    if (this.eventData[method]) {
      for (const event of this.eventData[method]) {
        const moduleInstance = await this.app
          .getApplicationContext()
          .getAsync(event.module);
        moduleInstance[event.method](...args);
      }
    }
  }
}
