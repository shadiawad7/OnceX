/** Future upload-only processing boundary. No provider is configured. */
export type CardPhotoSource = { playerId: string; originalPath: string };
export type StoredCardPhoto = { originalPath: string; cutoutPath: string };
export interface CardPhotoProcessor {
 /** Process once on upload/change and persist the result, keyed by source revision.
  * Implementations must reject stale results if the original changes meanwhile. */
 processAndStore(source: CardPhotoSource): Promise<StoredCardPhoto>;
}
/** Called only after saving the original. Intentionally disabled until a server
 * provider and persistent derived-image metadata are configured. Display code
 * must only read stored results; it must never trigger processing. */
export async function onPlayerPhotoSaved(_source: CardPhotoSource): Promise<void> {
 // No external requests, credentials or processing provider.
}
