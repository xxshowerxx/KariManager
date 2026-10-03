# 输出模板

在模板编辑页调整格式，或直接编辑模板文本，预览会随修改更新。语法版本为 `kari-text/1`。

## 示例

```text
{{header "借物表" left="── " right=" ──"}}
{{blank 1}}
{{#rows gap=0}}
【{{label}}】{{#if title}}{{title}} — {{/if}}{{credits | join:" / "}}
{{/rows}}
```

输出：

```text
── 借物表 ──

【模型】作者甲 / 作者乙
【动作】作者甲
【音乐】歌曲标题 — 作者丙
```

`header` 设置借物表标题，`left`、`right` 设置两侧装饰。`blank` 增加空行，`rows` 逐行输出，`gap` 设置行间空行数，取值均为 0–10。`#if title` 在标题有内容时输出其中的文字。

修改 `join` 的参数可以更换作者分隔符；修改条件块中的 ` — ` 可以更换标题与作者的分隔符。普通文字、换行和尾部说明可以直接写进模板。

## 变量与过滤器

全局变量有 `work.title`、`work.date`、`domain.name`。`rows` 内可使用 `label`（栏目名）、`title`（素材标题）、`credits`（署名列表）、`sources`（来源链接列表）。署名按填写顺序输出，不同行之间保留重复名字。

| 写法 | 用途 |
| --- | --- |
| `{{credits \| join:" / "}}` | 连接署名，单个名字没有分隔符 |
| `{{credits \| suffix:"様" \| join:" / "}}` | 按敬称设置给名字加后缀，再连接 |
| `{{label \| style:"bold-italic"}}` | 转换 Unicode 字符样式 |
| `{{label \| frame:"【","】"}}` | 添加左右装饰 |
| `{{sources \| join:"\n"}}` | 每行输出一个来源链接 |

表格中的 `\|` 是 Markdown 转义；写入模板时直接使用 `|`。参数使用双引号字符串，支持 `\"`、`\\`、`\n`、`\t` 转义。

`join` 用于列表，`frame` 用于文字。`suffix` 遵循条目的敬称设置，已有相同后缀时保留原样。`style` 用于文字或署名列表。

公开说明可放在行循环后：

```text
{{#texts gap=0}}
{{text}}
{{/texts}}
```

`text` 对应作品中的公开文本块。循环与条件标签独占一行时，输出会去掉该控制行；普通内容的换行保留。

## 字符样式

给 `header` 添加 `style="bold-italic"` 可以转换标题；其他文字使用 `style` 过滤器。样式转换用于输出，资料库保留原始名字。

| style ID | 样式 |
| --- | --- |
| plain | 普通 |
| bold | 粗体 |
| italic | 斜体 |
| bold-italic | 粗斜体 |
| script | 花体 |
| bold-script | 粗花体 |
| fraktur | 哥特体 |
| bold-fraktur | 粗哥特体 |
| double-struck | 双线体 |
| sans | 无衬线 |
| sans-bold | 无衬线粗体 |
| sans-italic | 无衬线斜体 |
| sans-bold-italic | 无衬线粗斜体 |
| monospace | 等宽 |
| fullwidth | 全角 |
| circled | 圈字 |
| parenthesized | 括号字 |
| squared-uppercase | 方框字，大写 |
| negative-circled-uppercase | 黑圈字，大写 |
| negative-squared-uppercase | 黑方框字，大写 |

后三种样式会先将英文字母转为大写。汉字、日文及未映射字符保留原文。

模板可以在预设页导出为 JSON，再导入其他资料库。
