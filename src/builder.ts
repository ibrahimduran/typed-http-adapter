import normalizeUrl from 'normalize-url';
import type {
  HttpAdapterOptions,
  Operation,
  OperationRawResponse,
  OperationSendResponse,
} from './types';
import { HttpAdapterError, HttpAdapterResult } from './types';

export class HttpAdapterBuilder<
  O extends Operation,
  Inserted extends { Body: boolean; Query: boolean; Path: boolean } = {
    Body: false;
    Query: false;
    Path: false;
  }
> {
  private _path: any;
  private _query: any;
  private _type: any;
  private _body: any;
  private _token: string | null | undefined;
  private _auth_prefix: string | null | undefined;
  private _headers: any = {};

  constructor(
    private readonly opts: {
      path: string;
      method: string;
    } & HttpAdapterOptions<O>
  ) {}

  path(
    vars: O['Param']['Path']
  ): HttpAdapterBuilder<O, Inserted & { Path: true }> {
    this._path = vars;
    return this;
  }

  query(
    vars: O['Param']['Query']
  ): HttpAdapterBuilder<O, Inserted & { Query: true }> {
    this._query = vars;
    return this;
  }

  header(key: string, value: string) {
    this._headers[key] = value;
    return this;
  }

  bearer(value: string | null | undefined) {
    this._token = value;
    this._auth_prefix = 'Bearer';
    return this;
  }

  auth(prefix: string | null | undefined, value: string | null | undefined) {
    this._auth_prefix = prefix;
    this._token = value;
    return this;
  }

  body<T extends keyof O['Body'] = never, A extends string = never>(
    type: T extends `application/${A}` ? A : T,
    vars: O['Body'][T]
  ): HttpAdapterBuilder<O, Inserted & { Body: true }> {
    this._type =
      (String(type).indexOf('/') === -1 ? 'application/' : '') + String(type);
    this._body = vars;
    return this;
  }

  public readonly raw: O['Body'] & Inserted['Body'] extends never | true
    ? O['Param']['Query'] & Inserted['Query'] extends never | true
      ? O['Param']['Path'] & Inserted['Path'] extends never | true
        ? () => Promise<OperationRawResponse<O>>
        : never
      : never
    : never = this._raw as any;

  public readonly send: O['Body'] & Inserted['Body'] extends never | true
    ? O['Param']['Query'] & Inserted['Query'] extends never | true
      ? O['Param']['Path'] & Inserted['Path'] extends never | true
        ? () => Promise<OperationSendResponse<O>>
        : { path: never }
      : { query: never }
    : { body: never } = this._send as any;

  private async _send() {
    const result = await this._raw();

    if (result.status >= 200 && result.status <= 299) {
      return result.body;
    }

    const url = await this._buildUrl();
    throw new HttpAdapterError({
      result,
      message: `${this.opts.method.toUpperCase()} ${url} returned ${
        result.status
      }`,
    });
  }

  private async _raw() {
    const method = this.opts.method;
    const url = await this._buildUrl();
    const body = await this._buildBody();
    const headers = await this._buildHeaders(body != null);

    if (typeof this._token !== 'undefined') {
      if (this._token) {
        headers['Authorization'] = `${
          this._auth_prefix ? `${this._auth_prefix} ` : ''
        }${this._token}`;
      } else {
        delete headers['Authorization'];
      }
    }

    let res: Response;

    try {
      res = await fetch(url, {
        method,
        body,
        headers,
      });
    } catch (err) {
      return await HttpAdapterResult.createFromError(err);
    }

    return await HttpAdapterResult.createFromResponse(res);
  }

  private async _buildUrl() {
    let path = this.opts.path;

    for (const key in this._path) {
      if (this._path[key] == null) {
        continue;
      }

      const value = String(this._path[key]);
      path = path.replace(`{${key}}`, value).replace(`:${key}`, value);
    }

    let searchParams = Object.entries(this._query || {})
      .filter(([, value]) => value != null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
      .join('&');

    if (searchParams.length > 0) {
      searchParams = (path.indexOf('?') === -1 ? '?' : '&') + searchParams;
    }

    const baseUrl =
      typeof this.opts.baseUrl === 'function'
        ? await this.opts.baseUrl()
        : this.opts.baseUrl;

    return normalizeUrl(`${baseUrl || ''}${path}${searchParams}`, {
      removeTrailingSlash: false,
    });
  }

  private async _buildHeaders(hasBody: boolean) {
    const dict: Record<string, string> = {};

    if (hasBody) {
      dict['Content-Type'] = this._type;
    }

    if (this.opts.authorization) {
      const authorization =
        typeof this.opts.authorization === 'function'
          ? await this.opts.authorization()
          : this.opts.authorization;

      if (authorization) {
        dict['Authorization'] = authorization;
      }
    }

    Object.assign(dict, this._headers);

    return dict;
  }

  private async _buildBody() {
    if (this._type === 'application/json') {
      return JSON.stringify(this._body);
    }

    if (this._type === 'multipart/form-data') {
      const data = new FormData();

      Object.entries(this._body).forEach(([key, val]) =>
        data.append(key, val instanceof Blob ? val : String(val))
      );

      return data;
    }

    if (this._type === 'application/x-www-form-urlencoded') {
      return Object.entries(this._body)
        .map(([key, val]) => `${key}=${encodeURIComponent(String(val))}`)
        .join('&');
    }

    return this._body;
  }
}
