const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru', 'tr', 'ar', 'zh'],
    localePath: path.resolve('./src/locales'),
    reloadOnPrerender: process.env.NODE_ENV === 'development',
  },
  react: {
    useSuspense: false,
  },
};
