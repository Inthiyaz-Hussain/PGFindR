// Give the service worker access to Firebase Messaging.
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
  apiKey: "AIzaSyBarFnfAFjM7ZbjnO_qUmX0M0k_j5mz46Q",
  authDomain: "pgfindr-48b53.firebaseapp.com",
  projectId: "pgfindr-48b53",
  storageBucket: "pgfindr-48b53.firebasestorage.app",
  messagingSenderId: "178965171164",
  appId: "1:178965171164:web:2666c3074b0ea418e25d19"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo-findpgroom.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
