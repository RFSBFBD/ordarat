export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  // Firebase web config for customer Google sign-in.
  // Replace the placeholder values with your real Firebase web app config
  // (see docs/FIREBASE_SETUP.md). Never put service-account secrets here.
  firebase: {
    projectId: 'ordarat-qena',
    apiKey: 'FIREBASE_WEB_API_KEY_PLACEHOLDER',
    authDomain: 'ordarat-qena.firebaseapp.com',
    appId: 'FIREBASE_WEB_APP_ID_PLACEHOLDER',
  },
  city: 'قنا',
  authStub: false,
};
