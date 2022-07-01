import type { HttpAdapterBuilder } from './builder';

type GetterOption<T> = T | (() => T) | (() => Promise<T>);

export interface HttpAdapterOptions {
  baseUrl?: GetterOption<string | null>;
  authorization?: GetterOption<string | null>;
}

export type Operations = {
  [key: string]: {
    Method: 'GET' | 'POST';
    Query: Record<string, unknown>;
    Path: Record<string, unknown>;
    Body: Record<string, unknown>;
    Response: Record<number, unknown>;
  };
};

export type OperationsIdsByMethod<
  O extends Operations,
  M extends 'GET' | 'POST'
> = ValueOf<{
  [Key in keyof O]: O[Key]['Method'] extends M ? Key : never;
}>;

export type SuccessStatusCodes =
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226;

export type OperationSendResponse<O extends Operations[string]> = ValueOf<{
  [S in SuccessStatusCodes]: O['Response'] extends { [SS in S]: infer T }
    ? T
    : never;
}>;

export type OperationRawResponse<O extends Operations[string]> = ValueOf<{
  [S in keyof O['Response']]: {
    status: S;
    body: O['Response'][S];
  };
}>;

export type ValueOf<T> = T[keyof T];

export type HttpAdapterProxyFunction<O extends Operations[string]> = {
  (): HttpAdapterBuilder<O>;
  (path: O['Path']): HttpAdapterBuilder<
    O,
    { Path: true; Query: false; Body: false }
  >;
  (path: O['Path']): HttpAdapterBuilder<
    O,
    { Path: true; Query: false; Body: false }
  >;
};

export type OpenAPI3SchemaAdapter<O> = {
  [Key in keyof O]: {
    Method: never;
    Query: O[Key] extends { parameters: { query: Record<string, unknown> } }
      ? O[Key]['parameters']['query']
      : never;
    Path: O[Key] extends { parameters: { path: Record<string, unknown> } }
      ? O[Key]['parameters']['path']
      : never;
    Body: O[Key] extends { requestBody: { content: Record<string, unknown> } }
      ? O[Key]['requestBody']['content']
      : never;
    Response: O[Key] extends { responses: Record<number, any> }
      ? {
          [S in keyof O[Key]['responses']]: O[Key]['responses'][S] extends {
            content: { 'application/json': infer T };
          }
            ? T
            : Record<never, never>;
        }
      : Record<number, never>;
  };
};

export class HttpAdapterError extends Error {
  public readonly result: HttpAdapterResult | undefined;

  constructor(props: Pick<HttpAdapterError, 'result' | 'message'>) {
    super(props.message);

    this.result = props.result;
  }
}

export class HttpAdapterResult {
  public readonly status: number;
  public readonly body: any;
  public readonly error?: any | undefined;
  public readonly message?: string | undefined;
  public readonly response?: Response | undefined;

  constructor(props: HttpAdapterResult) {
    this.status = props.status;
    this.body = props.body;
    this.message = props.message;
    this.response = props.response;
  }

  static async createFromError(err: any) {
    return new HttpAdapterResult({
      status: -1,
      body: null,
      error: err,
      message: err?.message,
      response: undefined,
    });
  }

  static async createFromResponse(res: Response) {
    let json: any;

    try {
      json = await res.json();
    } catch {
      //
    }

    return new HttpAdapterResult({
      status: res.status,
      body: json,
      response: res,
    });
  }
}
