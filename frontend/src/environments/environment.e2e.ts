// E2E test build ONLY: fakes a signed-in user so dashboard screens can be
// screenshot-tested with intercepted, clearly-marked test data.
// This file is swapped in only by the `e2e` build configuration and is never
// part of a production bundle.
export const environment = {
  production: false,
  apiUrl: '/api',
  firebase: {
    projectId: 'ordarat-qena',
    apiKey: 'FIREBASE_WEB_API_KEY_PLACEHOLDER',
    authDomain: 'ordarat-qena.firebaseapp.com',
    appId: 'FIREBASE_WEB_APP_ID_PLACEHOLDER',
  },
  city: 'قنا',
  authStub: true,
};
