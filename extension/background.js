/**
 * PromptShield AI — Background Service Worker (v2)
 *
 * Communication Flow:
 *  popup.js / content.js
 *     → chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', data: fullScanObject })
 *     → background.js (this file) handles it
 *     → StorageManager.saveScan(fullScanObject) writes to chrome.storage.local
 *     → chrome.storage.onChanged fires
 *     → dashboard.js listens and auto-updates
 */

import { StorageManager } from './storage/storageManager.js';

// ─── Install / Update ─────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    StorageManager.init();
    updateBadge(0, 'SAFE');
    console.log('[PromptShield] Installed — storage initialized');
  }
});

// ─── Message Router ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── Save a complete scan record ──
  if (message.type === 'SCAN_COMPLETE') {
    const data = message.data || {};

    // Enrich with tab info
    const record = {
      ...data,
      site: data.site || extractSiteName(sender.tab?.url || ''),
      url:  data.url  || sender.tab?.url || '',
    };

    StorageManager.saveScan(record).then(({ record: saved, stats }) => {
      // Update badge
      updateBadge(saved.threatCount, saved.riskLevel);

      // Notification for high-risk
      if (saved.riskLevel === 'CRITICAL' || saved.riskLevel === 'HIGH') {
        chrome.notifications.create({
          type:     'basic',
          iconUrl:  'assets/icons/icon48.png',
          title:    '⚠️ PromptShield Alert',
          message:  `${saved.threatCount} sensitive item(s) detected on ${saved.site}. Risk: ${saved.riskLevel}`,
        });
      }

      sendResponse({ success: true, stats });
    });
    return true; // Keep channel open for async
  }

  // ── Get stats ──
  if (message.type === 'GET_STATS') {
    StorageManager.getAll().then(sendResponse);
    return true;
  }

  // ── Open dashboard ──
  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard/dashboard.html'),
    });
    sendResponse({ success: true });
    return false;
  }

  // ── Open popup ──
  if (message.type === 'OPEN_POPUP') {
    if (chrome.action.openPopup) {
      chrome.action.openPopup();
    }
    sendResponse({ success: true });
    return false;
  }

  // ── Clear data ──
  if (message.type === 'RESET_STATS') {
    StorageManager.clearAll().then(() => {
      updateBadge(0, 'SAFE');
      sendResponse({ success: true });
    });
    return true;
  }

  return false;
});

// ─── Badge Updater ─────────────────────────────────────────────────────────────
function updateBadge(threatCount, riskLevel) {
  const colors = {
    SAFE:     '#30d158',
    LOW:      '#30d158',
    MEDIUM:   '#ffd60a',
    HIGH:     '#ff6b2b',
    CRITICAL: '#ff2d55',
  };
  chrome.action.setBadgeText({ text: threatCount > 0 ? String(threatCount) : '' });
  chrome.action.setBadgeBackgroundColor({ color: colors[riskLevel] || '#30d158' });
}

// ─── Helper ────────────────────────────────────────────────────────────────────
function extractSiteName(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes('chatgpt') || host.includes('openai')) return 'ChatGPT';
    if (host.includes('claude'))     return 'Claude';
    if (host.includes('gemini'))     return 'Gemini';
    if (host.includes('deepseek'))   return 'DeepSeek';
    if (host.includes('perplexity')) return 'Perplexity';
    if (host.includes('copilot'))    return 'Copilot';
    return host.replace('www.', '');
  } catch {
    return 'Unknown';
  }
}
