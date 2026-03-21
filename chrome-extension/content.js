// content.js - YouTube page content script for xf-webvj Remote

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getVideoInfo') {
    const urlParams = new URLSearchParams(window.location.search);
    sendResponse({
      url: window.location.href,
      title: document.title,
      videoId: urlParams.get('v') || ''
    });
  }
  return true; // async response
});
