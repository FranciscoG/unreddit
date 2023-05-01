import "./check-permissions.ts";
import { RedditApi } from "./reddit-api/RedditApi.ts";
import { ensureDirSync } from "std/fs/mod.ts";
import config from "./config.json" assert { type: "json" };
import { TMP_DIR } from "./lib/constants.ts";
import { GetUserComments } from "./lib/get-user-comments.ts";

ensureDirSync(TMP_DIR);

const { username, password, TOTP, app_id, app_secret } = config;

const pwd = TOTP ? `${password}:${TOTP}` : password;

const reddit = new RedditApi({
  // from our config.json
  username,
  password: pwd,
  app_id,
  app_secret,

  // hard-coded RedditAPI options for now
  retry_on_wait: true,
  retry_on_server_error: 5,
  retry_delay: 1,
  logs: true,
});

const comments = new GetUserComments(reddit, username);
await comments.fetchComments();
