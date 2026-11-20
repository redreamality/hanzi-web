# 通用课生成批次报告：第 5 批（gen-05）

- 负责 agent：char-gen-05（workflow 子任务）
- 字与 id：而 er2、子 zi3、那 na4、得 de2、于 yu2、着 zhe、下 xia4、自 zi4、之 zhi1、年 nian2（认领方式：plan-1000 order 中非 bespoke 按文件顺序第 41 到 50 个）
- 音色：edge-tts zh-CN-XiaoxiaoNeural（脚本内置）

## 逐字记录

### er2 而（ér，六画）
- meaning：而且；words：而且
- kaishu：「而，很久以前，人们用它画脸颊两边的长毛，像胡须垂下来。」
- 目的 3 层：字理（说文「頰毛也。象毛之形」direct；「脸颊两边的长毛」忠实颊毛义，「像胡须垂下来」为明喻不作断言）
- 拿不准：虚词无具象 meaning 可选，取口语连词「而且」；儿（ér）在 idx200 尚未学，sound 按默认式。

### zi3 子（zǐ，三画）
- meaning：孩子；words：孩子、种子
- kaishu：「子，最早画的是个小宝宝，包在小被子里，两只小脚并得拢拢的。」
- 目的 3 层：字理（说文「象形」+条目内李阳冰注「子在襁緥中，足併也」，两脚并拢有据）
- 拿不准：无。

### na4 那（nà，六画）
- meaning：那边；words：那边、那个
- kaishu：「那，左边笔画排排队，右边弯弯的，像一只小耳朵在听话。」
- sound 锁定：「那，那边的那。」（那在口语另有 nèi 音，虽任务书仅要求多音/已学同音时锁定，此处从保守处理）
- 目的 3 层：朴素（shuowen.json 未收「那」字头，families null；「像小耳朵」为阝形态明喻）
- 拿不准：**笔顺**「横折钩，横，横，撇，横撇弯钩，竖」：将 hanzi-writer-data 的笔画渲染成图逐笔核对（笔一为顶横+右竖+末钩，即横折钩），与字形结构交叉验证吻合，置信高，但未对照官方笔顺规范文本。

### de2 得（dé，十一画）
- meaning：得到；words：得到、觉得
- kaishu：「得，古人说，走了一路有了收获，就是得。」
- sound 锁定：「得，得到的得。」（多音字 dé/de/děi）
- 目的 3 层：字理（说文「行有所得也」直白转写；「从彳㝵聲」的彳未学、㝵生僻，声旁与构成均不点）
- 拿不准：无。

### yu2 于（yú，三画）
- meaning：终于；words：终于
- kaishu：「于，两道横平平的，一竖轻轻钩一下，写得又直又稳。」
- 目的 3 层：朴素（extras shuowen 为 null；build-extras.mjs MANUAL_SHUOWEN 虽有 于→亏「於也。象气之舒亏」映射，但虚词互训+气形难向幼儿转写，宁少勿错按朴素白描）
- 拿不准：同音字鱼（idx852）、余（idx731）都在本字之后才学，sound 用默认式。

### zhe 着（zhe，十一画）
- meaning：看着；words：看着、睡着
- kaishu：「着，上面点点撇撇像小草芽，下面的方框稳稳托住。」
- sound 锁定：「着，看着的着。」（多音字 zhe/zháo/zhuó）
- 目的 3 层：朴素（说文未收；主会话已明确排除 着→箸 映射；纯形态明喻）
- 拿不准（重要）：extras 给部件「目」标 recent:true，但 plan 实际 index 目=249 > 着=67（序号差 -182），目在本字之后才学，说「着里有刚学过的目」不成立，故不点构成。**根因是 build-extras.mjs 的 recent 判定 `i - pi <= 50` 在部件排后面时差为负数恒真**，与第 9 批报告的理/王同一数据源 bug，建议上游修复并重跑 extras。

### xia4 下（xià，三画）
- meaning：下雨；words：下雨、下面
- kaishu：「下，人们画一长横，在横下面点一点，说的就是下面。」
- 目的 3 层：字理（指事：一横为基准、点在其下示下；见下「拿不准」证据链说明）
- 拿不准：extras 的 shuowen 为 null，但 build-extras.mjs 的 MANUAL_SHUOWEN（注明「2026-11-19 主会话核准」）有 下→丅 映射，且 data/sources/shuowen.json 的丅条原文「底也。指事。」与脚本注释引文一致——判断 extras 生成早于 MANUAL_SHUOWEN 入库、未重跑。台词据此保守转写（只讲横与点，不演绎「天空」意象）。若校对认定证据必须落在 extras 条目内，此字可降为朴素。

### zi4 自（zì，六画）
- meaning：自己；words：自己、自来水
- kaishu：「自，以前画的就是我们的鼻子，上面一撇，像个小鼻尖。」
- 目的 3 层：字理（说文「鼻也。象鼻形」direct；「像小鼻尖」为明喻；「自→第一人称指鼻」的引申说文未言，不写）
- 拿不准：无。

### zhi1 之（zhī，三画）
- meaning：之后；words：之后、之前
- kaishu：「之，很久以前，画的是小草钻出地面，枝叶越长越大。」
- 目的 3 层：字理（说文「出也。象艸過屮，枝莖益大……一者，地也」的白话；只取草出地上、枝茎渐大，不展开「有所之」的虚词义）
- 拿不准：无。

### nian2 年（nián，六画）
- meaning：新年；words：新年、过年
- kaishu：「年，人们数日子，谷子熟一回，就是一年。」
- 目的 3 层：字理（谷熟为年：证据链同「下」——build-extras.mjs MANUAL_SHUOWEN 年→秊 + shuowen.json 秊条「穀孰也。从禾千聲」原文核对一致；extras 为 null。「数日子」为搭向「一年」的最小说法）
- 拿不准：同 xia4 的证据链说明；「人们数日子」是我为把「谷熟」接到「一年」加的最小桥，说文原文无此语。

## 结尾汇总

- 校验器：`node scripts/validate.mjs` 逐字各 1/1 pass（共 10 次）；`node scripts/validate.mjs er2 zi3 na4 de2 yu2 zhe xia4 zi4 zhi1 nian2 --audio` 收口 → 10/10 pass（含音频）。
- 音频：`uv run --with edge-tts python scripts/gen_audio.py`（10 id 一次）→ 70/70 句一次全成，无需重试；audio_pending：无。
- 目的 3 层使用统计：构成 0、声旁 0、字理 7（而、子、得、下、自、之、年）、纯朴素 3（那、于、着）。本批唯一的 partInfo 字（着）因 recent 数据 bug 不点构成，是构成为 0 的原因；无任何字有可用的已学声旁（得的声旁㝵生僻未学）。
- sound 锁定：那、得、着 三个用「某词的字」锁定式（得/着为多音字，那为保守处理），其余七字默认式。
- 流程说明：brief 第一步清单要求读 `data/chars/de.json` 作样例，该文件已随撤回批次不存在；格式以校验器字段要求 + 第 9 批 guo4.json（通用课实例）推导。笔顺逐笔名均对照 hanzi-writer-data 的 medians/path 逐笔核对（那字的笔一渲染成图确认为横折钩）。
- 数据源问题上报（供主会话/校对）：其一，build-extras.mjs recent 判定负数恒真（着/目、理/王 均中招）；其二，extras 未随 MANUAL_SHUOWEN 重跑（下、年 等 shuowen 仍为 null）。均未越权修改，只在报告记录。
- 未 commit、未跑 e2e、未抓外网（edge-tts 除外），只新建了本批 10 个字的 data/chars/<id>.json 与 audio/<id>/。
