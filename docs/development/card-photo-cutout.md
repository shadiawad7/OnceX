# Player photo cutouts (test integration)

The original profile upload stays at `<playerId>/portrait` in the existing private `profile-photos` bucket. After a successful upload/attachment, `onPlayerPhotoSaved` invokes the backend with mode `process`. Failure never rejects the original upload. Only registered players are sent to the provider; coaches and clubs retain the normal original-photo workflow.

Profile photos and the Card call mode `read`, which can ONLY return a signed URL for a persisted derivative. Missing derivatives fall back to the original. Opening profiles/Cards never triggers processing. No automatic retries run on display.

The backend validates JWT, profile read RLS and (for processing) the existing `attach_profile_photo` write permission. It downloads the private original, hashes its bytes and stores a PNG at `<playerId>/card-<sha256>.png`. Existing storage policies do not permit client writes/reads to these derived paths; only the function signs them after authorization. The hash prevents reuse of a stale cutout after a photo change. The original is rechecked before saving a result.

An atomic private Storage claim (`card-<sha256>-<upload-id>.claim`) permits at most one provider attempt per upload, including simultaneous Edge instances. Failed/crashed claims are retained, with the original as fallback and a visible notice explaining the failure. A new explicit upload receives a new attempt ID, so a failed image can be retried by uploading it again. Opening profiles/Cards never retries. Re-uploading identical successful content reuses the stored result. Old derivatives/claims remain private; include them in account-file cleanup.

## Activate

1. Set `REMOVE_BG_API_KEY` in Supabase → Edge Functions → Secrets. Never put the secret in `.env` for the mobile app, `EXPO_PUBLIC_*`, source control or chat.
2. Deploy: `npx supabase functions deploy card-photo-cutout --project-ref YOUR_PROJECT_REF`.
3. Upload/change a player's photo, then open the Card. Existing photos are not processed merely by viewing them; re-upload one to test.

No migration is required. This repository change does not deploy the function, set secrets or send any actual photos. Remove.bg account credits are required for live processing. Upload waits for the one bounded provider attempt (45-second timeout); the original remains usable if the request fails.

## Replace provider

Only `supabase/functions/card-photo-cutout/provider.ts` implements `BackgroundRemovalProvider.removeBackground(Blob)`. Replace that adapter/secret to change providers; profiles, storage orchestration and Card reading stay unchanged. The provider uses built-in fetch; no remove.bg mobile dependency is installed.

API reference: https://www.remove.bg/api . Its current notice announces platform changes starting December 1, 2026; review the adapter before continued production use.

## Checks

`node --test tests/cardPhotoCutout.cjs tests/backgroundRemovalProvider.cjs tests/profilePhotoTransparency.cjs`

Covers upload-only processing, cached reads, read/write permission separation, nonplayer exclusions, failure fallback, concurrent deduplication, stale-source rejection and original PNG byte preservation.
