"use strict";

const app = require("../../server/src/index");

module.exports = (req, res) => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const search = searchParams.toString();
  req.url = search ? `/api/v1/tasks?${search}` : "/api/v1/tasks";

  return app(req, res);
};
