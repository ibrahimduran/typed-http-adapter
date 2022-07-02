import { HttpAdapterBuilder } from './builder';
import type {
  FindOperationByPath,
  HttpAdapterOptions,
  HttpAdapterProxyFunction,
  Operation,
  OperationPathsByMethod,
} from './types';

export class HttpAdapter<O extends Array<Operation>> {
  public readonly proxy: {
    [Key in O[number]['Key']]: HttpAdapterProxyFunction<
      Extract<O[number], { Key: Key }>
    >;
  };

  constructor(private readonly opts: HttpAdapterOptions<O> = {}) {
    this.proxy = new Proxy<this['proxy']>({} as any, {
      get: (_target, p) => (paths?: any) => {
        const builder = this.call(String(p));
        if (paths) {
          builder.path(paths);
        }
        return builder;
      },
    });
  }

  call<Index extends number, Key extends O[Index]['Key']>(
    id: Key
  ): HttpAdapterBuilder<O[Index]> {
    const idStr = String(id);
    const op = this.opts.operations?.[id];

    if (!op) {
      throw new Error(
        `Operation not found in dictionary for "${idStr}" operation.`
      );
    }

    return new HttpAdapterBuilder({
      path: op.path,
      method: op.method,
      ...this.opts,
    });
  }

  get<P extends OperationPathsByMethod<O, 'GET'>>(path: P) {
    return new HttpAdapterBuilder<FindOperationByPath<O, P>>({
      path,
      method: 'GET',
      ...this.opts,
    });
  }

  post<P extends OperationPathsByMethod<O, 'POST'>>(path: P) {
    return new HttpAdapterBuilder<FindOperationByPath<O, P>>({
      path,
      method: 'POST',
      ...this.opts,
    });
  }

  put<P extends OperationPathsByMethod<O, 'PUT'>>(path: P) {
    return new HttpAdapterBuilder<FindOperationByPath<O, P>>({
      path,
      method: 'PUT',
      ...this.opts,
    });
  }

  delete<P extends OperationPathsByMethod<O, 'DELETE'>>(path: P) {
    return new HttpAdapterBuilder<FindOperationByPath<O, P>>({
      path,
      method: 'DELETE',
      ...this.opts,
    });
  }

  request(
    path: string,
    opts: {
      method?: string;
      type?: string;
      body?: any;
      query?: Record<string, any>;
      path?: Record<string, any>;
    } = {}
  ) {
    const builder = new HttpAdapterBuilder<
      any,
      { Body: true; Query: true; Path: true }
    >({
      path,
      method: opts.method ?? 'GET',
      ...this.opts,
    });

    if (opts.type && opts.body) {
      builder.body(opts.type, opts.body);
    }

    if (opts.query) {
      builder.query(opts.query);
    }

    if (opts.path) {
      builder.path(opts.path);
    }

    return builder;
  }
}
