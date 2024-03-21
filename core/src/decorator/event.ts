import {
  saveClassMetadata,
  saveModule,
  attachClassMetadata,
} from "@midwayjs/decorator";
import { Scope, ScopeEnum } from "@midwayjs/core";

export const COOL_CLS_EVENT_KEY = "decorator:cool:cls:event";

/**
 * 事件配置
 */
export interface CoolEventOptions {
  /** 是否全局 */
  isGlobal: boolean;
}

/**
 * 事件
 * @param options
 * @returns
 */
export function CoolEvent(options = {} as CoolEventOptions): ClassDecorator {
  return (target: any) => {
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(COOL_CLS_EVENT_KEY, target);
    // 保存一些元数据信息，任意你希望存的东西
    saveClassMetadata(COOL_CLS_EVENT_KEY, options, target);
    // 指定 IoC 容器创建实例的作用域，这里注册为请求作用域，这样能取到 ctx
    Scope(ScopeEnum.Singleton)(target);
  };
}

export const COOL_EVENT_KEY = "decorator:cool:event";

/**
 * 事件
 * @param eventName
 * @returns
 */
export function Event(eventName?: string): MethodDecorator {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    attachClassMetadata(
      COOL_EVENT_KEY,
      {
        eventName,
        propertyKey,
        descriptor,
      },
      target
    );
  };
}
