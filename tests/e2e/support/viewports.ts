// Test_Viewports from requirements.md (CSS px).

export type TestViewport = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly deviceScaleFactor: number;
};

const vp = (width: number, height: number, deviceScaleFactor = 1): TestViewport => ({
  name: deviceScaleFactor === 1 ? `${width}x${height}` : `${width}x${height}@${deviceScaleFactor}x`,
  width,
  height,
  deviceScaleFactor,
});

// Mobile portrait
export const MOBILE_320x568 = vp(320, 568);
export const MOBILE_360x640 = vp(360, 640);
export const MOBILE_375x667 = vp(375, 667);
export const MOBILE_390x844 = vp(390, 844);
export const MOBILE_414x896 = vp(414, 896);

// Landscape phone
export const LANDSCAPE_667x375 = vp(667, 375);
export const LANDSCAPE_844x390 = vp(844, 390);

// Tablet
export const TABLET_768x1024 = vp(768, 1024);
export const TABLET_1024x768 = vp(1024, 768);
export const TABLET_1024x1366 = vp(1024, 1366);

// Desktop
export const DESKTOP_1280x800 = vp(1280, 800);
export const DESKTOP_1440x900 = vp(1440, 900);
export const DESKTOP_1920x1080 = vp(1920, 1080);

// High density and 4K
export const DESKTOP_1920x1080_DPR2 = vp(1920, 1080, 2);
export const ULTRA_3840x2160 = vp(3840, 2160);

export const MOBILE_VIEWPORTS: readonly TestViewport[] = [
  MOBILE_320x568,
  MOBILE_360x640,
  MOBILE_375x667,
  MOBILE_390x844,
  MOBILE_414x896,
];

export const LANDSCAPE_VIEWPORTS: readonly TestViewport[] = [LANDSCAPE_667x375, LANDSCAPE_844x390];

export const TEST_VIEWPORTS: readonly TestViewport[] = [
  ...MOBILE_VIEWPORTS,
  ...LANDSCAPE_VIEWPORTS,
  TABLET_768x1024,
  TABLET_1024x768,
  TABLET_1024x1366,
  DESKTOP_1280x800,
  DESKTOP_1440x900,
  DESKTOP_1920x1080,
  DESKTOP_1920x1080_DPR2,
  ULTRA_3840x2160,
];
