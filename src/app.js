// 入口：?c=<id> 进这个字的一课；没有、不认识、或数据还没造好的 id 都进首页。
const lessons = await fetch('data/lessons.json').then((r) => r.json());
const asked = new URLSearchParams(location.search).get('c');

const built = lessons.includes(asked)
  && (await fetch(`data/chars/${asked}.json`).then((r) => r.ok, () => false));
if (built) await import('./main.js');
else (await import('./home.js')).showHome(lessons);
