/* @flow */
type FunctionAPIRequest = {
  functionString: string,
  codeString: void,
  args: ?Array<any>,
};

type StringAPIRequest = {
  functionString: void,
  codeString: string,
  args?: ?Array<any>,
};

export type APIRequest = FunctionAPIRequest | StringAPIRequest;

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
  code: string | Function,
  args: ?Array<any>
) => Promise<any>;

export type ServerConfig = {
  requireFrom?: string,
};
