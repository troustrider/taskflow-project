"use strict";

const app = require("../../server/src/index");

function pickSegments(query) {
  const value = query?.asset ?? query?.["...asset"];

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.length > 0) {
    return value.split("/").filter(Boolean);
  }

  return [];
}

module.exports = (req, res) => {
  const segments = pickSegments(req.query);
  const pathname = `/api/docs/${segments.join("/")}`.replace(/\/+$/, "");

  req.url = pathname || "/api/docs";

  return app(req, res);
};
