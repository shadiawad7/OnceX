# Expo manifest and SDK compatibility

The project now targets SDK 58, matching Expo Go 58 on iPhone. SDK 57 Expo Go cannot be installed on physical iOS devices from the App Store.

The temporary patch for @expo/cli 57.0.32 and its postinstall dependency were removed during the upgrade. SDK 58 reworked manifest/tunnel URLs. Revalidate manifest access when changing proxy setup.

Restart all old Expo processes, run npm run start:tunnel, and scan the newly generated QR. The SDK 58 default tunnel timed out in this environment. start:tunnel explicitly uses the supported ngrok provider, but it also timed out during the SDK 58 migration. LAN remains available with npm start on the same Wi-Fi; a tunnel requires the external provider to be reachable.
