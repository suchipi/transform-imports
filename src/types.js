/* @flow */
type FunctionAPIRequest = {
  codeId: void,
  functionString: string,
  codeString: void,
  args: ?Array<any>,
};

type StringAPIRequest = {
  codeId: void,
  functionString: void,
  codeString: string,
  args?: ?Array<any>,
};

type IDAPIRequest = {
  codeId: string,
  functionString: void,
  codeString: void,
  args?: ?Array<any>,
};

export type APIRequest = FunctionAPIRequest | StringAPIRequest | IDAPIRequest;

type SuccessfulAPIResponse = { success: true, result: any };
type FailureAPIResponse = {
  success: false,
  err: {
    name: string,
    message: string,
    stack: string,
  },
};

export type APIResponse = SuccessfulAPIResponse | FailureAPIResponse;

export type RunOnServer = (
  code: string | Function | { id: string },
  args: ?Array<any>
) => Promise<any>;

export type ServerConfig = {
  requireFrom?: string,
  idMappings?: IDMappings,
};

export type IDMappings = { [codeId: string]: string | Function };

export type ModuleEnvironment = {
  exports: typeof exports,
  require: typeof require,
  module: typeof module,
  __filename: string,
  __dirname: string,
};
