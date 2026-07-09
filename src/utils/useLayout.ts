import { useWindowDimensions, Platform } from 'react-native';

export const useLayout = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isDesktop = width >= 1024;
  return {
    width,
    height,
    isTablet,
    isDesktop,
    isWeb: Platform.OS === 'web',
    contentMax: isDesktop ? 1080 : undefined,
    gridCols: isDesktop ? 4 : isTablet ? 3 : 2
  };
};
