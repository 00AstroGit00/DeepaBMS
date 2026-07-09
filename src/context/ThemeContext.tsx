import React, { createContext, useContext, useState } from 'react';

export interface ThemeColors {
  dark: boolean;
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  sub: string;
  faint: string;
  primary: string;
  primarySoft: string;
  green: string;
  greenSoft: string;
  red: string;
  redSoft: string;
  amber: string;
  amberSoft: string;
  blue: string;
  blueSoft: string;
  purple: string;
  purpleSoft: string;
  teal: string;
  tealSoft: string;
}

export const lightTheme: ThemeColors = {
  dark: false,
  bg: '#F4F2EE',
  card: '#FFFFFF',
  cardAlt: '#FAF8F5',
  border: '#E8E4DD',
  text: '#1C1917',
  sub: '#6B6459',
  faint: '#A39B8E',
  primary: '#8B2E2E',
  primarySoft: '#F7E8E6',
  green: '#1E7E4E',
  greenSoft: '#E3F3EA',
  red: '#C43A3A',
  redSoft: '#FBE9E9',
  amber: '#B07414',
  amberSoft: '#FBF0DC',
  blue: '#2B5FA8',
  blueSoft: '#E5EDF9',
  purple: '#6B4BA3',
  purpleSoft: '#EFE9F8',
  teal: '#0E7A74',
  tealSoft: '#E0F2F1'
};

export const darkTheme: ThemeColors = {
  dark: true,
  bg: '#141210',
  card: '#1F1C19',
  cardAlt: '#26221E',
  border: '#332E28',
  text: '#F0EBE3',
  sub: '#A89F92',
  faint: '#6E675C',
  primary: '#E07856',
  primarySoft: '#3A2521',
  green: '#4FBF87',
  greenSoft: '#1B322A',
  red: '#E66A6A',
  redSoft: '#3A2222',
  amber: '#E0A94E',
  amberSoft: '#38301F',
  blue: '#6D9EE0',
  blueSoft: '#20293A',
  purple: '#A98BE0',
  purpleSoft: '#2C2438',
  teal: '#4EC2BA',
  tealSoft: '#1B3230'
};

export interface ThemeContextType {
  theme: ThemeColors;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  toggle: () => {}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const toggle = () => setIsDark((d) => !d);
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
