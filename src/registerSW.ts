export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log("NusaNest PWA: Service worker registered");
    } catch (error) {
      console.error("NusaNest PWA: Service worker registration error", error);
    }
  }
};
