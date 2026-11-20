# 用 edge-tts 把 data/chars/<id>.json 里的每句台词预生成成 audio/<id>/<键>.mp3。
# 异步并发 + 重试，1000 个字的旁白也能在半小时内跑完。
# 用法：uv run --with edge-tts python scripts/gen_audio.py [字id...] [--all] [--force]
#   不带参数 = 只补缺失的；--all = 所有字；--force = 已有的也重新生成。
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-15%"
CONCURRENCY = 6
RETRIES = 3

args = sys.argv[1:]
force = "--force" in args
want_all = "--all" in args
ids = [a for a in args if not a.startswith("--")]

if want_all or not ids:
    ids = sorted(
        p.name.removesuffix(".json")
        for p in (ROOT / "data/chars").iterdir()
        if p.is_file() and p.name.endswith(".json") and not p.name.endswith(".strokes.json")
    )

jobs = []
for char_id in ids:
    info_file = ROOT / "data/chars" / f"{char_id}.json"
    if not info_file.exists():
        print(f"跳过 {char_id}：没有 data/chars/{char_id}.json")
        continue
    lines = json.loads(info_file.read_text("utf-8"))["lines"]
    out_dir = ROOT / "audio" / char_id
    out_dir.mkdir(parents=True, exist_ok=True)
    for key, text in lines.items():
        out = out_dir / f"{key}.mp3"
        if out.exists() and not force:
            continue
        jobs.append((char_id, key, text, out))

print(f"待生成 {len(jobs)} 句", flush=True)
sem = asyncio.Semaphore(CONCURRENCY)
failed: list[str] = []

async def one(char_id: str, key: str, text: str, out: Path) -> None:
    async with sem:
        for attempt in range(1, RETRIES + 1):
            try:
                await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(out))
                print(f"{char_id}/{key}.mp3  {text}", flush=True)
                return
            except Exception as e:  # 网络/服务抖动，退避后重试
                if attempt == RETRIES:
                    failed.append(f"{char_id}/{key}: {e}")
                    print(f"失败 {char_id}/{key}：{e}", flush=True)
                else:
                    await asyncio.sleep(2 * attempt)

async def main() -> None:
    await asyncio.gather(*(one(*j) for j in jobs))
    if failed:
        print(f"\n{len(failed)} 句失败：")
        for f in failed:
            print(" ", f)
        sys.exit(1)
    print("\n全部完成")

asyncio.run(main())
