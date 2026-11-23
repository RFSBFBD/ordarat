export const environment = {
  production: true,
  apiUrl: '/api',
  // Firebase web config for customer Google sign-in.
  // Replace the placeholder values with your real Firebase web app config
  // (see docs/FIREBASE_SETUP.md). Never put service-account secrets here.
  firebase: {
    projectId: 'planning-with-ai-d25ac',
    apiKey: 'AIzaSyCcdsLvfk0XwXtZIfuJ8KsjtIBOy-sBlN0',
    authDomain: 'planning-with-ai-d25ac.firebaseapp.com',
    appId: '1:775088921115:web:3dc618f2b7e33de0ea76be',
  },
  city: 'قنا',
  // E2E-only auth stub. NEVER true in production builds.
  authStub: false,
};
