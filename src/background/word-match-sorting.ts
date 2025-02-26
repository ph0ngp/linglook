// This is duplicated from jpdict-idb's sorting of entries.
//
// We only use it for sorting in the case where we've fallen back to the
// flat file database so it doesn't need to be perfect or even keep in sync
// with changes to jpdict-idb. It's really just a stop-gap measure.
import { convert_to_toned_pinyin } from '../utils/romaji';

import { WordResult } from './search-result';

// As with Array.prototype.sort, sorts `results` in-place, but returns the
// result to support chaining.
export function sortWordResults(results: Array<WordResult>): Array<WordResult> {
  const sortMeta: Map<number, { priority: number; type: number }> = new Map();

  for (const result of results) {
    // Determine the headword match type
    //
    // 1 = match on a kanji, or kana which is not just the reading for a kanji
    // 2 = match on a kana reading for a kanji
    const kanaReading = result.r.find((r) => !!r.matchRange);
    const rt = kanaReading ? getKanaHeadwordType(kanaReading, result) : 1;

    // Priority
    const priority = getPriority(result);

    sortMeta.set(result.id, { priority, type: rt });
  }

  results.sort((a, b) => {
    const metaA = sortMeta.get(a.id)!;
    const metaB = sortMeta.get(b.id)!;

    if (metaA.type !== metaB.type) {
      return metaA.type - metaB.type;
    }

    return metaB.priority - metaA.priority;
  });

  return results;
}

function getKanaHeadwordType(
  r: WordResult['r'][number],
  result: WordResult
): 1 | 2 {
  // We don't want to prioritize readings marked as `ok` etc. or else we'll end
  // up prioritizing words like `檜` and `羆` being prioritized when searching
  // for `ひ`.
  const isReadingObscure =
    r.i?.includes('ok') ||
    r.i?.includes('rk') ||
    r.i?.includes('sk') ||
    r.i?.includes('ik');

  if (isReadingObscure) {
    return 2;
  }

  // Kana headwords are type 1 (i.e. they are a primary headword, not just a
  // reading for a kanji headword) if:
  //
  // (a) the entry has no kanji headwords or all the kanji headwords are marked
  //     as `rK`, `sK`, or `iK`.
  if (
    !result.k.length ||
    result.k.every(
      (k) => k.i?.includes('rK') || k.i?.includes('sK') || k.i?.includes('iK')
    )
  ) {
    return 1;
  }

  // (b) all senses for the entry have a `uk` (usually kana) `misc` field
  //     and the reading is not marked as `ok` (old kana usage).
  //
  // We wanted to make the condition here be just one sense being marked as `uk`
  // but then you get words like `梓` being prioritized when searching for `し`
  // because of one sense out of many being usually kana.
  if (result.s.every((s) => s.misc?.includes('uk'))) {
    return 1;
  }

  // (c) the headword is marked as `nokanji`
  return r.app === 0 ? 1 : 2;
}

// From lowest to highest priority
// TODOP: value of this should be set and updated according to lang
const PRIORITY_DEFINITIONS: Array<Array<string>> = [
  [
    'archaic variant of',
    'ancient variant of',
    'erroneous variant of',
    'biến thể cổ của',
    'biến thể sai của',
  ],
  ['old variant of', 'biến thể cũ của'],
  ['surname', 'họ [', 'họ hai chữ ['],
  ['variant of', 'biến thể của'],
];

// from lowest to highest priority: archaic variant of, old variant of, surname, variant of, then if single caharacter: from lowest to highest priority of pinyin frequency list. Inside these, if same pinyin, give less priority for uppercase character
function getPriority(result: WordResult): number {
  const def = result.s[0].g[0].str;
  const pinyin = result.r?.[0]?.ent;
  // for same pinyin entries, give less priority for uppercase character
  const subtractUppercase = pinyin !== pinyin.toLowerCase() ? -0.5 : 0;

  for (let priority = 0; priority < PRIORITY_DEFINITIONS.length; priority++) {
    if (PRIORITY_DEFINITIONS[priority].some((phrase) => def.includes(phrase))) {
      return priority + subtractUppercase;
    }
  }

  let finalPriority = PRIORITY_DEFINITIONS.length; // Default priority if no matches found

  // only for single character: compare this character's pinyin with the pinyin frequency list to get priority
  if (result.k[0].ent.length === 1 && result.k[0].bg?.src) {
    const allCharsData = result.k[0].bg.src.split('\n');
    if (allCharsData.length > 0) {
      // certainly pass, check just in case
      // CY: our longestPinyinList is not always the same as our character's possible pinyins (longestPinyinList can be longer). For example, 發 and 以. But this approach is for simplicity, and it works well enough.
      // Create array to store all pinyin lists
      const allPinyinList: string[][] = [];
      // Process each character's data
      for (const charData of allCharsData) {
        const info = charData.split('_');
        // CY: if change number 8, must change in render-popup.ts too. For details of all the fields see notes.md
        // TODOP2: currently this part is quite duplicated with render-popup.ts . Might need to optimize later
        if (info.length === 8) {
          allPinyinList.push(
            info[1].split(',').map((pinyin) => pinyin.toLowerCase())
          );
        }
      }
      // Find the list with maximum length
      const longestPinyinList = allPinyinList.reduce(
        (longest, current) =>
          current.length > longest.length ? current : longest,
        []
      );

      if (longestPinyinList.length > 0) {
        // certainly pass, check just in case
        if (pinyin) {
          // console.log(result)
          // console.log(longestPinyinList)
          const tonedPinyin = convert_to_toned_pinyin(pinyin.toLowerCase());
          const pinyinIndex = longestPinyinList.indexOf(tonedPinyin);
          // need to reverse it because the frequency list is sorted from most popular to least popular
          const pinyinPriority =
            pinyinIndex > -1 ? longestPinyinList.length - pinyinIndex : 0;
          finalPriority += pinyinPriority + 1;
          // console.log('tonedPinyin', convert_to_toned_pinyin(pinyin), 'pinyinIndex', pinyinIndex, 'pinyinPriority', pinyinPriority, 'finalPriority', finalPriority)
        }
      }
    }
  }
  return finalPriority + subtractUppercase;

  // const scores: Array<number> = [0];

  // // Scores from kanji readings
  // for (const k of result.k || []) {
  //   if (!k.matchRange || !k.p) {
  //     continue;
  //   }

  //   scores.push(getPrioritySum(k.p));
  // }

  // // Scores from kana readings
  // for (const r of result.r) {
  //   if (!r.matchRange || !r.p) {
  //     continue;
  //   }

  //   scores.push(getPrioritySum(r.p));
  // }

  // // Return top score
  // return Math.max(...scores);
}

// Produce an overall priority from a series of priority strings.
//
// This should produce a value somewhere in the range 0~67.
//
// In general we report the highest priority, but if we have several priority
// scores we add a decreasing fraction (10%) of the lesser scores as an
// indication that several sources have attested to the priority.
//
// That should typically produce a maximum attainable score of 66.8.
// Having a bounded range like this makes it easier to combine this value with
// other metrics when sorting.
function getPrioritySum(priorities: Array<string>): number {
  const scores = priorities.map(getPriorityScore).sort().reverse();
  return scores.length
    ? scores[0] +
        scores
          .slice(1)
          .reduce(
            (total, score, index) => total + score / Math.pow(10, index + 1),
            0
          )
    : 0;
}

// This assignment is pretty arbitrary however it's mostly used for sorting
// entries where all we need to do is distinguish between the really common ones
// and the obscure academic ones.
//
// Entries with (P) are those ones that are marked with (P) in Edict.
const PRIORITY_ASSIGNMENTS: Map<string, number> = new Map([
  ['i1', 50], // Top 10,000 words minus i2 (from 1998) (P)
  ['i2', 20],
  ['n1', 40], // Top 12,000 words in newspapers (from 2003?) (P)
  ['n2', 20], // Next 12,000
  ['s1', 32], // "Speculative" annotations? Seem pretty common to me. (P)
  ['s2', 20], // (P)
  ['g1', 30], // (P)
  ['g2', 15],
]);

function getPriorityScore(p: string): number {
  if (PRIORITY_ASSIGNMENTS.has(p)) {
    return PRIORITY_ASSIGNMENTS.get(p)!;
  }

  if (p.startsWith('nf')) {
    // The wordfreq scores are groups of 500 words.
    // e.g. nf01 is the top 500 words, and nf48 is the 23,501 ~ 24,000
    // most popular words.
    const wordfreq = parseInt(p.substring(2), 10);
    if (wordfreq > 0 && wordfreq < 48) {
      return 48 - wordfreq / 2;
    }
  }

  return 0;
}
