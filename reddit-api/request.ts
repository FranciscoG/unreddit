import { encode } from "std/encoding/base64.ts";
import { RequestData, RequestMethods } from "./types.ts";

export interface CustomRequestConfig {
  url: string;
  method: RequestMethods;
  headers?: Record<string, string>;
  qs?: ConstructorParameters<typeof URLSearchParams>[0];
  body?: RequestData;
  json?: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

export function request(config: CustomRequestConfig) {
  const qs = new URLSearchParams(config.qs);
  const headers = new Headers();

  if (config.json) {
    headers.append("Content-Type", "application/json");
  }

  // basic auth header setup
  if (config.auth) {
    const header = config.auth.user + ":" + (config.auth.pass || "");
    const authHeader = "Basic " + encode(header);
    headers.append("Authorization", authHeader);
  }

  if (config.headers) {
    for (const key in config.headers) {
      if (Object.hasOwn(config.headers, key)) {
        headers.append(key, config.headers[key]);
      }
    }
  }

  const options: RequestInit = {
    method: config.method,
    headers,
  };

  options.body = config.body;

  const url = `${config.url}?${qs.toString()}`;
  return fetch(url, options);
}
