function parseBodyHelper(body_json, logHelper) {
  let body;
  if (typeof body_json === "string") {
    try {
      body = JSON.parse(body_json);
    } catch (e) {
      logHelper("Error parsing JSON body: " + e + " just returning body.");
      body = body_json;
    }
  } else {
    body = body_json;
  }
  return body;
}

function wait(n) {
  return new Promise((resolve) => {
    setTimeout(resolve, n);
  });
}

function logger(msg, ...args) {
  const date = new Date();
  let month = date.getMonth() + 1;
  let minutes = date.getMinutes();
  let seconds = date.getSeconds();
  let day = date.getDate();

  if (month < 10) {
    month = "0" + month;
  }

  if (minutes < 10) {
    minutes = "0" + minutes;
  }

  if (seconds < 10) {
    seconds = "0" + seconds;
  }

  if (day < 10) {
    day = "0" + day;
  }

  const timestamp = `${date.getFullYear()}-${month}-${day} ${date.getHours()}:${minutes}:${seconds}`;
  console.log(timestamp, `[${msg}]`, ...args);
}

module.exports = {
  parseBodyHelper,
  wait,
  logger,
};
