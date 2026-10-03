export const styles = [
  ["plain", "普通"],
  ["bold", "粗体"],
  ["italic", "斜体"],
  ["bold-italic", "粗斜体"],
  ["script", "花体"],
  ["bold-script", "粗花体"],
  ["fraktur", "哥特体"],
  ["bold-fraktur", "粗哥特体"],
  ["double-struck", "双线体"],
  ["sans", "无衬线"],
  ["sans-bold", "无衬线粗体"],
  ["sans-italic", "无衬线斜体"],
  ["sans-bold-italic", "无衬线粗斜体"],
  ["monospace", "等宽"],
  ["fullwidth", "全角"],
  ["circled", "圈字"],
  ["parenthesized", "括号字"],
  ["squared-uppercase", "方框字（转大写）"],
  ["negative-circled-uppercase", "黑圈字（转大写）"],
  ["negative-squared-uppercase", "黑方框字（转大写）"],
] as const;
const starts: Record<string, [number, number, number?]> = {
  bold: [0x1d400, 0x1d41a, 0x1d7ce],
  italic: [0x1d434, 0x1d44e],
  "bold-italic": [0x1d468, 0x1d482],
  script: [0x1d49c, 0x1d4b6],
  "bold-script": [0x1d4d0, 0x1d4ea],
  fraktur: [0x1d504, 0x1d51e],
  "bold-fraktur": [0x1d56c, 0x1d586],
  "double-struck": [0x1d538, 0x1d552, 0x1d7d8],
  sans: [0x1d5a0, 0x1d5ba, 0x1d7e2],
  "sans-bold": [0x1d5d4, 0x1d5ee, 0x1d7ec],
  "sans-italic": [0x1d608, 0x1d622],
  "sans-bold-italic": [0x1d63c, 0x1d656],
  monospace: [0x1d670, 0x1d68a, 0x1d7f6],
  fullwidth: [0xff21, 0xff41, 0xff10],
  circled: [0x24b6, 0x24d0],
  parenthesized: [0x1f110, 0x249c],
  "squared-uppercase": [0x1f130, 0x1f130],
  "negative-circled-uppercase": [0x1f150, 0x1f150],
  "negative-squared-uppercase": [0x1f170, 0x1f170],
};
const exceptions: Record<string, Record<string, number>> = {
  italic: { h: 0x210e },
  script: {
    B: 0x212c,
    E: 0x2130,
    F: 0x2131,
    H: 0x210b,
    I: 0x2110,
    L: 0x2112,
    M: 0x2133,
    R: 0x211b,
    e: 0x212f,
    g: 0x210a,
    o: 0x2134,
  },
  fraktur: { C: 0x212d, H: 0x210c, I: 0x2111, R: 0x211c, Z: 0x2128 },
  "double-struck": {
    C: 0x2102,
    H: 0x210d,
    N: 0x2115,
    P: 0x2119,
    Q: 0x211a,
    R: 0x211d,
    Z: 0x2124,
  },
};
export function stylize(value: string, style: string): string {
  if (style === "plain") return value;
  const start = starts[style];
  if (!start) throw new Error(`未知字符样式：${style}`);
  return Array.from(value, (c) => {
    const special = exceptions[style]?.[c];
    if (special) return String.fromCodePoint(special);
    const code = c.codePointAt(0)!;
    if (code >= 65 && code <= 90)
      return String.fromCodePoint(start[0] + code - 65);
    if (code >= 97 && code <= 122)
      return String.fromCodePoint(start[1] + code - 97);
    if (code >= 48 && code <= 57 && start[2])
      return String.fromCodePoint(start[2] + code - 48);
    return c;
  }).join("");
}
