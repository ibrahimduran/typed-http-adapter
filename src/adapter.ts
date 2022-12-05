import { HttpAdapterBuilder } from './builder';
import type {
  HttpAdapterOptions,
  HttpAdapterProxyFunction,
  Operation,
  OperationPathsByMethod,
} from './types';

export class HttpAdapter<O extends Operation> {
  public readonly proxy: {
    [Key in O['Key']]: HttpAdapterProxyFunction<Extract<O, { Key: Key }>>;
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

  call<Key extends O['Key']>(
    id: Key
  ): HttpAdapterBuilder<Extract<O, { Key: Key }>> {
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
    return new HttpAdapterBuilder<Extract<O, { Path: P, Method: 'GET' }>>({
      path,
      method: 'GET',
      ...this.opts,
    });
  }

  post<P extends OperationPathsByMethod<O, 'POST'>>(path: P) {
    return new HttpAdapterBuilder<Extract<O, { Path: P, Method: 'POST' }>>({
      path,
      method: 'POST',
      ...this.opts,
    });
  }

  put<P extends OperationPathsByMethod<O, 'PUT'>>(path: P) {
    return new HttpAdapterBuilder<Extract<O, { Path: P, Method: 'PUT' }>>({
      path,
      method: 'PUT',
      ...this.opts,
    });
  }

  delete<P extends OperationPathsByMethod<O, 'DELETE'>>(path: P) {
    return new HttpAdapterBuilder<Extract<O, { Path: P, Method: 'DELETE' }>>({
      path,
      method: 'DELETE',
      ...this.opts,
    });
  }

  request(
    path: string,
    opts: {
      method?: Operation['Method'];
      type?: string;
      body?: any;
      query?: Record<string, any>;
      path?: Record<string, any>;
    } = {}
  ) {
    const builder = new HttpAdapterBuilder<
      {
        Key: string;
        Path: string;
        Method: Operation['Method'];
        Param: {
          Query: Record<string, string>;
          Path: Record<string, string>;
        };
        Body: Record<string, any>;
        Response: any;
      },
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
