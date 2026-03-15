const YOUTUBE_DOMAINS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'www.youtu.be'
]);

export const extractYouTubeVideoId = (input: string): string | null => {
  if (!input) return null;

  const trimmed = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    if (!YOUTUBE_DOMAINS.has(url.hostname)) {
      return null;
    }

    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const watchId = url.searchParams.get('v');
    if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) {
      return watchId;
    }

    const pathSegments = url.pathname.split('/').filter(Boolean);
    const candidate = pathSegments[pathSegments.length - 1];
    if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
};

let youtubeIframeApiPromise: Promise<typeof YT> | null = null;

export const loadYouTubeIframeApi = (): Promise<typeof YT> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API can only be loaded in the browser.'));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiPromise) {
    return youtubeIframeApiPromise;
  }

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    const handleReady = () => {
      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error('YouTube IFrame API did not initialize correctly.'));
      }
    };

    const previousHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousHandler?.();
      handleReady();
    };

    if (existingScript) {
      existingScript.addEventListener('error', () => reject(new Error('Failed to load YouTube IFrame API.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load YouTube IFrame API.'));
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
};
