/// <reference path="../reddit.ts" />
import type { RedditApi } from "../reddit-api/RedditApi.ts";
import { COMMENTS_JSON_FILE } from "./constants.ts";

type GetUserCommentsResponse = [number, RedditResponseListing<RedditComment>];

export class GetUserComments {
  count = 0;
  separator = "";

  // data: RedditComment[] = [];
  // after: string | undefined;

  constructor(readonly reddit: RedditApi, readonly username: string) {
    Deno.writeTextFileSync(COMMENTS_JSON_FILE, `[\n`);
  }

  fetch(query: string): Promise<GetUserCommentsResponse> {
    return this.reddit.get(`/user/${this.username}/comments?${query}`);
  }

  handleErr(err: unknown) {
    if (!err) return;

    console.error("api request failed: " + err);
    Deno.exit(1); // should we exit?
  }

  writeToFile(data: RedditComment) {
    // this.data = this.data.concat(data);
    Deno.writeTextFileSync(COMMENTS_JSON_FILE, JSON.stringify(data, null, 2), {
      append: true,
    });
    if (!this.separator) this.separator = "\n\t,";
  }

  async handleResp(response: GetUserCommentsResponse) {
    console.log(
      "🚀 ~ file: get-user-comments.ts:35 ~ GetUserComments ~ handleResp ~ response:",
      response,
    );
    if (!response) return;
    const [, data] = response;
    this.writeToFile(data);

    if (data !== null && typeof data === "object" && data.data?.after) {
      this.count++;
      await this.fetchComments(data.data.after);
      this.after = data.data.after;
    } else {
      // reached end of comments, so we can close array
      Deno.writeTextFileSync(COMMENTS_JSON_FILE, `]`, { append: true });
      this.after = undefined;
    }
  }

  async fetchComments(after?: string) {
    const data: RedditListingRequest = {
      limit: 100,
      count: this.count,
    };

    if (after) {
      data.after = after;
    }

    const qs = new URLSearchParams(data as Record<string, string>);

    try {
      const resp = await this.fetch(qs.toString());
      this.handleResp(resp);
    } catch (err) {
      this.handleErr(err);
    }
  }
}
