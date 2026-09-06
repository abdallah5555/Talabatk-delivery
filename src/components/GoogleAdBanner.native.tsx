import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export function GoogleAdBanner({ unitId }: { unitId?: string | null }) {
  if (!unitId) return null;
  const testMode = process.env.EXPO_PUBLIC_ADS_TEST_MODE !== 'false';
  return (
    <BannerAd
      unitId={testMode ? TestIds.ADAPTIVE_BANNER : unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
    />
  );
}
