"use strict";

/**
 * Entry point para Vercel Serverless Functions.
 *
 * Vercel resuelve el catch-all como querystring (`all` o `...all`), así que
 * aquí reconstruimos la URL real antes de delegar la petición a Express.
 */
const app = require("../server/src/index");

function pickSegments(query) {
  const value = query?.all ?? query?.["...all"];

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
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(req.query || {})) {
    if (key === "all" || key === "...all") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  }

  const pathname = `/api/${segments.join("/")}`.replace(/\/+$/, "") || "/api";
  const search = searchParams.toString();

  req.url = search ? `${pathname}?${search}` : pathname;

  return app(req, res);
};
