"""简→繁候选查询，scripts/build-extras.mjs 的子进程。

用法：uv run --no-project --with opencc python scripts/_s2t.py [shuowen.json 路径]
stdin ：[{"char": "东"}, ...]  直查说文不中的简体字
stdout：[{"char": "东", "cands": ["東"]}, ...]（顺序与输入一致）

候选 = 说文全部字头里 t2s 能映射回该字的繁体集合（opencc 引擎的单字转换只返回
一个结果拿不到全部候选；对说文字头整体反查即可枚举），OpenCC s2t 正向首选
（若在候选里）排最前，其余按说文 id 序。
"""
import json
import sys
from opencc import OpenCC

shuowen_path = sys.argv[1] if len(sys.argv) > 1 else 'data/sources/shuowen.json'
sys.stdin.reconfigure(encoding='utf-8')
sys.stdout.reconfigure(encoding='utf-8')

with open(shuowen_path, encoding='utf-8') as f:
    heads = list(json.load(f).keys())

t2s = OpenCC('t2s')
s2t = OpenCC('s2t')
rev = {}
for w in heads:
    rev.setdefault(t2s.convert(w), []).append(w)

out = []
for item in json.load(sys.stdin):
    c = item['char']
    cands = rev.get(c, [])
    pref = s2t.convert(c)
    if pref in cands:
        cands = [pref] + [x for x in cands if x != pref]
    out.append({'char': c, 'cands': cands})
json.dump(out, sys.stdout, ensure_ascii=False)
