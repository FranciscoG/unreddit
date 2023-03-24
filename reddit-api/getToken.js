const request = require("./request.js");
const { parseBodyHelper, wait } = require("./helpers.js");

const ACCESS_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

/**
 * @param {string} username
 * @param {string} password
 * @param {string} app_id
 * @param {string} api_secret
 * @param {string} user_agent
 * @param {number} retry_on_server_error
 * @param {number} retry_delay
 * @param {boolean} handleErrors
 * @param {function} logHelper
 * @returns {Promise<{ token_expiration?: number, token: string }>}
 */
async function get_token_helper(
  username,
  password,
  app_id,
  api_secret,
  user_agent,
  retry_on_server_error,
  retry_delay,
  handleErrors,
  logHelper
) {
  const { res, body } = await request({
    url: ACCESS_TOKEN_URL,
    form: {
      grant_type: "password",
      username,
      password,
    },
    auth: {
      user: app_id,
      pass: api_secret,
    },
    headers: {
      "User-Agent": user_agent,
    },
    method: "POST",
  });

  // The status
  let status_class = Math.floor(res.statusCode / 100);

  let new_token_expiration;
  let token;

  if (status_class === 2) {
    // 200 Level so **quickly** return.
    let token_info = parseBodyHelper(body, logHelper);

    new_token_expiration = Date.now() / 1000 + token_info.expires_in / 2;

    token = token_info.token_type + " " + token_info.access_token;

    if (!token_info.token_type || !token_info.access_token) {
      logHelper(
        "The token retrieved was undefined. The username which we couln't get a token for is: " +
          username
      );
    }

    return { token, token_expiration: new_token_expiration };
  }

  if (status_class === 4) {
    // Most likely a 403 here
    logHelper(
      `Getting token has resulted in: ${res.statusCode} here. This can originate from not giving this user access in your Reddit App Preferences. Can't obtain token.`
    );

    return { token, token_expiration: new_token_expiration };
  }

  if (status_class === 5) {
    // 503 possibly, server error most likely. do some retries if specified.

    if (retry_on_server_error > 0 && handleErrors) {
      logHelper(
        `Received server error when trying to get token, attempting ${retry_on_server_error} retries.`
      );
      token = await get_token_server_error_looper(
        // everything but handleErrors is passed through
        username,
        password,
        app_id,
        api_secret,
        user_agent,
        retry_on_server_error,
        retry_delay,
        logHelper
      );
      return { token, token_expiration: new_token_expiration };
    } else {
      if (handleErrors) {
        logHelper(
          `Getting token has resulted in: ${res.statusCode} here. Try enabling retries on server errors to automatically retry on this error.`
        );
      }

      // both of these will be undefined
      return { token, token_expiration: new_token_expiration };
    }
  }

  return { token, token_expiration: new_token_expiration };
}

/**
 *
 * @param {string} username
 * @param {string} password
 * @param {string} app_id
 * @param {string} api_secret
 * @param {string} user_agent
 * @param {number} retry_on_server_error
 * @param {number} retry_delay
 * @param {function} logHelper
 * @returns {Promise<{ token_expiration?: number, token: string }>}
 */
async function get_token_server_error_looper(
  username,
  password,
  app_id,
  api_secret,
  user_agent,
  retry_on_server_error,
  retry_delay,
  logHelper
) {
  while (retry_on_server_error > 0) {
    const result = await get_token_helper(
      username,
      password,
      app_id,
      api_secret,
      user_agent,
      retry_on_server_error,
      retry_delay,
      false,
      logHelper
    );

    if (result) {
      return result;
    }

    retry_on_server_error--;

    await wait(retry_delay * 1000);
  }
}

module.exports = {
  get_token_helper,
};
