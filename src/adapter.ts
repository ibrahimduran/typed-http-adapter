import { HttpAdapterBuilder } from './builder';
import type {
  HttpAdapterOptions,
  HttpAdapterProxyFunction,
  Operations,
  OperationsIdsByMethod,
} from './types';

export class HttpAdapter<O extends Operations> {
  private readonly opts: HttpAdapterOptions;
  private readonly paths: Record<string, string>;
  private readonly methods: Record<string, string>;

  public readonly proxy: {
    [Key in keyof O]: HttpAdapterProxyFunction<O[Key]>;
  };

  constructor({
    paths,
    methods,
    ...opts
  }: {
    paths: { [K in keyof O]: string };
    methods: { [K in keyof O]: string };
  } & HttpAdapterOptions) {
    this.opts = opts;
    this.paths = paths;
    this.methods = methods;

    this.proxy = new Proxy<this['proxy']>({} as any, {
      get: (_target, p) => (paths?: any) => {
        const builder = this.createBuilder(String(p));
        if (paths) {
          builder.path(paths);
        }
        return builder;
      },
    });
  }

  call<Key extends keyof O>(id: Key) {
    return this.createBuilder(id);
  }

  get<Key extends OperationsIdsByMethod<O, 'GET'>>(id: Key) {
    return this.createBuilder(id);
  }

  post<Key extends OperationsIdsByMethod<O, 'POST'>>(id: Key) {
    return this.createBuilder(id);
  }

  request(
    path: string,
    opts: {
      method: string;
      type?: string;
      body?: any;
      query?: Record<string, any>;
      params?: Record<string, any>;
    }
  ) {
    new HttpAdapterBuilder({
      path,
      method: opts.method,
    });
  }

  private createBuilder<Key extends keyof O>(
    id: Key
  ): HttpAdapterBuilder<O[Key]> {
    const idStr = String(id);
    const path = this.paths[idStr];
    const method = this.methods[idStr];

    if (!path) {
      throw new Error(`Path not found in dictionary for "${idStr}" operation.`);
    }

    if (!method) {
      throw new Error(`Path not found in dictionary for "${idStr}" operation.`);
    }

    return new HttpAdapterBuilder({
      path,
      method,
      ...this.opts,
    });
  }
}
