import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ApifyRetrievalError,
  buildActorInput,
  downloadImage,
  extractOrderedMedia,
  matchPostsToResults,
  parseCorpusPosts,
  retrieveMediaFromItems,
} from "../retrieval/apify-media-retrieval.mjs";

const corpusText = await fs.readFile(new URL("../corpus/pilot-posts.csv", import.meta.url), "utf8");
const posts = parseCorpusPosts(corpusText);

test("corpus parser reads all retrieval identities", () => {
  assert.equal(posts.length, 50);
  assert.deepEqual(posts[0], {
    post_id: "AWS-001",
    permalink: "https://www.instagram.com/p/DTuomwdEq7D/",
    shortcode: "DTuomwdEq7D",
  });
});

test("actor input uses direct permalinks with one result per URL", () => {
  const input = buildActorInput(posts.slice(0, 2));

  assert.deepEqual(input, {
    directUrls: [posts[0].permalink, posts[1].permalink],
    resultsType: "posts",
    resultsLimit: 1,
    addParentData: false,
  });
});

test("ordered media prefers carousel childPosts", () => {
  const media = extractOrderedMedia({
    displayUrl: "https://example.invalid/cover.jpg",
    childPosts: [
      { type: "Image", displayUrl: "https://example.invalid/one.jpg" },
      { type: "Image", displayUrl: "https://example.invalid/two.jpg" },
    ],
  });

  assert.deepEqual(media, [
    { position: 1, media_type: "image", source_url: "https://example.invalid/one.jpg" },
    { position: 2, media_type: "image", source_url: "https://example.invalid/two.jpg" },
  ]);
});

test("ordered media supports the actor images-array fallback", () => {
  const media = extractOrderedMedia({
    type: "Sidecar",
    images: ["https://example.invalid/one.jpg", "https://example.invalid/two.jpg"],
  });

  assert.deepEqual(media.map((item) => item.position), [1, 2]);
  assert.ok(media.every((item) => item.media_type === "image"));
});

test("ordered media rejects a missing media URL", () => {
  assert.throws(
    () => extractOrderedMedia({ type: "Image" }),
    (error) => error instanceof ApifyRetrievalError && error.code === "MISSING_MEDIA_URL",
  );
});

test("dataset results match corpus posts by shortcode", () => {
  const selected = posts.slice(0, 2);
  const matched = matchPostsToResults(selected, [
    { shortCode: selected[1].shortcode },
    { shortCode: selected[0].shortcode },
  ]);

  assert.deepEqual(matched.map((pair) => pair.post.post_id), ["AWS-001", "AWS-002"]);
});

test("dataset matching fails when an input post is absent", () => {
  assert.throws(
    () => matchPostsToResults(posts.slice(0, 1), []),
    (error) => error instanceof ApifyRetrievalError && error.code === "POST_RESULT_MISSING",
  );
});

test("actor input refuses batches above the safety limit", () => {
  assert.throws(() => buildActorInput(posts.slice(0, 11)), /between 1 and 10/);
});

test("media download retries transient fetch failures", async () => {
  let attempts = 0;
  const result = await downloadImage("https://example.invalid/image", async () => {
    attempts += 1;
    if (attempts < 3) throw new Error("temporary DNS failure");
    return {
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => Buffer.from("image-bytes"),
    };
  });

  assert.equal(attempts, 3);
  assert.equal(result.extension, "jpg");
  assert.match(result.checksum_sha256, /^[a-f0-9]{64}$/);
});

test("media download redacts the underlying network error after retry exhaustion", async () => {
  await assert.rejects(
    downloadImage("https://temporary-cdn.invalid/sensitive-query", async () => {
      throw new Error("network failed for a temporary URL");
    }),
    (error) => error instanceof ApifyRetrievalError
      && error.code === "MEDIA_DOWNLOAD_FAILED"
      && error.message === "Media download failed after three attempts",
  );
});

test("media download falls back to the canonical Instagram CDN host", async () => {
  const seenHosts = [];
  const result = await downloadImage(
    "https://instagram.example.fna.fbcdn.net/media.jpg?signed=value",
    async (url) => {
      const hostname = new URL(url).hostname;
      seenHosts.push(hostname);
      if (hostname !== "scontent.cdninstagram.com") throw new Error("regional DNS unavailable");
      return {
        ok: true,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => Buffer.from("fallback-image"),
      };
    },
  );

  assert.deepEqual(seenHosts, [
    "instagram.example.fna.fbcdn.net",
    "instagram.example.fna.fbcdn.net",
    "instagram.example.fna.fbcdn.net",
    "scontent.cdninstagram.com",
  ]);
  assert.equal(result.extension, "jpg");
});

test("local retrieval reports an out-of-scope video and continues the batch", async (context) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "phase0-apify-test-"));
  context.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  const result = await retrieveMediaFromItems({
    posts: posts.slice(0, 2),
    items: [
      { shortCode: posts[0].shortcode, type: "Video", videoUrl: "https://example.invalid/video.mp4" },
    ],
    mediaRoot: path.join(temporaryRoot, "media"),
    rawRoot: path.join(temporaryRoot, "raw"),
  });

  assert.deepEqual(result, {
    downloaded: [],
    failures: [
      { post_id: "AWS-001", code: "VIDEO_OUT_OF_SCOPE" },
      { post_id: "AWS-002", code: "POST_RESULT_MISSING" },
    ],
  });
});
