const path = require("path");
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const { createRequestHandler } = require("@remix-run/express");

const { default: axios } = require("axios");
const { default: jwtDecode } = require("jwt-decode");
const QueryString = require("qs");
require("dotenv").config({ path: process.env.ENV_PATH });

const BUILD_DIR = path.join(process.cwd(), "build");

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

app.post("/auth/api/oauth/token", async (req, res) => {
  const { username, password, grant_type, refresh_token } = req.body;
  const {
    OAUTH_TOKEN_ENDPOINT: tokenEndPoint,
    OAUTH_CLIENT_ID: clientId,
    OAUTH_CLIENT_SECRET: clientSecret,
    OAUTH_SCOPE: scope,
  } = process.env;

  if (!tokenEndPoint || !clientId || !clientSecret) {
    return res.status(401).send({
      error: "ENV HASN'T VARIABLE(endpoint, clientId, ...)",
    });
  }
  const basicHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  let payload;

  if (grant_type === "password") {
    payload = QueryString.stringify({
      grant_type,
      username,
      password,
      scope,
    });
  } else {
    payload = QueryString.stringify({
      grant_type,
      refresh_token,
    });
  }

  try {
    const resp = await axios.post(tokenEndPoint, payload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        authorization: `Basic ${basicHeader}`,
      },
    });

    if (grant_type === "password") {
      const { email, sub } = jwtDecode(resp.data.id_token);
      res.json({
        ...resp.data,
        profile: {
          email,
          sub,
        },
      });
    } else {
      res.status(resp.status).json(resp.data);
    }
  } catch (e) {
    if (typeof e !== "undefined" && axios.isAxiosError(e)) {
      if (e?.response?.data?.error === "invalid_grant") {
        res.status(400).json(e?.response?.data);
      }
    } else {
      res.json(e);
    }
  }
});

app.all(
  "*",
  process.env.NODE_ENV === "development"
    ? (req, res, next) => {
        purgeRequireCache();

        return createRequestHandler({
          build: require(BUILD_DIR),
          mode: process.env.NODE_ENV,
        })(req, res, next);
      }
    : createRequestHandler({
        build: require(BUILD_DIR),
        mode: process.env.NODE_ENV,
      })
);
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, but then you'll have to reconnect to databases/etc on each
  // change. We prefer the DX of this, so we've included it for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      delete require.cache[key];
    }
  }
}
