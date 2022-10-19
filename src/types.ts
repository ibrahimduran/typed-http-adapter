import type { HttpAdapterBuilder } from './builder';

type GetterOption<T> = T | (() => T) | (() => Promise<T>);

export interface HttpAdapterOptions<T extends Operation> {
  baseUrl?: GetterOption<string | null>;
  authorization?: GetterOption<string | null>;
  operations?: { [Key in T['Key']]?: { path: string; method: string } };
  factory?: (url: string, opts: RequestInit) => RequestInit | Promise<RequestInit>;
}

export type Operation = {
  Key: string;
  Method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD';
  Path: string;
  Param: {
    Query: Record<string, unknown>;
    Path: Record<string, unknown>;
  };
  Body: Record<string, unknown>;
  Response: Record<number, unknown>;
};

export type OperationPathsByMethod<
  O extends Operation,
  M extends 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' | 'HEAD'
> = ValueOf<{
  [Key in O['Key']]: Extract<O, { Key: Key }>['Method'] extends M
    ? Extract<O, { Key: Key }>['Path']
    : never;
}>;

export type FindOperationByPath<
  O extends Operation,
  P extends string
> = ValueOf<{
  [Path in O['Path']]: Path extends P ? Extract<O, { Path: P }> : never;
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

export type OperationSendResponse<O extends Operation> = ValueOf<{
  [S in SuccessStatusCodes]: O['Response'] extends { [SS in S]: infer T }
    ? T
    : never;
}>;

export type OperationRawResponse<O extends Operation> = ValueOf<{
  [S in keyof O['Response']]: {
    status: S;
    body: O['Response'][S];
  };
}>;

export type ValueOf<T> = T[keyof T];

export type HttpAdapterProxyFunction<O extends Operation> = {
  (): HttpAdapterBuilder<O>;
  (path: O['Param']['Path']): HttpAdapterBuilder<
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
  public readonly result: HttpAdapterResult;

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
