// U+2E80~U+2EF3 is the CJK radicals supplement block
// U+2F00~U+2FD5 is the Kangxi radicals block
const radicals = /[\u2e80-\u2ef3\u2f00-\u2fd5]/;

// export const fullWidthAlphanumerics = /[\uff01-\uff5e]/;

const specialChars =
  /[\u3005\u3021-\u3029\u3038\u303B\uFF0C\u25cb\u200c\u337B-\u337E]/;
// Here's a breakdown of the Unicode ranges:
// 々 (U+3005) Iteration mark
// 〡-〩 (U+3021-U+3029) Ideographic tally marks (1 through 9)
// 〸 (U+3038) Tally mark 10
// 〻 (U+303B) Ideographic iteration mark
// ， (U+FF0C) Full-width comma
// ○ (U+25CB) white circle
//   (U+200C) zero-width non-joiner:
// On some platforms, Google Docs puts zero-width joiner characters between
// _all_ the characters so we need to match on them in order to match runs of
// characters.
// U+337B~U+337E is various Japanese era names e.g. ㍻

const cjk =
  /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u3007\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{30000}-\u{3134F}\u{31350}-\u{323AF}\u{2F800}-\u{2FA1F}]/u;

// [U+4E00, U+9FFF],  // CJK Unified Ideographs
// [U+3400, U+4DBF],  // CJK Unified Ideographs Extension A
// [U+F900, U+FAFF],  // CJK Compatibility Ideographs
// [U+3007],  // Ideographic Number Zero
// [U+20000, U+2A6DF],  // CJK Unified Ideographs Extension B
// [U+2A700, U+2B73F],  // CJK Unified Ideographs Extension C
// [U+2B740, U+2B81F],  // CJK Unified Ideographs Extension D
// [U+2B820, U+2CEAF],  // CJK Unified Ideographs Extension E
// [U+2CEB0, U+2EBEF],  // CJK Unified Ideographs Extension F
// [U+30000, U+3134F],  // CJK Unified Ideographs Extension G
// [U+31350, U+323AF],  // CJK Unified Ideographs Extension H
// [U+2F800, U+2FA1F]   // CJK Compatibility Ideographs Supplement

// const hiragana_katakana = /[\u3041-\u309f\u{1b001}\u30a0-\u30ff\u{1b000}]/u;

export function getCombinedCharRange(ranges: Array<RegExp>): RegExp {
  let source = '[';
  let flags = '';

  for (const range of ranges) {
    // Check we have a character class
    if (!isCharacterClassRange(range)) {
      throw new Error(`Expected a character class range, got: ${range.source}`);
    }

    // Check it is not negated
    if (range.source[1] === '^') {
      throw new Error(
        `Expected a non-negated character class range, got ${range.source}`
      );
    }

    source += range.source.substring(1, range.source.length - 1);
    if (range.flags.indexOf('u') !== -1) {
      flags = 'u';
    }
  }

  source += ']';

  return new RegExp(source, flags);
}

// This is far from complete but all the RegExps we deal with are ones we've
// written so hopefully it's a good-enough sanity check.
function isCharacterClassRange(re: RegExp): boolean {
  return (
    re.source.length >= 2 &&
    re.source.startsWith('[') &&
    re.source.endsWith(']') &&
    !re.source.includes(']|[')
  );
}

// "Chinese" here simply means any character we treat as worth attempting to
// translate. but NOT characters that typically delimit words.
const chineseChar = getCombinedCharRange([radicals, specialChars, cjk]);

//CY: after changing the char range, we need to sync check this with normalize-input.ts

// /[
//   \u200c              // Zero Width Non-Joiner (ZWNJ)
//   \u25cb              // White Circle
//   \u2e80-\u2ef3       // CJK Radicals Supplement
//   \u2f00-\u2fd5       // Kangxi Radicals
//   \u3005              // Ideographic Iteration Mark
//   \u3007              // Ideographic Number Zero
//   \u3021-\u3029       // Hangzhou Numerals
//   \u3038\u303B        // Hangzhou Numerals and Ideographic Iteration Mark
//   \u337B-\u337E       // Square Era Names
//   \u3400-\u4DBF       // CJK Unified Ideographs Extension A
//   \u4E00-\u9FFF       // CJK Unified Ideographs
//   \uF900-\uFAFF       // CJK Compatibility Ideographs
//   \uFF0C              // Fullwidth Comma
//   \u{20000}-\u{2A6DF} // CJK Unified Ideographs Extension B
//   \u{2A700}-\u{2B73F} // CJK Unified Ideographs Extension C
//   \u{2B740}-\u{2B81F} // CJK Unified Ideographs Extension D
//   \u{2B820}-\u{2CEAF} // CJK Unified Ideographs Extension E
//   \u{2CEB0}-\u{2EBEF} // CJK Unified Ideographs Extension F
//   \u{2F800}-\u{2FA1F} // CJK Compatibility Ideographs Supplement
//   \u{30000}-\u{3134F} // CJK Unified Ideographs Extension G
//   \u{31350}-\u{323AF} // CJK Unified Ideographs Extension H
// ]/u

export function getNegatedCharRange(range: RegExp): RegExp {
  // Check if we got a character class range
  if (!isCharacterClassRange(range)) {
    throw new Error(`Expected a character class range, got: ${range.source}`);
  }

  const negated = range.source[1] === '^';

  const source = `[${negated ? '' : '^'}${range.source.substring(
    negated ? 2 : 1,
    range.source.length - 1
  )}]`;

  return new RegExp(source, range.flags);
}

export const nonChineseChar = getNegatedCharRange(chineseChar);

export function hasKatakana(text: string): boolean {
  return false;
}

// check if starts with 0-9 or full-width 0-9
export function startsWithDigit(input: string): boolean {
  const c = input.length ? input.charCodeAt(0) : 0;
  return (c >= 48 && c <= 57) || (c >= 65296 && c <= 65305);
}

// const hanziNumerals = [
//   '〇',
//   '一',
//   '二',
//   '三',
//   '四',
//   '五',
//   '六',
//   '七',
//   '八',
//   '九',
//   '十',
//   '百',
//   '千',
//   '万',
//   '億',
// ];

// // check if starts with 0-9 or full-width 0-9 or hanzi numerals
// export function startsWithNumeral(input: string): boolean {
//   return (
//     startsWithDigit(input) ||
//     (!!input.length && hanziNumerals.includes(input[0]))
//   );
// }

const onlyDigits = /^[0-9０-９,，、.．]+$/;

// checks for only digits and decimal separators
// CY: currently among these chars, chineseChar only covers 0-9 and full width comma ，
export function isOnlyDigits(input: string): boolean {
  return onlyDigits.test(input);
}
