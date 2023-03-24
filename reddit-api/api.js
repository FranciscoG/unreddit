const { get_token_helper } = require("./getToken.js");
const { logger } = require("./helpers.js");
const RequestHandler = require("./RequestHandler.js");

module.exports = function (options) {
  const REGULAR_REDDIT_URL = "https://oauth.reddit.com";
  
  const defaultOptions = {
    logs: false,
    user_agent: "unreddit",
    retry_on_wait: false,
    retry_on_server_error: 0,
    retry_delay: 5,
  };
  class API {
    /**
     *
     * @param {object} options
     * @param {string} options.username The Username for the Reddit Account.
     * @param {string} options.password The Password for the Reddit Account.
     * @param {string} options.app_id The Reddit Application ID.
     * @param {string} options.api_secret The Reddit Application Secret.
     * @param {boolean} [options.logs=false] Display logs.
     * @param {string} [options.user_agent='unreddit'] The User Agent for all Reddit API requests.
     * @param {boolean} [options.retry_on_wait=false] If True and Reddit returns a "You are trying this too much" error, it will pause the process for the exact time needed, then retry the request.
     * @param {number} [options.retry_on_server_error=0] If > 0 and Reddit returns a server error (responseCode >= 500 && responseCode <= 599) it will retry the request the number of times you specify + 1 automatically.
     * @param {number} [options.retry_delay=5] Specifies the retry delay for server error retries. (IE. if server error and you specify you want to retry before retrying it will delay for retry_delay seconds.)
     */
    constructor(options) {
      this.token_expiration = 0;
      this.token = null;

      // user options will override defaultOptions
      const mergedOpts = { ...defaultOptions, ...options };

      // add all options as properties of this class
      for (let key in mergedOpts) {
        this[key] = mergedOpts[key];
      }

      this.request = new RequestHandler(this.get_token, mergedOpts);
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
     * @returns {Promise<string>} a promise that resolves with the new token string
     */
    async get_token() {

      if (this.token && Date.now() / 1000 <= this.token_expiration) {
        return this.token
      }

      const { token, token_expiration } = await get_token_helper(
        this.username,
        this.password,
        this.app_id,
        this.api_secret,
        this.user_agent,
        this.retry_on_server_error,
        this.retry_delay,
        true,
        this.log
      );
      if (token_expiration) {
        this.token_expiration = token_expiration;
      }
      this.token = token;
      return token;
    }

    async _method_helper(endpoint, data, URL, METHOD) {
      const token = await this.get_token();
      const results = await this.request.make_request(
        token,
        URL + endpoint,
        METHOD,
        data,
        0,
        true,
        true
      );
      return results;
    }

    get(endpoint, data) {
      let METHOD = "GET";
      let URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    post(endpoint, data) {
      let METHOD = "POST";
      let URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    patch(endpoint, data) {
      let METHOD = "PATCH";
      let URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    put(endpoint, data) {
      let METHOD = "PUT";
      let URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }

    del(endpoint, data) {
      let METHOD = "DELETE";
      let URL = REGULAR_REDDIT_URL;
      return this._method_helper(endpoint, data, URL, METHOD);
    }
  }

  return new API(options);
};
