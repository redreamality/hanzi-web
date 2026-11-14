// 入口：?c=<id> 进这个字的一课，没有或不认识的 id 就进首页。
const lessons = await fetch('data/lessons.json').then((r) => r.json());
const asked = new URLSearchParams(location.search).get('c');

if (lessons.includes(asked)) await import('./main.js');
else (await import('./home.js')).showHome(lessons);
