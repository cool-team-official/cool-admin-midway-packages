/**
 * 异常基类
 */
export class BaseException extends Error {
  status: number;
  statusCode: number;

  constructor(
    name: string,
    code: number,
    message: string,
    statusCode?: number
  ) {
    super(message);

    this.name = name;
    this.status = code;
    this.statusCode = statusCode;
  }
}
