export class ApiError extends Error {
  response: {
    status: Response["status"];
    statusText: Response["statusText"];
    headers: Response["headers"];
    type: Response["type"];
    url: Response["url"];
    redirected: Response["redirected"];
    body: Response["body"];
    bodyUsed: Response["bodyUsed"];
  };
  constructor(msg: string, response: Response) {
    super(msg);
    this.response = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      type: response.type,
      url: response.url,
      redirected: response.redirected,
      body: response.body,
      bodyUsed: response.bodyUsed,
    };
  }
}
