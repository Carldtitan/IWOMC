import assert from "node:assert/strict";

import { message } from "./src/message.mjs";

assert.equal(message(), "environment:reconciled");
