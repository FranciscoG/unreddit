export interface ILogger {
  log(msg: string, ...args: unknown[]): void;
}

export class Logger implements ILogger {
  constructor(public enabled: boolean = true) {}

  log(msg: string, ...args: unknown[]): void {
    if (!this.enabled) return;

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
}
