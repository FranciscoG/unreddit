const https = require("node:https");
const Buffer = require("buffer");

function makeRequest(options, data, parseJson = false) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, function (res) {
      res.setEncoding("utf8");

      let body = "";

      res.on("data", function (chunk) {
        body = body + chunk;
      });

      res.on("end", function () {
        if (res.statusCode !== 200) {
          reject(new Error("Api call failed with response code " + res.statusCode));
        } else {
          resolve({ res, body: parseJson ? JSON.parse(body) : body });
        }
      });
    });

    req.on("error", function (e) {
      console.log("Error : " + e.message);
      reject(e);
    });

    if (data) {
      // write data to request body
      req.write(data);
    }

    req.end();
  });
}

function request(config) {
  const url = new URL(config.url);
  const qs = new URLSearchParams(config.qs || {});

  let body;
  if (config.form || config.body) {
    body = new URLSearchParams(config.form || config.body).toString();
  }

  /**
   * @type {https.RequestOptions}
   */
  const options = {
    hostname: url.hostname,
    port: 443,
    path: `${url.pathname}?${qs.toString()}`,
    method: config.method,
    headers: config.headers,
  };

  if (config.json) {
    options["Content-Type"] = "application/json";
  }

  if (body) {
    options["Content-Length"] = Buffer.byteLength(body);
  }

  // basic auth header setup
  if (config.auth) {
    const header = config.auth.user + ":" + (config.auth.pass || "");
    const authHeader = "Basic " + toBase64(header);
    options.headers.Authorization = authHeader;
  }

  return makeRequest(options, body, config.json);
}

function toBase64(str) {
  return Buffer.from(str || "", "utf8").toString("base64");
}

module.exports = request;
