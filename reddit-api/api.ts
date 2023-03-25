import { get_token_helper } from "./getToken.ts";
import { logger } from "./helpers.ts";
import { RequestHandler } from "./RequestHandler.ts";
import type {
  OptionalOptions,
  RequestData,
  RequestMethods,
  RequiredOptions,
} from "./types.d.ts";

export function getApi(options: RequiredOptions & OptionalOptions) {
  const REGULAR_REDDIT_URL = "https://oauth.reddit.com";

  const defaultOptions: Required<OptionalOptions> = {
    logs: false,
    user_agent: "unreddit",
    retry_on_wait: false,
    retry_on_server_error: 0,
    retry_delay: 5,
  };

  class API {
    token_expiration = 0;
    token? = "";
    options: RequiredOptions & Required<OptionalOptions>;
    request: RequestHandler;

    constructor(options: RequiredOptions & OptionalOptions) {
      // user options will override defaultOptions
      this.options = { ...defaultOptions, ...options };

      this.request = new RequestHandler(this.get_token, this.options);
    }

    /**
     * @param {string} logType 'ERROR' 'INFO', etc
     * @param  {...any} args
     */
    log(logType: string, ...args: unknown[]) {
      if (this.options.logs) {
        logger(logType, ...args);
      }
    }

    async get_token(): Promise<string> {
      if (this.token && Date.now() / 1000 <= this.token_expiration) {
        return this.token;
      }

      // the cached token expired or does not exist so we request a new one
      // this will also handle retrying if the option was set
      const { token, token_expiration } = await get_token_helper(
        this.options.username,
        this.options.password,
        this.options.app_id,
        this.options.api_secret,
        this.options.user_agent,
        this.options.retry_on_server_error,
        this.options.retry_delay,
        true,
        this.log,
      );
      if (token_expiration) {
        this.token_expiration = token_expiration;
      }
      this.token = token;
      return token;
    }

    async _method_helper(
      endpoint: string,
      data: RequestData,
      URL: string,
      METHOD: RequestMethods,
    ) {
      const token = await this.get_token();
      const results = await this.request.make_request(
        token,
        URL + endpoint,
        METHOD,
        data,
        0,
        true,
        true,
      );
      return results;
    }

    get(endpoint: string, data: RequestData) {
      const METHOD = "GET";
      const URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    post(endpoint: string, data: RequestData) {
      const METHOD = "POST";
      const URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    patch(endpoint: string, data: RequestData) {
      const METHOD = "PATCH";
      const URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    put(endpoint: string, data: RequestData) {
      const METHOD = "PUT";
      const URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    del(endpoint: string, data: RequestData) {
      const METHOD = "DELETE";
      const URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }
  }

  return new API(options);
}
