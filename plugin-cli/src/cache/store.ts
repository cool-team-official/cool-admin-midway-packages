import * as FsStore from "@cool-midway/cache-manager-fs-hash";

/**
 * cool 基于磁盘的缓存
 */
export class FsCacheStore {
  options: any;

  store: FsStore;

  constructor(options = {}) {
    options = {
      ...options,
      path: "cache",
      ttl: -1,
    };
    this.options = options;
    this.store = FsStore.create(options);
  }

  /**
   * 获得
   * @param key
   * @returns
   */
  async get<T>(key: string): Promise<T> {
    return await this.store.get(key);
  }

  /**
   * 设置
   * @param key
   * @param value
   * @param ttl
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    let t = ttl ? ttl : this.options.ttl;
    if (t > 0) {
      t = t / 1000;
    }
    await this.store.set(key, value, {
      ttl: t,
    });
  }

  /**
   * 删除
   * @param key
   */
  async del(key: string): Promise<void> {
    await this.store.del(key);
  }

  /**
   * 重置
   */
  async reset(): Promise<void> {
    await this.store.reset();
  }
}

export const CoolCacheStore = function (options = {}) {
  return new FsCacheStore(options);
};
