# Local visual-media layout

The checked-in corpus contains metadata and provisional labels, not the original Instagram image files. Human visual review and live multimodal evaluation require a local copy of every image or carousel slide in source order.

## Local-only directory

Store media under the ignored `phase0/media/` directory:

```text
phase0/media/
  AWS-001/
    slide-01.jpg
    slide-02.jpg
  GDG-012/
    slide-01.jpg
    slide-02.jpg
    slide-03.jpg
```

- The directory name is the corpus `post_id` from `corpus/pilot-posts.csv`.
- Images use `slide-01`, `slide-02`, and so on in the original carousel order.
- Keep the original file extension when practical: `.jpg`, `.jpeg`, `.png`, or `.webp`.
- Do not place credentials, authorization headers, provider payloads, or temporary CDN URLs in filenames or sidecar files.
- Do not commit the media. `phase0/media/` is intentionally covered by `.gitignore`.

## Completeness rule

A post is ready for human labeling or model evaluation only when every required visual is present and the order has been verified against the source post. A cover image without the remaining carousel children is incomplete.

The current corpus does not record expected slide counts, so media completeness must be established during visual review and then recorded before the post enters the live baseline.

Run `npm run validate:media-layout` to check that all 50 post directories exist and contain contiguous `slide-NN` files. This validates local structure only; it cannot prove that the last carousel slide is present until the source count has been human-verified.
