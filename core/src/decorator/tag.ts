import { saveClassMetadata, savePropertyDataToClass, saveModule } from "@midwayjs/decorator";

export const COOL_URL_TAG_KEY = "decorator:cool:url:tag";

export const COOL_METHOD_TAG_KEY = "decorator:cool:method:tag";

export enum TagTypes {
  IGNORE_TOKEN = "ignoreToken",
  IGNORE_SIGN = "ignoreSign",
}

export interface CoolUrlTagConfig {
  key: TagTypes | string;
  value?: string[];
}

/**
 * 打标记
 * @param data
 * @returns
 */
export function CoolUrlTag(data?: CoolUrlTagConfig): ClassDecorator {
  return (target: any) => {
    // 将装饰的类，绑定到该装饰器，用于后续能获取到 class
    saveModule(COOL_URL_TAG_KEY, target);
    // 保存一些元数据信息，任意你希望存的东西
    saveClassMetadata(COOL_URL_TAG_KEY, data, target);
  };
}


/**
 * 方法打标记
 * @param data
 * @returns
 */
export function CoolTag(tag: TagTypes | string): MethodDecorator {
  return (target, key, descriptor: PropertyDescriptor) => {
    savePropertyDataToClass(
      COOL_METHOD_TAG_KEY,
      {
        key,
        tag
      },
      target,
      key
    );
    return descriptor;
  };
}