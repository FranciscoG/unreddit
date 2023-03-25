import { request } from "./request.ts";
import { LoggerFunc, wait } from "./helpers.ts";
import { ApiError } from "./ApiError.ts";
const ACCESS_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";

interface RedditTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function get_token_helper(
  username: string,
  password: string,
  app_id: string,
  api_secret: string,
  user_agent: string,
  retry_on_server_error: number,
  retry_delay: number,
  handleRetries: boolean,
  logHelper: LoggerFunc,
): Promise<{ token_expiration: number; token: string }> {
  const formData = new FormData();
  formData.append("grant_type", "password");
  formData.append("username", username);
  formData.append("password", password);

  const res = await request({
    url: ACCESS_TOKEN_URL,
    body: formData,
    auth: {
      user: app_id,
      pass: api_secret,
    },
    headers: {
      "User-Agent": user_agent,
    },
    method: "POST",
  });
  const body: RedditTokenResponse = await res.json();

  const status_class = Math.floor(res.status / 100);

  // 2xx - success, return token and expiration
  if (status_class === 2) {
    const token_expiration = Date.now() / 1000 + body.expires_in / 2;
    const token = body.token_type + " " + body.access_token;

    if (!body.token_type || !body.access_token) {
      logHelper(
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
    logHelper("ERROR", errorMsg);

    throw new ApiError(errorMsg, res);
  }

  // 5xx - internal server error (Reddit's fault), will retry
  if (status_class === 5) {
    if (retry_on_server_error > 0 && handleRetries) {
      logHelper(
        "WARN",
        `Received server error when trying to get token, attempting ${retry_on_server_error} retries.`,
      );

      const result = await get_token_server_error_looper(
        // everything but handleErrors is passed through
        username,
        password,
        app_id,
        api_secret,
        user_agent,
        retry_on_server_error,
        retry_delay,
        logHelper,
      );
      return result;
    }

    // if we get here then either we have:
    // - already started our retry loop, so we skipped beginning it again
    // - or we have exhausted our retries (retry_on_server_error === 0)
    // - never enabled retries in the first place
    const msg =
        `Getting token has resulted in: ${res.status} here. Try enabling retries on server errors to automatically retry on this error.`;
    logHelper('ERROR', msg);
    throw new ApiError(msg, res);
  }

  // shouldn't get here, throw error
  throw new ApiError("Unknown error", res);
}

async function get_token_server_error_looper(
  username: string,
  password: string,
  app_id: string,
  api_secret: string,
  user_agent: string,
  retry_on_server_error: number,
  retry_delay: number,
  logHelper: LoggerFunc,
): Promise<{ token_expiration: number; token: string }> {
  while (retry_on_server_error > 0) {
    try {
      const result = await get_token_helper(
        username,
        password,
        app_id,
        api_secret,
        user_agent,
        retry_on_server_error,
        retry_delay,
        false,
        logHelper,
      );
      return result;
    } catch {
      retry_on_server_error--;
      await wait(retry_delay * 1000);
    }
  }

  throw new Error("Could not get api token during retries");
}
