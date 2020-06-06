require("dotenv").config();
const fs = require("fs");
const RedditAPI = require("reddit-wrapper-v2");

const {
  REDDIT_APP_ID,
  REDDIT_APP_SECRET,
  REDDIT_USER,
  REDDIT_PW,
  REDDIT_TOTP,
} = process.env;

let password = REDDIT_PW;
if (REDDIT_TOTP) {
  password = `${REDDIT_PW}:${REDDIT_TOTP}`;
}

const reddit = new RedditAPI({
  username: REDDIT_USER,
  password,
  app_id: REDDIT_APP_ID,
  api_secret: REDDIT_APP_SECRET,
  user_agent: "my-test-script",
  retry_on_wait: true,
  retry_on_server_error: 5,
  retry_delay: 1,
  logs: true
});

function handleErr(err) {
  if (!err) return;

  console.error("api request failed: " + err);
}

let count = 0

const stream = fs.createWriteStream("comments.json", { flags: "a" });

function writeToFile(data) {
  stream.write(JSON.stringify(data, null, 2) + ",\n");
}

async function handleResp(response) {
  if (!response) return;

  let data = response[1];

  writeToFile(data);

  if (data.data.after) {
    count++
    await fetchComments(data.data.after);
  }
}

async function fetchComments(after) {
  const data = {
    limit: 100,
    count
  };
  if (after) {
    data.after = after;
  }

  try {
    const resp = await reddit.api.get(`/user/${REDDIT_USER}/comments`, data);
    handleResp(resp);
  } catch (err) {
    handleErr(err);
  }
}

(async function () {
  await fetchComments();
})();
