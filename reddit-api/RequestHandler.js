const request = require("./request.js");
const { parseBodyHelper, wait, logger } = require("./helpers.js");

class RequestHandler {
  /**
   * @param {() => Promise<string>} getToken function that provides token
   * @param {object} options
   * @param {string} options.user_agent
   * @param {boolean} options.retry_on_wait
   * @param {boolean} options.retry_on_server_error
   * @param {number} options.retry_delay
   * @param {number} options.logs
   */
  constructor(getToken, options = {}) {
    this.getToken = getToken;
    this.user_agent = options.user_agent;
    this.retry_on_wait = !!options.retry_on_wait;
    this.retry_on_server_error = !!options.retry_on_server_error;
    this.retry_delay = options.retry_delay;
    this.logging_enabled = !!options.logs;
  }

  /**
   * @param {string} logType 'ERROR' 'INFO', etc
   * @param  {...any} args
   */
  log(logType, ...args) {
    if (this.logging_enabled) {
      logger(logType, ...args);
    }
  }

  /**
   *
   * @param {string} token
   * @param {string} endpoint
   * @param {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method
   * @param {object} data
   * @param {number} waitingRetryCount
   * @param {boolean} retryOnServerErrorEnabled
   * @param {boolean} retryOn403
   * @returns {Promise<[number, any]>} [statusCode, body]
   */
  async make_request(
    token,
    endpoint,
    method,
    data,
    waitingRetryCount,
    retryOnServerErrorEnabled,
    retryOn403
  ) {
    const { user_agent, retry_on_wait, retry_on_server_error, retry_delay } = this.options;
    let request_options = {
      url: endpoint,
      method,
      headers: {
        Authorization: token,
        "User-Agent": user_agent,
      },
    };

    if (method === "GET") {
      request_options.qs = data;
    } else if (method === "PATCH" || method === "PUT" || method === "DELETE") {
      request_options.body = data;
      request_options.json = true;
    } else if (method === "POST") {
      request_options.form = data;
    }

    this.log("INFO", "Making " + method + " request to: " + endpoint);

    const { res, body: body_json } = await request(request_options);

    // dont parse if its already an object
    const body = parseBodyHelper(body_json, this.log);

    // The status
    const status_class = Math.floor(res.statusCode / 100);

    this.log("INFO", "Received response with the following statusCode: " + res.statusCode);

    // 1xx information
    if (status_class === 1) {
      return [res.statusCode, body];
    }

    // 2xx <-- good!
    if (status_class === 2) {
      if (!body?.json?.ratelimit) {
        return [res.statusCode, body];
      }

      const retryingSec = body.json.ratelimit;
      if (retryingSec > 0 && retry_on_wait && waitingRetryCount === 0) {
        this.log("INFO", `Retrying [in ${retryingSec} seconds] making request due to ratelimit.`);
        await wait(retryingSec * 1000);
        // Retry this now that the wait is complete.
        return await this.make_request(
          token,
          endpoint,
          method,
          data,
          waitingRetryCount + 1,
          true,
          true
        );
      } else {
        throw new Error(
          `You are doing this too much, try again in: ${body.json.ratelimit} seconds`
        );
      }
    }

    // 3xx <-- redirection
    if (status_class === 3) {
      return [res.statusCode, body];
    }

    // 4xx <-- client error, your fault ;-p
    if (status_class === 4) {
      // If this is a 403 (Forbidden) usually means that the access token has expired, so get a new token and retry.
      if (res.statusCode === 403 && retryOn403) {
        this.log("WARN", "Encountered 403, retrying after grabbing new token.");

        const token = await this.getToken();
        const results = await this.make_request(
          token,
          endpoint,
          method,
          data,
          waitingRetryCount,
          retryOnServerErrorEnabled,
          false // setting retryOn403 to false here so we don't try again. The issue must be something else besides token expired
        );
        return results;
      }

      if (res.statusCode === 403) {
        throw new Error("Received two 403's in a row. Not retrying again.");
      }

      return [res.statusCode, body];
    }

    // 5xx Something happened on the server side (Reddit's fault)
    if (status_class === 5) {
      if (retry_on_server_error > 0 && retryOnServerErrorEnabled) {
        const results = await this.make_request_helper(
          token,
          endpoint,
          method,
          data,
          retry_delay,
          retry_on_server_error
        );
        return results;
      } else {
        throw new Error(`server error has occured: ${res.statusCode} and body: ${body}`);
      }
    }

    throw new Error(
      "Shouldn't have reached here. StatusCode: " + res.statusCode + " and Body: " + body
    );
  }

  /**
   *
   * @param {string} token
   * @param {string} endpoint
   * @param {'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'} method
   * @param {object} data
   * @param {number} retry_delay
   * @param {boolean} retry_on_server_error
   * @returns {Promise<[number, any]>} [statusCode, body]
   */
  async make_request_helper(token, endpoint, method, data, retry_delay, retry_on_server_error) {
    while (retry_on_server_error > 0) {
      try {
        const results = await this.make_request(token, endpoint, method, data, 0, false, true);
        return results;
      } catch (err) {
        const errSplit = err.toString().split("server error");
        if (errSplit.length >= 2) {
          await wait(retry_delay * 1000);
          this.log("ERROR", "Got Server Error. Retrying Request.");
          retry_on_server_error--;
        }
      }
    }
    this.log("ERROR", "This should not be reached! Please report a bug!");
  }
}

module.exports = RequestHandler;