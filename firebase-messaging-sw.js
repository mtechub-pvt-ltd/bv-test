importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Extract config from the URL query parameters
const urlParams = new URL(location).searchParams;
const swConfigString = urlParams.get('firebaseConfig');

const firebaseConfig = swConfigString ? JSON.parse(swConfigString) : null;

// Initialize the Firebase app in the service worker
if (firebaseConfig && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE") {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: '/favicon.svg'
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
} else {
    console.warn("Service worker Firebase config is missing or using placeholder.");
}