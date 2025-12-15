// Firebase configuration for development (emulator)
export const firebaseConfig = {
  apiKey: "demo-project",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app"
};

// Emulator configuration
export const useEmulator = __DEV__ && true; // Set to false for production

export const emulatorConfig = {
  auth: {
    host: 'localhost',
    port: 9099
  },
  firestore: {
    host: 'localhost', 
    port: 8080
  },
  storage: {
    host: 'localhost',
    port: 9199
  }
};