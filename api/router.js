"use strict";

const app = require("../server/src/index");

function getPathValue(query) {
  const value = query?.path;

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return typeof value === "string" ? value : "";
}

module.exports = (req, res) => {
  const { path, ...rest } = req.query || {};
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(rest)) {
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const pathname = `/api/${getPathValue({ path })}`;
  const search = searchParams.toString();

  req.url = search ? `${pathname}?${search}` : pathname;

  return app(req, res);
};
