export function parseBodyHelper(
  body_json: string,
  logHelper: LoggerFunc,
) {
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

export function wait(n: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, n);
  });
}

export type LoggerFunc = (msg: string, ...args: unknown[]) => void;

export function logger(msg: string, ...args: unknown[]): void {
  const date = new Date();
  let month: string | number = date.getMonth() + 1;
  let minutes: string | number = date.getMinutes();
  let seconds: string | number = date.getSeconds();
  let day: string | number = date.getDate();

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

  const timestamp =
    `${date.getFullYear()}-${month}-${day} ${date.getHours()}:${minutes}:${seconds}`;
  console.log(timestamp, `[${msg}]`, ...args);
}
