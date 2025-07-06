/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Cycle-Bees Brand Colors
 * Primary: #FFD11E (Yellow)
 * Secondary: #2D3E50 (Dark Blue)
 * Accent: #FBE9A0, #FFF5CC, #2F2500, #2B2E00, #4A4A4A
 */

const primaryColor = '#FFD11E';
const secondaryColor = '#2D3E50';
const accentColor1 = '#FBE9A0';
const accentColor2 = '#FFF5CC';
const darkColor1 = '#2F2500';
const darkColor2 = '#2B2E00';
const grayColor = '#4A4A4A';

export const Colors = {
  light: {
    text: secondaryColor,
    background: '#FFFFFF',
    tint: primaryColor,
    icon: grayColor,
    tabIconDefault: grayColor,
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent1: accentColor1,
    accent2: accentColor2,
    dark1: darkColor1,
    dark2: darkColor2,
    gray: grayColor,
    cardBackground: '#FFFFFF',
    border: '#E5E5E5',
    shadow: 'rgba(0, 0, 0, 0.1)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
  },
  dark: {
    text: '#FFFFFF',
    background: secondaryColor,
    tint: primaryColor,
    icon: '#CCCCCC',
    tabIconDefault: '#CCCCCC',
    tabIconSelected: primaryColor,
    primary: primaryColor,
    secondary: secondaryColor,
    accent1: accentColor1,
    accent2: accentColor2,
    dark1: darkColor1,
    dark2: darkColor2,
    gray: '#CCCCCC',
    cardBackground: '#1A1A1A',
    border: '#333333',
    shadow: 'rgba(0, 0, 0, 0.3)',
    success: '#28A745',
    error: '#DC3545',
    warning: '#FFC107',
    info: '#17A2B8',
  },
};
