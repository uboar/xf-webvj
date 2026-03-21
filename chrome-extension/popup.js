'use strict';

let currentYoutubeUrl = null;

function addLog(message, type = 'info') {
  const statusArea = document.getElementById('statusArea');
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.textContent = message;
  statusArea.appendChild(line);
  statusArea.scrollTop = statusArea.scrollHeight;
}

function setButtonsEnabled(enabled) {
  const loadDeck1 = document.getElementById('loadDeck1');
  const loadDeck2 = document.getElementById('loadDeck2');
  const downloadBtn = document.getElementById('downloadBtn');

  if (enabled && currentYoutubeUrl) {
    loadDeck1.disabled = false;
    loadDeck1.classList.remove('disabled');
    loadDeck2.disabled = false;
    loadDeck2.classList.remove('disabled');
    downloadBtn.disabled = false;
    downloadBtn.classList.remove('disabled');
  } else {
    loadDeck1.disabled = true;
    loadDeck1.classList.add('disabled');
    loadDeck2.disabled = true;
    loadDeck2.classList.add('disabled');
    downloadBtn.disabled = true;
    downloadBtn.classList.add('disabled');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const currentUrlDiv = document.getElementById('currentUrl');

  // chrome.storage.sync からサーバーURLを読み込み
  chrome.storage.sync.get(['serverUrl'], (result) => {
    if (result.serverUrl) {
      serverUrlInput.value = result.serverUrl;
    }
  });

  // 現在のタブURLを取得
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const tabUrl = tabs[0].url || '';
      if (tabUrl.includes('youtube.com/watch')) {
        currentYoutubeUrl = tabUrl;
        currentUrlDiv.textContent = tabUrl;
        currentUrlDiv.classList.remove('no-youtube');
        setButtonsEnabled(true);
      } else {
        currentYoutubeUrl = null;
        currentUrlDiv.textContent = 'YouTubeページを開いてください';
        currentUrlDiv.classList.add('no-youtube');
        setButtonsEnabled(false);
      }
    }
  });

  // サーバーURL保存ボタン
  document.getElementById('saveBtn').addEventListener('click', () => {
    const value = serverUrlInput.value.trim();
    chrome.storage.sync.set({ serverUrl: value }, () => {
      addLog('サーバーURLを保存しました: ' + value, 'info');
    });
  });

  // ダッシュボードタブを探してDeckにロードする共通関数
  const loadToDeck = async (deckNumber) => {
    const serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
    const dashboardUrl = serverUrl + '/dashboard?deck' + deckNumber + '=' + encodeURIComponent(currentYoutubeUrl);

    // 既存のダッシュボードタブを検索
    const tabs = await chrome.tabs.query({});
    const dashboardTab = tabs.find((tab) =>
      tab.url && tab.url.includes('/dashboard')
    );

    if (dashboardTab) {
      // 既存タブのURLを更新してフォーカス
      await chrome.tabs.update(dashboardTab.id, { url: dashboardUrl, active: true });
      if (dashboardTab.windowId) {
        await chrome.windows.update(dashboardTab.windowId, { focused: true });
      }
      addLog('Deck ' + deckNumber + ' にロードしました', 'complete');
    } else {
      // ダッシュボードタブがなければ新規作成
      await chrome.tabs.create({ url: dashboardUrl });
      addLog('ダッシュボードを開き、Deck ' + deckNumber + ' にロードしました', 'complete');
    }
  };

  // Deck 1 にロード
  document.getElementById('loadDeck1').addEventListener('click', () => loadToDeck(1));

  // Deck 2 にロード
  document.getElementById('loadDeck2').addEventListener('click', () => loadToDeck(2));

  // yt-dlp ダウンロードボタン
  document.getElementById('downloadBtn').addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim();
    const ytdlpArgs = document.getElementById('ytdlpArgs').value.trim();

    setButtonsEnabled(false);
    addLog('ダウンロードを開始します...', 'info');

    try {
      const response = await fetch(serverUrl + '/api/download-movie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentYoutubeUrl, args: ytdlpArgs }),
      });

      if (!response.ok) {
        addLog('エラー: サーバーへの接続に失敗しました (HTTP ' + response.status + ')', 'error');
        setButtonsEnabled(true);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 最後の不完全な行をバッファに残す

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              switch (data.type) {
                case 'progress':
                  addLog(data.message || '', 'progress');
                  break;
                case 'complete':
                  addLog('完了: ' + (data.fileName || ''), 'complete');
                  break;
                case 'error':
                  addLog('エラー: ' + (data.message || ''), 'error');
                  break;
                case 'done':
                  addLog(`完了 (成功: ${data.success}/${data.total}, 失敗: ${data.failed})`, 'done');
                  break;
                default:
                  if (data.message) addLog(data.message, 'info');
              }
            } catch {
              // JSONパース失敗は無視
            }
          }
        }
      }
    } catch (err) {
      addLog('エラー: ' + err.message, 'error');
    } finally {
      setButtonsEnabled(true);
    }
  });
});
