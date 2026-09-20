import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

const fixtures = JSON.parse(await fs.readFile(new URL("../fixtures/raw-post-results.json", import.meta.url), "utf8"));
const schema = JSON.parse(await fs.readFile(new URL("../contracts/raw-post-result.schema.json", import.meta.url), "utf8"));

function validate(result) {
  const errors = [];
  if (result.schema_version !== "1.0.0") errors.push("schema_version");
  if (!["success", "incomplete", "error"].includes(result.status)) errors.push("status");
  if (!result.provider) errors.push("provider");
  if (!result.retrieved_at || Number.isNaN(Date.parse(result.retrieved_at))) errors.push("retrieved_at");

  if (result.status === "error") {
    if (result.raw_post !== undefined) errors.push("error.raw_post");
    if (!result.failure) errors.push("error.failure");
    return errors;
  }

  const post = result.raw_post;
  if (!post) return [...errors, "raw_post"];
  for (const key of ["provider_external_id", "source_handle", "permalink", "posted_at", "post_type", "media", "provider_raw_payload"]) {
    if (post[key] === undefined || post[key] === "") errors.push(`raw_post.${key}`);
  }
  if (!Array.isArray(post.media)) errors.push("raw_post.media");
  if (result.status === "success" && post.media.length < 1) errors.push("success.media");
  if (result.status === "incomplete" && !result.failure) errors.push("incomplete.failure");
  for (const [index, media] of (post.media ?? []).entries()) {
    if (media.position !== index + 1) errors.push(`media.${index}.position`);
    if (!["image", "video"].includes(media.media_type)) errors.push(`media.${index}.media_type`);
    if (!media.source_url) errors.push(`media.${index}.source_url`);
    if (!["pending", "downloaded", "failed"].includes(media.download_status)) errors.push(`media.${index}.download_status`);
  }
  return errors;
}

test("schema declares RawPostResult v1", () => {
  assert.equal(schema.title, "RawPostResult v1");
  assert.ok(schema.$defs.rawPost);
  assert.ok(schema.$defs.media);
  assert.ok(schema.$defs.failure);
});

for (const fixture of fixtures) {
  test(`${fixture.fixture_id} matches the v1 contract`, () => {
    assert.equal(validate(fixture.result).length === 0, fixture.expected_valid, validate(fixture.result).join(", "));
  });
}
