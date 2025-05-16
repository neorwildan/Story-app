import StoryApiService from '../data/api';
import AuthService from '../data/auth';
import Swal from 'sweetalert2';

const publicVapidKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';

class NotificationUtils {
  static async requestPermission() {
    if (!('Notification' in window)) return false;
    return await Notification.requestPermission();
  }

  static async subscribePushNotification(token) {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey)
      });

      await StoryApiService.subscribePushNotification(token, {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        }
      });

      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return false;
    }
  }

  static async toggleStoryNotification(storyId) {
    try {
      const token = AuthService.getToken();
      if (!token) throw new Error('You need to login first');

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await StoryApiService.unsubscribeFromStory(token, storyId);
        return { subscribed: false };
      } else {
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey)
        });
        
        await StoryApiService.subscribeToStory(token, storyId, {
          endpoint: newSubscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(newSubscription.getKey('p256dh')),
            auth: this.arrayBufferToBase64(newSubscription.getKey('auth'))
          }
        });
        return { subscribed: true };
      }
    } catch (error) {
      console.error('Error toggling story notification:', error);
      throw error;
    }
  }

  static urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  }

  static arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  static async showNotificationPrompt() {
    try {
      const result = await Swal.fire({
        title: 'Aktifkan Notifikasi',
        text: 'Ingin menerima notifikasi ketika ada cerita baru?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, aktifkan',
        cancelButtonText: 'Nanti saja'
      });

      if (result.isConfirmed) {
        const { subscribed } = await this.toggleNotification();
        return subscribed;
      }
      return false;
    } catch (error) {
      Swal.fire('Error', error.message, 'error');
      return false;
    }
  }

  static async checkNotificationStatus() {
    if (!('serviceWorker' in navigator)) return false;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  }
}

export default NotificationUtils;