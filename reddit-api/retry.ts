import { ApiError } from "./ApiError.ts";
import { wait } from "./helpers.ts";
import { ILogger } from "./logger.ts";

/**
 * Function that handles retrying a request if it fails with a 5xx code or if
 * set to retry on 403
 * @param fn a fetch function that returns a Promise<Response>
 * @param retry_count how many times to retry
 * @param delayInSeconds how long, in seconds, to wait between retries
 * @param retry_on_403 whether to also rety on 403, default: false
 * @returns
 */
export async function retry(
  fn: () => Promise<Response>,
  retry_count: number,
  delayInSeconds: number,
  retry_on_403 = false,
  log: ILogger["log"],
): Promise<Response> {
  let response: Response | null = null;
  let count = retry_count;

  while (count > 0) {
    count -= 1;

    try {
      response = await fn();
      const status_class = Math.floor(response.status / 100);

      if (status_class === 5 || (retry_on_403 && response.status === 403)) {
        log(
          "WARN",
          `retry(): Received ${response.status}, attempting ${count} of ${retry_count} retries.`,
        );
        // skip the delay if this is the end of the retries
        if (retry_count > 0) {
          await wait(delayInSeconds * 1000);
        }
      } else {
        return response;
      }
    } catch (e) {
      // unknown error occured, will try again
      log(
        "WARN",
        `retry(): an unkown error occured in retry ${
          count + 1
        } of ${retry_count}, will try again`,
        e.message,
      );
    }
  }

  if (response !== null) {
    throw new ApiError(
      `retry(): Request returned ${response.status} error after exhausting all retries`,
      response,
    );
  } else {
    throw new Error(`retry(): An unknown error occured, check logs`);
  }
}
