import { COOL_METHOD_TAG_KEY, CoolUrlTagConfig } from './../decorator/tag';
import {
  CONTROLLER_KEY,
  getClassMetadata,
  listPropertyDataFromClass,
  listModule,
  Provide,
  Scope,
  ScopeEnum,
  WEB_ROUTER_KEY,
} from '@midwayjs/core';
import { COOL_URL_TAG_KEY } from '../decorator/tag';
import * as _ from 'lodash';

/**
 * URL标签
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class CoolUrlTagData {
  data = {};

  /**
   * 初始化
   */
  async init() {
    // 类标记
    await this.classTag();
    // 方法标记
    await this.methodTag();
  }

  /**
   * 类标记
   */
  async classTag() {
    const tags = listModule(COOL_URL_TAG_KEY);
    for (const controller of tags) {
      // class的标记
      const controllerOption = getClassMetadata(CONTROLLER_KEY, controller);
      const tagOption: CoolUrlTagConfig = getClassMetadata(
        COOL_URL_TAG_KEY,
        controller
      );
      if (tagOption?.key) {
        const data: string[] = this.data[tagOption.key] || [];
        this.data[tagOption.key] = _.uniq(
          data.concat(
            (tagOption?.value || []).map(e => {
              return controllerOption.prefix + '/' + e;
            })
          )
        );
      }
    }
  }

  /**
   * 方法标记
   */
  async methodTag() {
    const controllers = listModule(CONTROLLER_KEY);
    for (const controller of controllers) {
      const controllerOption = getClassMetadata(CONTROLLER_KEY, controller);
      // 方法标记
      const listPropertyMetas = listPropertyDataFromClass(
        COOL_METHOD_TAG_KEY,
        controller
      );
      const requestMetas = getClassMetadata(WEB_ROUTER_KEY, controller);
      for (const propertyMeta of listPropertyMetas) {
        const _data = this.data[propertyMeta.tag] || [];
        const requestMeta = _.find(requestMetas, { method: propertyMeta.key });
        if (requestMeta && controllerOption) {
          this.data[propertyMeta.tag] = _.uniq(
            _data.concat(controllerOption.prefix + requestMeta.path)
          );
        }
      }
    }
  }

  /**
   * 根据键获得
   * @param key
   * @param type
   * @returns
   */
  byKey(key: string, type?: 'app' | 'admin'): string[] {
    return this.data[key]?.filter(e => {
      return type ? _.startsWith(e, `/${type}/`) : true;
    });
  }
}
