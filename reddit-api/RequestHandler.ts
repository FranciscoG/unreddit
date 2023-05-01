import { CustomRequestConfig, request } from "./request.ts";
import { wait } from "./helpers.ts";
import { retry } from "./retry.ts";
import { ApiError } from "./ApiError.ts";
import type {
  OptionalOptions,
  RedditTokenResponse,
  RequestData,
  RequestMethods,
  RequiredOptions,
} from "./types.ts";
import { Logger } from "./logger.ts";

const ACCESS_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

export abstract class RequestHandler {
  abstract logger: Logger;
  abstract options: RequiredOptions & Required<OptionalOptions>;
  token_expiration = 0;
  token? = "";

  async request(
    endpoint: string,
    method: RequestMethods,
    data?: RequestData,
  ) {
    const {
      retry_on_server_error,
      retry_delay,
    } = this.options;

    if (!this.token || Date.now() / 1000 >= this.token_expiration) {
      const { token, token_expiration } = await this.get_token();

      if (token_expiration) {
        this.token_expiration = token_expiration;
      }
      this.token = token;
    }

    const request_options: CustomRequestConfig = {
      url: endpoint,
      method,
      headers: {
        Authorization: this.token || "",
        "User-Agent": this.options.user_agent,
      },
    };

    if (method === "PATCH" || method === "PUT" || method === "DELETE") {
      request_options.body = data;
      request_options.json = true;
    } else if (method === "POST") {
      request_options.body = data;
    }

    function apiRquest() {
      return request(request_options);
    }

    this.logger.log("INFO", `Making ${method} request to: ${endpoint}`);

    const res = await retry(
      apiRquest,
      retry_on_server_error + 1, // default is 0, add 1 to make request at least once
      retry_delay,
      false,
      this.logger.log,
    );

    return this.handleResponse(res, endpoint, method, data);
  }

  async handleResponse(
    res: Response,
    endpoint: string,
    method: RequestMethods,
    data: RequestData | undefined,
  ): Promise<[number, unknown]> {
    const body = await res.json();

    // The status
    const status_class = Math.floor(res.status / 100);

    // 1xx information
    if (status_class === 1) {
      return [res.status, body];
    }

    // 2xx <-- good!
    if (status_class === 2) {
      if (!body?.json?.ratelimit) {
        return [res.status, body];
      }

      const retryingSec = body.json.ratelimit;
      if (retryingSec > 0) {
        this.logger.log(
          "INFO",
          `Retrying in ${retryingSec} seconds due to ratelimit.`,
        );
        await wait(retryingSec * 1000);
        // Retry this now that the wait is complete.
        return await this.request(
          endpoint,
          method,
          data,
        );
      } else {
        throw new ApiError(
          `You are doing this too much, try again in: ${body.json.ratelimit} seconds`,
          res,
        );
      }
    }

    // 3xx <-- redirection
    if (status_class === 3) {
      return [res.status, body];
    }

    // 4xx <-- client error, user's fault
    if (status_class === 4) {
      throw new ApiError(
        "Received two 403's in a row. Not retrying again.",
        res,
      );
    }

    // 5xx Something happened on the server side (Reddit's fault)
    if (status_class === 5) {
      throw new ApiError(
        `Server error has occured: ${res.status} and body: ${body}`,
        res,
      );
    }

    throw new ApiError(
      `Shouldn't have reached here. StatusCode ${res.status}`,
      res,
    );
  }

  async get_token(): Promise<{ token_expiration: number; token: string }> {
    const {
      username,
      password,
      app_id,
      app_secret,
      user_agent,
      retry_on_server_error,
      retry_delay,
    } = this.options;

    const formData = new FormData();
    formData.append("grant_type", "password");
    formData.append("username", username);
    formData.append("password", password);

    function fetchTokenRequest() {
      return request({
        url: ACCESS_TOKEN_URL,
        body: formData,
        auth: {
          user: app_id,
          pass: app_secret,
        },
        headers: {
          "User-Agent": user_agent,
        },
        method: "POST",
      });
    }

    const res = await retry(
      fetchTokenRequest,
      retry_on_server_error + 1, // default is 0, add 1 to make request at least once
      retry_delay,
      false,
      this.logger.log,
    );

    const body: RedditTokenResponse = await res.json();

    const status_class = Math.floor(res.status / 100);

    // 2xx - success, return token and expiration
    if (status_class === 2) {
      const token_expiration = Date.now() / 1000 + body.expires_in / 2;
      const token = body.token_type + " " + body.access_token;

      if (!body.token_type || !body.access_token) {
        this.logger.log(
          "The token retrieved was undefined. The username which we couln't get a token for is: " +
            username,
        );
      }

      return { token, token_expiration };
    }

    // 4xx - Client error (user's fault), most likely a 403 'forbidden'
    if (status_class === 4) {
      const errorMsg =
        `Getting token has resulted in: ${res.status} here. This can originate from not giving this user access in your Reddit App Preferences. Can't obtain token.`;
      this.logger.log("ERROR", errorMsg);

      throw new ApiError(errorMsg, res);
    }

    // 5xx - internal server error (Reddit's fault), will retry
    if (status_class === 5) {
      // if we get here then either we have:
      // - we have exhausted our retries
      // - never enabled retries in the first place
      const msg =
        `Getting token has resulted in: ${res.status} here. Try enabling retries on server errors to automatically retry on this error.`;
      this.logger.log("ERROR", msg);
      throw new ApiError(msg, res);
    }

    // shouldn't get here, throw error
    throw new ApiError("Unknown error", res);
  }
}
