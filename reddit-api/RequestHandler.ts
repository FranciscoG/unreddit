import { CustomRequestConfig, request } from "./request.ts";
import { logger, wait } from "./helpers.ts";
import type { OptionalOptions, RequestData, RequestMethods } from "./types.d.ts";
import { ApiError } from './ApiError.ts';

export class RequestHandler {
  getToken: () => Promise<string>;
  user_agent: string;
  retry_on_wait: boolean;
  retry_on_server_error: number;
  retry_delay: number;
  logging_enabled: boolean;

  constructor(
    getToken: () => Promise<string>,
    options: Required<OptionalOptions>,
  ) {
    this.getToken = getToken;
    this.user_agent = options.user_agent;
    this.retry_on_wait = options.retry_on_wait;
    this.retry_on_server_error = options.retry_on_server_error;
    this.retry_delay = options.retry_delay;
    this.logging_enabled = options.logs;
  }

  /**
   * @param {string} logType 'ERROR' 'INFO', etc
   * @param  {...any} args
   */
  log(logType: string, ...args: unknown[]) {
    if (this.logging_enabled) {
      logger(logType, ...args);
    }
  }

  async make_request(
    token: string,
    endpoint: string,
    method: RequestMethods,
    data: RequestData,
    waitingRetryCount: number,
    retryOnServerErrorEnabled: boolean,
    retryOn403: boolean,
  ): Promise<[number, unknown]> {
    const request_options: CustomRequestConfig = {
      url: endpoint,
      method,
      headers: {
        Authorization: token,
        "User-Agent": this.user_agent || "unreddit",
      },
    };

    if (method === "PATCH" || method === "PUT" || method === "DELETE") {
      request_options.body = data;
      request_options.json = true;
    } else if (method === "POST") {
      request_options.body = data;
    }

    this.log("INFO", `Making ${method} request to: ${endpoint}`);

    const res = await request(request_options);

    // dont parse if its already an object
    const body = await res.json()

    // The status
    const status_class = Math.floor(res.status / 100);

    this.log(
      "INFO",
      `Received response with the following statusCode: ${res.status}`,
    );

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
      if (retryingSec > 0 && this.retry_on_wait && waitingRetryCount === 0) {
        this.log(
          "INFO",
          `Retrying [in ${retryingSec} seconds] making request due to ratelimit.`,
        );
        await wait(retryingSec * 1000);
        // Retry this now that the wait is complete.
        return await this.make_request(
          token,
          endpoint,
          method,
          data,
          waitingRetryCount + 1,
          true,
          true,
        );
      } else {
        throw new ApiError(
          `You are doing this too much, try again in: ${body.json.ratelimit} seconds`,
          res
        );
      }
    }

    // 3xx <-- redirection
    if (status_class === 3) {
      return [res.status, body];
    }

    // 4xx <-- client error, user's fault
    if (status_class === 4) {
      // If this is a 403 (Forbidden) usually means that the access token has expired, so get a new token and retry.
      if (res.status === 403 && retryOn403) {
        this.log("WARN", "Encountered 403, retrying after grabbing new token.");

        const token = await this.getToken();
        const results = await this.make_request(
          token,
          endpoint,
          method,
          data,
          waitingRetryCount,
          retryOnServerErrorEnabled,
          false, // setting retryOn403 to false here so we don't start another retry loop
        );
        return results;
      }

      throw new ApiError("Received two 403's in a row. Not retrying again.", res);
    }

    // 5xx Something happened on the server side (Reddit's fault)
    if (status_class === 5) {
      if (this.retry_on_server_error > 0 && retryOnServerErrorEnabled) {
        const results = await this.make_request_helper(
          token,
          endpoint,
          method,
          data,
          this.retry_delay,
          this.retry_on_server_error,
        );
        return results;
      } else {
        throw new ApiError(
          `server error has occured: ${res.status} and body: ${body}`,
          res
        );
      }
    }
    throw new ApiError(`Shouldn't have reached here. StatusCode ${res.status}`, res)
  }

  async make_request_helper(
    token: string,
    endpoint: string,
    method: RequestMethods,
    data: RequestData,
    retry_delay: number,
    retry_on_server_error: number,
  ) {
    while (retry_on_server_error > 0) {
      try {
        const results = await this.make_request(
          token,
          endpoint,
          method,
          data,
          0,
          false,
          true,
        );
        return results;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          const isServerError = Math.floor(err.response.status / 100) === 5;
          if (isServerError) {
            await wait(retry_delay * 1000);
            this.log("WARN", "Got Server Error. Retrying Request.");
            retry_on_server_error--;
          } else {
            // we only continue the loop on server error, anything else we
            // break and rethrow the error
            throw err;
          }
        }
      }
    }
  
    this.log("ERROR", "This should not be reached! Please report a bug!");
    throw new Error('Unknown error in make_request_helper')
  }
  
}
