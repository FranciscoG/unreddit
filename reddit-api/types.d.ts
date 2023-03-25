export interface RequiredOptions {
  /**
   * Required -  Username for the Reddit Account.
   */
  username: string;
  /**
   * Required - The Password for the Reddit Account.
   */
  password: string;
  /**
   * Required - The Reddit Application ID.
   */
  app_id: string;

  /**
   * Required - The Reddit Application Secret.
   */
  api_secret: string;
}

export interface OptionalOptions {
  /**
   * Optional - Display logs.
   * default: false;
   */
  logs?: boolean;

  /**
   * Optional - The User Agent for all Reddit API requests.
   * default: unreddit
   */
  user_agent?: string;

  /**
   * Optional - If True and Reddit returns a "You are trying this too much" error, it will pause the process for the exact time needed, then retry the request.
   * default: false;
   */
  retry_on_wait?: boolean;

  /**
   * Optional - If > 0 and Reddit returns a server error (responseCode >= 500 && responseCode <= 599) it will retry the request the number of times you specify + 1 automatically.
   * default: 0;
   */
  retry_on_server_error?: number;

  /**
   * Optional - Specifies the retry delay for server error retries. (IE. if server error and you specify you want to retry before retrying it will delay for retry_delay seconds.)
   * default: 5;
   */
  retry_delay?: number;
}

export type RequestMethods =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS";

/**
 * This will be the data passed to Fetch's RequestInit `body` property
 *
 * In our case we'll accept the following:
 * - string - no change, will be passed as-is
 * - an object with only level of properties - will be converted into FormData
 */
export type RequestData = RequestInit["body"];
