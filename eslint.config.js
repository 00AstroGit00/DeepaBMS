module.exports = [
  {
    ignores: ["node_modules/", "dist/", "android/", "ios/", ".expo/"]
  },
  ...require('eslint-config-expo/flat'),
  {
    plugins: {
      prettier: require('eslint-plugin-prettier')
    },
    rules: {
      'prettier/prettier': 'error'
    }
  }
];
