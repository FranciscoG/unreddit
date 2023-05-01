import { RequestHandler } from "./RequestHandler.ts";
import { Logger } from "./logger.ts";

import type { OptionalOptions, RequestData, RequiredOptions } from "./types.ts";

const REGULAR_REDDIT_URL = "https://oauth.reddit.com";

const defaultOptions: Required<OptionalOptions> = {
  logs: false,
  user_agent: "unreddit",
  retry_on_wait: false,
  retry_on_server_error: 0,
  retry_delay: 5,
};

export class RedditApi extends RequestHandler {
  options: RequiredOptions & Required<OptionalOptions>;
  logger: Logger;

  constructor(options: RequiredOptions & OptionalOptions) {
    super();

    // user options will override defaultOptions
    this.options = { ...defaultOptions, ...options };

    this.logger = new Logger(this.options.logs);
  }

  get(endpoint: string) {
    return this.request(
      REGULAR_REDDIT_URL + endpoint,
      "GET",
    );
  }

  post(endpoint: string, data: RequestData) {
    return this.request(
      REGULAR_REDDIT_URL + endpoint,
      "POST",
      data,
    );
  }

  patch(endpoint: string, data: RequestData) {
    return this.request(
      REGULAR_REDDIT_URL + endpoint,
      "PATCH",
      data,
    );
  }

  put(endpoint: string, data: RequestData) {
    return this.request(
      REGULAR_REDDIT_URL + endpoint,
      "PUT",
      data,
    );
  }

  del(endpoint: string, data: RequestData) {
    return this.request(
      REGULAR_REDDIT_URL + endpoint,
      "DELETE",
      data,
    );
  }
}
