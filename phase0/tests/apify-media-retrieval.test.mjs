import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import {
  ApifyRetrievalError,
  buildActorInput,
  extractOrderedMedia,
  matchPostsToResults,
  parseCorpusPosts,
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
