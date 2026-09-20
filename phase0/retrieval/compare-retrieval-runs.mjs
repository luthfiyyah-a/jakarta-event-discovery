const stablePostFields = [
  "provider_external_id",
  "source_handle",
  "permalink",
  "post_type",
];

function addDifference(differences, code, path) {
  differences.push({ code, path });
}

function compareValue(differences, code, path, first, second) {
  if (first !== second) addDifference(differences, code, path);
}

function assertResult(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a RawPostResult object`);
  }
}

export function compareRetrievalRuns(first, second) {
  assertResult(first, "first");
  assertResult(second, "second");

  const differences = [];
  const warnings = [];

  compareValue(differences, "SCHEMA_VERSION_CHANGED", "schema_version", first.schema_version, second.schema_version);
  compareValue(differences, "STATUS_CHANGED", "status", first.status, second.status);
  compareValue(differences, "PROVIDER_CHANGED", "provider", first.provider, second.provider);

  const firstPost = first.raw_post;
  const secondPost = second.raw_post;
  if (Boolean(firstPost) !== Boolean(secondPost)) {
    addDifference(differences, "RAW_POST_PRESENCE_CHANGED", "raw_post");
  }

  if (firstPost && secondPost) {
    for (const field of stablePostFields) {
      compareValue(
        differences,
        `${field.toUpperCase()}_CHANGED`,
        `raw_post.${field}`,
        firstPost[field],
        secondPost[field],
      );
    }

    const firstMedia = Array.isArray(firstPost.media) ? firstPost.media : [];
    const secondMedia = Array.isArray(secondPost.media) ? secondPost.media : [];
    compareValue(differences, "MEDIA_COUNT_CHANGED", "raw_post.media.length", firstMedia.length, secondMedia.length);

    const comparableMediaCount = Math.min(firstMedia.length, secondMedia.length);
    for (let index = 0; index < comparableMediaCount; index += 1) {
      const firstItem = firstMedia[index];
      const secondItem = secondMedia[index];
      const path = `raw_post.media[${index}]`;

      compareValue(differences, "MEDIA_POSITION_CHANGED", `${path}.position`, firstItem.position, secondItem.position);
      compareValue(differences, "MEDIA_TYPE_CHANGED", `${path}.media_type`, firstItem.media_type, secondItem.media_type);

      if (firstItem.checksum_sha256 && secondItem.checksum_sha256) {
        compareValue(
          differences,
          "MEDIA_CHECKSUM_CHANGED",
          `${path}.checksum_sha256`,
          firstItem.checksum_sha256,
          secondItem.checksum_sha256,
        );
      } else {
        warnings.push({ code: "MEDIA_CHECKSUM_UNAVAILABLE", path: `${path}.checksum_sha256` });
      }
    }
  }

  compareValue(
    differences,
    "FAILURE_CODE_CHANGED",
    "failure.code",
    first.failure?.code ?? null,
    second.failure?.code ?? null,
  );
  compareValue(
    differences,
    "FAILURE_RETRYABILITY_CHANGED",
    "failure.retryable",
    first.failure?.retryable ?? null,
    second.failure?.retryable ?? null,
  );

  return {
    stable: differences.length === 0,
    differences,
    warnings,
  };
}
