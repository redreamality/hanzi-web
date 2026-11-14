// 写会了哪些字，存在本机浏览器里。家长端的档案、导出导入以后在这上面做。
const KEY = 'hanzi.done';

export function doneSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY)) || []);
  } catch {
    return new Set();
  }
}

export function markDone(id) {
  const done = doneSet().add(id);
  localStorage.setItem(KEY, JSON.stringify([...done]));
}
