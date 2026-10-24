# Future player photo cutouts

Background removal is disabled. No external provider, credentials, Edge Function or API calls are included.

The original photo is stored in profile-photos at `<playerId>/portrait`. The Card currently displays that original. Club crests are rendered with transparent containers and contain sizing; uploaded PNG alpha is preserved. White pixels already inside an uploaded image are not removed by styling.

`src/lib/cardPhotos.ts` defines the provider-neutral processing contract. `onPlayerPhotoSaved` is an intentionally empty hook, invoked only after a successful photo upload/change. Profile and Card rendering never invoke processing.

Future integration must run server-side only on upload/change, fingerprint the original, persist a transparent derivative and its source revision, reject stale results, and reuse the stored derivative on all subsequent displays. Keep the original intact. Introduce persistent metadata and authorized read access before enabling the provider. No schema changes are implemented now.
