import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { inspectMediaLayout } from "../validate-media-layout.mjs";

async function withTemporaryDirectory(callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "jakarta-event-media-test-"));
  try {
    return await callback(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("missing media root reports every corpus post as missing", async () => {
  await withTemporaryDirectory(async (root) => {
    const report = await inspectMediaLayout(path.join(root, "not-created"), ["AWS-001", "GDG-001"]);

    assert.equal(report.layout_valid, false);
    assert.equal(report.posts_with_media_directories, 0);
    assert.deepEqual(report.missing_posts, ["AWS-001", "GDG-001"]);
    assert.equal(report.source_completeness_verified, false);
  });
});

test("contiguous slide filenames pass structural layout validation", async () => {
  await withTemporaryDirectory(async (root) => {
    await fs.mkdir(path.join(root, "AWS-001"));
    await fs.writeFile(path.join(root, "AWS-001", "slide-01.jpg"), "fixture");
    await fs.writeFile(path.join(root, "AWS-001", "slide-02.png"), "fixture");

    const report = await inspectMediaLayout(root, ["AWS-001"]);

    assert.equal(report.layout_valid, true);
    assert.deepEqual(report.missing_posts, []);
    assert.deepEqual(report.invalid_posts, []);
    assert.equal(report.source_completeness_verified, false);
  });
});

test("layout validation detects gaps, unexpected files, and unknown post directories", async () => {
  await withTemporaryDirectory(async (root) => {
    await fs.mkdir(path.join(root, "AWS-001"));
    await fs.mkdir(path.join(root, "UNKNOWN-001"));
    await fs.writeFile(path.join(root, "AWS-001", "slide-01.jpg"), "fixture");
    await fs.writeFile(path.join(root, "AWS-001", "slide-03.jpg"), "fixture");
    await fs.writeFile(path.join(root, "AWS-001", "notes.txt"), "fixture");

    const report = await inspectMediaLayout(root, ["AWS-001"]);

    assert.equal(report.layout_valid, false);
    assert.deepEqual(report.unknown_directories, ["UNKNOWN-001"]);
    assert.deepEqual(report.invalid_posts, [{
      post_id: "AWS-001",
      positions: [1, 3],
      unexpected_entries: ["notes.txt"],
    }]);
  });
});
