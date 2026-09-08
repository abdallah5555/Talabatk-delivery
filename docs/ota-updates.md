# OTA update strategy

Talabatk Delivery uses `expo-updates` for compatible JavaScript, UI, styling, and asset updates.

- Production builds target the `production` update channel.
- Preview builds target the `preview` update channel.
- Runtime compatibility follows the app version.
- Native dependency, permission, Expo SDK, Android manifest, or other native-runtime changes require a new signed APK build.
- The installed app checks for compatible OTA updates and shows an in-app Arabic update banner before downloading and reloading.
- EAS Update activation requires a real Expo/EAS project ID and update URL. Never commit Expo access tokens or Android signing secrets to this public repository.
