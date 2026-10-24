# SDK 58 upgrade

The iPhone Expo Go error explicitly reported SDK 58 while this project used SDK 57. Updated Expo to 58.0.19, React Native to 0.88.0, React to 19.3.0, Router to 58.0.26 and aligned Expo packages, Babel, React types and lint config.

Regenerated the dependency installation after npm rejected the stale SDK 57 navigation peer tree. Previous local node_modules and lock were retained in /tmp/oncex-sdk58-transition-* for troubleshooting. No native ios/android directories were created or edited.

Adapted strict native types: AppState may initially be null/undefined; optional FlatList empty components now use undefined; Brand flatten result has an ImageStyle annotation and fallback. Web output explicitly remains a single-page app. Removed the temporary SDK 57 CLI patch/postinstall tooling.

Verification: Expo Doctor 20/20, expo install --check, TypeScript, lint, 38 scoring/validation tests, complete iOS/Android Hermes and web exports. Local iOS manifest reports sdkVersion 58.0.0 and runtimeVersion exposdk:58.0.0. Physical iPhone opening still requires user validation.

Stop older Expo processes and run npm start. Computer and phone must share Wi-Fi for LAN mode; scan the new QR. Both default SDK 58 and ngrok tunnel providers timed out in the agent's test, so a tunnel is not claimed verified. start:tunnel explicitly selects ngrok for the existing setup. No Supabase migrations or remote database changes were performed for this upgrade.
