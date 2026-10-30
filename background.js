const TARGET_URL = 'https://chatgpt.com/g/g-p-6a269f02b970819190bf64fb82822526/c/6ae34419-307c-83ea-8cea-669b03555e15';
const TARGET_PATH = new URL(TARGET_URL).pathname;

async function getOrOpenTargetTab() {
  const tabs = await chrome.tabs.query({ url: 'https://chatgpt.com/*' });
  const existing = tabs.find(tab => {
    try { return new URL(tab.url).pathname === TARGET_PATH; }
    catch { return false; }
  });
  if (existing?.id !== undefined) return chrome.tabs.update(existing.id, { active: true });
  return chrome.tabs.create({ url: TARGET_URL, active: true });
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function sendToTarget(text, requestId) {
  const tab = await getOrOpenTargetTab();
  if (tab.id === undefined) throw new Error('无法打开目标会话。');

  let lastError = '目标会话尚未准备好。';
  for (let attempt = 0; attempt < 24; attempt++) {
    if (attempt) await wait(750);
    let result;
    try {
      result = await chrome.tabs.sendMessage(tab.id, {
        type: 'relief-insert-daily-qa',
        text,
        requestId
      });
    } catch (error) {
      lastError = error?.message || lastError;
      continue;
    }
    if (result?.ok) return { ok: true };
    if (result && result.retryable === false) throw new Error(result.message || '无法发送这条消息。');
    lastError = result?.message || lastError;
  }
  throw new Error(`${lastError} 请确认 ChatGPT 已登录并打开“每日傻瓜QA”后重试。`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'relief-send-daily-qa') return;
  const sourceUrl = sender.tab?.url || '';
  if (!/^https:\/\/(chatgpt\.com|chat\.openai\.com)\//.test(sourceUrl)) {
    sendResponse({ ok: false, message: '请从 ChatGPT 页面使用快速聊天。' });
    return;
  }
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  if (!text || text.length > 4000) {
    sendResponse({ ok: false, message: '请输入 1–4000 个字符。' });
    return;
  }
  const requestId = crypto.randomUUID();
  sendToTarget(text, requestId)
    .then(() => sendResponse({ ok: true }))
    .catch(error => sendResponse({ ok: false, message: error.message || '发送失败，请重试。' }));
  return true;
});
