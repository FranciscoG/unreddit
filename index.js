const fs = require("fs");
const config = require("./config.json");

const { username, password, TOTP, app_id, api_secret } = config;

const pwd = TOTP ? `${password}:${TOTP}` : password;

const reddit = new RedditAPI({
  username,
  password: pwd,
  app_id,
  api_secret,
  user_agent: "my-test-script",
  retry_on_wait: true,
  retry_on_server_error: 5,
  retry_delay: 1,
  logs: true,
});

function handleErr(err) {
  if (!err) return;

  console.error("api request failed: " + err);
}

let count = 0;
let separator = "";

const stream = fs.createWriteStream("comments.json", { flags: "a" });
stream.write("[\n");

function writeToFile(data) {
  stream.write(`${separator}${JSON.stringify(data, null, 2)}`);
  if (!separator) separator = "\n\t,";
}

async function handleResp(response) {
  if (!response) return;

  let data = response[1];

  writeToFile(data);

  if (data.data.after) {
    count++;
    await fetchComments(data.data.after);
  } else {
    stream.write("]");
  }
}

async function fetchComments(after) {
  const data = {
    limit: 100,
    count,
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
