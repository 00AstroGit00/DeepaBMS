import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'face' | null;

export const getBiometricType = async (): Promise<BiometricType> => {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'fingerprint';
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
  ) {
    return 'face';
  }
  return null;
};

export const isBiometricAvailable = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
};

export const authenticate = async (
  promptMessage?: string,
): Promise<boolean> => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage ?? 'Authenticate to sign in',
      disableDeviceFallback: false,
      cancelLabel: 'Use PIN instead',
    });
    return result.success;
  } catch {
    return false;
  }
};
