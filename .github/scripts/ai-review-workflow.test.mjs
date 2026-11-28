import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(new URL("../workflows/ai_review.yml", import.meta.url), "utf8");

test("AI review requests disable curl URL globbing", () => {
  assert.equal(workflow.match(/curl --globoff/g)?.length, 2);
});
