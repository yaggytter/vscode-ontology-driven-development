#!/usr/bin/env node
"use strict";
// Thin launcher: all behaviour lives in dist/cli.js (built from src/cli.ts).
require("../dist/cli.js")
  .main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  });
