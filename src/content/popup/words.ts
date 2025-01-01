import {
  Gloss,
  KanjiInfo,
  LangSource,
  ReadingInfo,
  groupSenses,
} from '@birchill/jpdict-idb';
import { countMora, moraSubstring } from '@birchill/normal-jp';
import { getHanviet } from 'hanviet-pinyin-words';
import PinyinConverter from 'pinyin-converter';
import browser from 'webextension-polyfill';

import { Sense, WordResult } from '../../background/search-result';
import { PartOfSpeechDisplay } from '../../common/content-config-params';
import { highPriorityLabels } from '../../common/priority-labels';
import { html } from '../../utils/builder';
import { convert_to_toned_pinyin } from '../../utils/romaji';
import { getFilteredTags } from '../../utils/verb-tags';

import { NamePreview } from '../query';

import { CopyState } from './copy-state';
import { renderStar } from './icons';
import { getLangTag } from './lang-tag';
import { renderMetadata } from './metadata';
import { renderName } from './names';
import { getSelectedIndex } from './selected-index';
import { containerHasSelectedText } from './selection';
import type { ShowPopupOptions, StartCopyCallback } from './show-popup';

export function renderWordEntries({
  entries,
  matchLen,
  more,
  namePreview,
  options,
  title,
}: {
  entries: Array<WordResult>;
  matchLen: number;
  more: boolean;
  namePreview: NamePreview | undefined;
  options: ShowPopupOptions;
  title: string | undefined;
}): HTMLElement {
  // console.log(
  //   'getUILanguage',
  //   browser.i18n.getUILanguage(),
  //   '\nnavigator.language',
  //   navigator.language,
  //   '\nnavigator.languages',
  //   navigator.languages,
  //   '\ngetMessage lang_tag',
  //   browser.i18n.getMessage('lang_tag'),
  //   '\ngetMessage ui_locale',
  //   browser.i18n.getMessage('@@ui_locale')
  // );
  const container = html('div', { class: 'wordlist entry-data' });

  if (title) {
    container.append(html('div', { class: 'title', lang: 'zh' }, title));
  }

  // Pre-filter metadata
  //
  // If we have word matches longer than shogi metadata we drop the shogi
  // metadata because the shogi shorthand in particular can turn up false
  // positives on words like ドクター and ドキュメンテーション.
  if (options.meta?.type === 'shogi' && matchLen >= options.meta.matchLen) {
    delete options.meta;
  }

  if (options.meta) {
    const metadata = renderMetadata({
      fxData: options.fxData,
      preferredUnits: options.preferredUnits,
      isCombinedResult: true,
      matchLen,
      meta: options.meta,
    });
    if (metadata) {
      container.append(metadata);
    }
  }

  const numNames = namePreview?.names.length ?? 0;
  const totalEntries = entries.length + numNames;
  const selectedIndex = getSelectedIndex(options.copyState, totalEntries);

  if (namePreview) {
    container.append(
      renderNamePreview(namePreview, {
        copyKind: options.copyState.kind,
        onStartCopy: options.onStartCopy,
        selectedIndex,
      })
    );
  }

  let lastPointerType = 'touch';
  let longestMatch = 0;

  for (const [index, entry] of entries.entries()) {
    // Work out where the fold is so we can make later entries appear in the
    // scrolled-out-of-view range.
    const matchLength = Math.max(
      ...entry.k
        .filter((k) => k.matchRange)
        .map((k) => k.matchRange![1] - k.matchRange![0]),
      ...entry.r
        .filter((r) => r.matchRange)
        .map((r) => r.matchRange![1] - r.matchRange![0]),
      0
    );
    if (matchLength < longestMatch) {
      container.append(html('div', { class: 'fold-point' }));
      // Prevent adding any more fold points
      longestMatch = -Infinity;
    } else if (!longestMatch) {
      longestMatch = matchLength;
    }

    const entryDiv = html('div', { class: 'entry' });
    container.append(entryDiv);

    if (index === selectedIndex - numNames) {
      entryDiv.classList.add(
        options.copyState.kind === 'active' ? '-selected' : '-flash'
      );
    }

    entryDiv.addEventListener('pointerup', (evt) => {
      lastPointerType = evt.pointerType;
    });

    entryDiv.addEventListener('click', (evt) => {
      if (containerHasSelectedText(container)) {
        return;
      }

      // Don't trigger copy mode if we clicked a nested link
      if (evt.target instanceof HTMLAnchorElement) {
        return;
      }

      const trigger = lastPointerType === 'mouse' ? 'mouse' : 'touch';
      options.onStartCopy?.(index + numNames, trigger);
    });

    const headingDiv = html('div', {});
    entryDiv.append(headingDiv);

    const matchedOnKana = entry.r.some((r) => r.matchRange);

    // If we matched on a search-only kanji or kana headword we want to show it
    // prior to the main entry.
    const matchedOnlyOnSearchOnlyKanji =
      !matchedOnKana && entry.k.every((k) => !k.match || k.i?.includes('sK'));
    const matchedOnlyOnSearchOnlyKana =
      matchedOnKana && entry.r.every((r) => !r.match || r.i?.includes('sk'));
    const searchOnlyMatch = matchedOnKana
      ? matchedOnlyOnSearchOnlyKana
        ? entry.r.find((r) => !!r.matchRange)?.ent
        : undefined
      : matchedOnlyOnSearchOnlyKanji
        ? entry.k.find((k) => !!k.matchRange)?.ent
        : undefined;

    if (searchOnlyMatch) {
      const searchOnlyDiv = html(
        'div',
        {
          class: 'tp-mb-1 tp-text-sm tp-opacity-70',
        },
        browser.i18n.getMessage('content_sk_match_src', searchOnlyMatch)
      );
      headingDiv.append(searchOnlyDiv);
    }

    const kanjiHeadwords = entry.k
      ? entry.k.filter((k) => !k.i?.includes('sK'))
      : [];

    // If we matched on kana, then any headwords which are _not_ matches should
    // be hidden since they don't apply to the kana.
    //
    // This is because we mostly only show matching kana headwords and so if we
    // start showing kanji that don't correspond to the kana headwords, the
    // result will be misleading.
    //
    // For example, take the string さいだん. Entry 1385120 has readings
    // さいだん and せつだん but さいだん is specifically bound to the 截断
    // kanji.
    //
    // As a result if we look up さいだん we'll mark the さいだん kana headword
    // as a match and the 截断 kanji headword too. As per our usual processing,
    // we'll only show the さいだん kana headword, however, not せつだん.
    //
    // If we were also to show the unmatched 切断 kanji headword we'd end up
    // displaying:
    //
    // 截断、切断  さいだん
    //
    // which would be misleading since 切断 can never have that reading.
    let matchingKanji = matchedOnKana
      ? kanjiHeadwords.filter((k) => k.match)
      : kanjiHeadwords;

    // Remove duplicates based on 'ent' value while preserving order
    // (if there is no separate simplified and traditional char, display only 1 form)
    matchingKanji = matchingKanji.filter(
      (kanji, index, self) =>
        index === self.findIndex((t) => t.ent === kanji.ent)
    );

    // simptrad: simplified before traditional
    // tradsimp: traditional before simplified
    // onlysimp: simplified only
    // onlytrad: only show traditional
    if (
      options.hanziDisplay === 'tradsimp' ||
      options.hanziDisplay === 'onlytrad'
    ) {
      // Show traditional form before simplified form if enabled
      matchingKanji = matchingKanji.reverse();
    }

    const showBothSimplifiedTraditional =
      options.hanziDisplay === 'tradsimp' ||
      options.hanziDisplay === 'simptrad';
    // Sort matched kanji entries first
    // disable sort because we want to keep the order of them: simplified, traditional
    // matchingKanji.sort((a, b) => Number(b.match) - Number(a.match));
    if (matchingKanji.length) {
      const kanjiSpan = html('span', { class: 'w-kanji', lang: 'zh' });
      let wkElement = null;
      let bvElement = null;
      for (const [i, kanji] of matchingKanji.entries()) {
        if (i && showBothSimplifiedTraditional) {
          kanjiSpan.append(
            html(
              'span',
              {
                class: 'separator',
                style: 'display: inline-block; width: 0.5em;',
              },
              ' '
            )
          );
        }

        let headwordSpan = kanjiSpan;
        const ki = new Set(kanji.i || []);
        if (
          // only dim if we show both simplified and traditional characters
          showBothSimplifiedTraditional &&
          // Always dim search-only kanji
          (ki.has('sK') ||
            // Dim the non-matching kanji unless there are none because we
            // matched only on search-only kanji headwords.
            (!kanji.match && !matchedOnlyOnSearchOnlyKanji) ||
            // If we matched on the reading, dim any kanji headwords that are
            // irregular, old, or rare.
            (matchedOnKana && (ki.has('iK') || ki.has('oK') || ki.has('rK'))))
        ) {
          const dimmedSpan = html('span', { class: 'dimmed' });
          kanjiSpan.append(dimmedSpan);
          headwordSpan = dimmedSpan;
        }

        if (i === 0 || showBothSimplifiedTraditional) {
          // always display the first one but for the second one, only display if the option is to show both
          headwordSpan.append(kanji.ent);
        }

        appendHeadwordInfo(kanji.i, headwordSpan);
        // if (options.hanvietDisplay) {
        //   appendPriorityMark(kanji.p, headwordSpan);
        // }
        if (options.hskDisplay === 'show-matches' && kanji.wk) {
          wkElement = appendWaniKaniLevelTag(kanji.wk, kanji.ent, headwordSpan);
        }
        if (options.tocflDisplay && kanji.bv) {
          bvElement = appendBunproTag(kanji.bv, 'vocab', headwordSpan);
        }
        // if (options.tocflDisplay && kanji.bg) {
        //   appendBunproTag(kanji.bg, 'grammar', headwordSpan);
        // }
      }
      if (wkElement || bvElement) {
        kanjiSpan.append(
          html(
            'span',
            {
              class: 'separator',
              style: 'display: inline-block; width: 0.5em;',
            },
            ' '
          )
        );
        if (wkElement) {
          kanjiSpan.append(wkElement);
        }
        if (bvElement) {
          kanjiSpan.append(bvElement);
        }
      }
      headingDiv.append(kanjiSpan);
    }

    // Typically we only show the matching kana headwords but if we matched on
    // an irregular form or a search-only form, we should show the regular kana
    // headwords too, for reference.
    //
    // For example, if we looked up ふんいき (雰囲気) we should only show that
    // headword, but if we looked up ふいんき, we should show the more correct
    // ふんいき too.
    const matchedOnIrregularKana =
      matchedOnKana &&
      entry.r.every(
        (r) =>
          !r.match ||
          r.i?.includes('ik') ||
          r.i?.includes('ok') ||
          r.i?.includes('rk') ||
          r.i?.includes('sk')
      );

    // For search-only kanji, we show them only if they are the ONLY matches.
    const matchingKana = entry.r.filter(
      (r) =>
        !r.i?.includes('sk') &&
        (r.match ||
          (matchedOnIrregularKana &&
            !r.i?.includes('ik') &&
            !r.i?.includes('ok') &&
            !r.i?.includes('rk') &&
            !r.i?.includes('sk')))
    );

    // if (matchingKana.length) {
    //   const kanaSpan = html('span', { class: 'w-kana', lang: 'ja' });
    //   for (const [i, kana] of matchingKana.entries()) {
    //     if (i) {
    //       kanaSpan.append(html('span', { class: 'separator' }, '、'));
    //     }

    //     // Dim irrelevant headwords
    //     let headwordSpan = kanaSpan;
    //     if (
    //       // If we looked up by kanji, dim any kana headwords that are
    //       // irregular, old, or rare.
    //       !matchedOnKana &&
    //       (kana.i?.includes('ik') ||
    //         kana.i?.includes('ok') ||
    //         kana.i?.includes('rk'))
    //     ) {
    //       const dimmedSpan = html('span', { class: 'dimmed' });
    //       kanaSpan.append(dimmedSpan);
    //       headwordSpan = dimmedSpan;
    //     }

    //     headwordSpan.append(renderKana(kana, options));
    //     appendHeadwordInfo(kana.i, headwordSpan);
    //     if (options.hanvietDisplay) {
    //       appendPriorityMark(kana.p, headwordSpan);
    //     }
    //     if (options.tocflDisplay && kana.bv) {
    //       appendBunproTag(kana.bv, 'vocab', headwordSpan);
    //     }
    //     if (options.tocflDisplay && kana.bg) {
    //       appendBunproTag(kana.bg, 'grammar', headwordSpan);
    //     }
    //   }
    //   headingDiv.append(kanaSpan);
    // }

    if (entry.romaji?.length) {
      const pinyin_words = preprocess_pinyin(entry.romaji[0]);
      headingDiv.append(
        html(
          'span',
          { class: 'w-romaji', lang: 'zh' },
          convert_to_toned_pinyin(entry.romaji[0])
        )
      );
      if (options.hanvietDisplay) {
        // CY: entry.k.length > 1 is only for the original japanese dict testing. For chinese dict, entry.k.length always = 2
        if (
          entry.k.length > 1 &&
          entry.k[1].ent.length === pinyin_words.length
        ) {
          headingDiv.append(
            html(
              'span',
              {
                class: 'separator',
                style: 'display: inline-block; width: 0.5em;',
              },
              ' '
            )
          );
          headingDiv.append(
            html(
              'span',
              { class: 'w-hanviet', lang: 'vi' },
              getHanviet(entry.k[1].ent, pinyin_words)
            )
          );
        }
      }
    }

    if (entry.reason) {
      headingDiv.append(
        html(
          'span',
          { class: 'w-conj', lang: getLangTag() },
          `(${entry.reason})`
        )
      );
    }

    if (options.showDefinitions) {
      // If we have hidden all the kanji headwords, then we shouldn't show
      // "usually kana" annotations on definitions.
      if (!matchingKanji.length) {
        entry.s = entry.s.map((s) => ({
          ...s,
          misc: s.misc?.filter((m) => m !== 'uk'),
        }));
      }

      entryDiv.append(renderDefinitions(entry, options));
    }
  }

  if (more) {
    container.append(html('div', { class: 'more' }, '…'));
  }

  return container;
}

function renderNamePreview(
  { names, more }: NamePreview,
  {
    copyKind,
    onStartCopy,
    selectedIndex,
  }: {
    copyKind: CopyState['kind'];
    onStartCopy?: StartCopyCallback;
    selectedIndex?: number;
  }
): HTMLElement {
  const container = html('div', { class: 'bonus-name' });

  let lastPointerType = 'touch';

  for (const [index, name] of names.entries()) {
    const nameEntry = renderName(name);
    if (index === selectedIndex) {
      nameEntry.classList.add(copyKind === 'active' ? '-selected' : '-flash');
    }

    nameEntry.addEventListener('pointerup', (evt) => {
      lastPointerType = evt.pointerType;
    });

    nameEntry.addEventListener('click', () => {
      if (containerHasSelectedText(container)) {
        return;
      }

      const trigger = lastPointerType === 'mouse' ? 'mouse' : 'touch';
      onStartCopy?.(index, trigger);
    });

    container.append(nameEntry);
  }

  if (more) {
    container.append(html('span', { class: 'more' }, '…'));
  }

  return container;
}

function appendHeadwordInfo(
  info: Array<string> | undefined,
  parent: ParentNode
) {
  if (!info || !info.length) {
    return;
  }

  for (const i of info) {
    const span = html(
      'span',
      { class: 'w-head-info', lang: getLangTag() },
      '('
    );

    // Some KanjiInfo/RadicalInfo values differ only by case but
    // addons-linter (as used by webext etc.) does not allow WebExtension i18n
    // keys to differ by case only.
    //
    // I couldn't find the rationale for this, the rule just magically
    // appears in https://github.com/mozilla/addons-linter/commit/3923b399f8166b59617071730b87048f45122c7e
    // it seems.
    const specialKeys: { [k in KanjiInfo | ReadingInfo]?: string } = {
      iK: 'ikanji',
      ik: 'ikana',
      oK: 'okanji',
      ok: 'okana',
      rK: 'rkanji',
      rk: 'rkana',
      // We normally don't show search-only kanji/kana headwords unless they are
      // exact matches. In those cases we should probably just indicate them as
      // "irregular" kanji/kana.
      sK: 'ikanji',
      sk: 'ikana',
    };
    const key = specialKeys.hasOwnProperty(i)
      ? specialKeys[i as KanjiInfo | ReadingInfo]
      : i;

    span.append(browser.i18n.getMessage(`head_info_label_${key}`) || i, ')');
    parent.append(span);
  }
}

function appendPriorityMark(
  priority: Array<string> | undefined,
  parent: ParentNode
) {
  if (!priority || !priority.length) {
    return;
  }

  // These are the ones that are annotated with a (P) in the EDICT file.
  const highPriorityLabelsSet = new Set(highPriorityLabels);
  const highPriority = priority.some((p) => highPriorityLabelsSet.has(p));

  parent.append(renderStar(highPriority ? 'full' : 'hollow'));
}

function appendWaniKaniLevelTag(
  level: number,
  ent: string,
  parent: ParentNode
): Element {
  return html(
    'span',
    { class: 'wk-level' },
    html('span', {}, String(level === 7 ? '7-9' : level))
  );
}

function appendBunproTag(
  data: { l: number; src?: string },
  type: 'vocab' | 'grammar',
  parent: ParentNode
): Element {
  const label = browser.i18n.getMessage(
    type === 'vocab' ? 'popup_bp_vocab_tag' : 'popup_bp_grammar_tag',
    [String(data.l)]
  );
  const outerSpan = html(
    'span',
    { class: `bp-tag -${type}` },
    html('span', {}, label)
  );
  if (data.src) {
    outerSpan.append(html('span', { class: 'bp-src' }, data.src));
  }
  return outerSpan;
}

function renderKana(
  kana: WordResult['r'][0],
  options: ShowPopupOptions
): string | Element {
  const accents = kana.a;
  if (
    options.hanziDisplay === 'onlytrad' ||
    typeof accents === 'undefined' ||
    (Array.isArray(accents) && !accents.length)
  ) {
    return kana.ent;
  }

  const accentPos = typeof accents === 'number' ? accents : accents[0].i;

  if (options.hanziDisplay === 'tradsimp') {
    if (!accentPos) {
      // accentPos 0 (heiban) is special since there's no accent to show.
      //
      // At the same time we want to distinguish between heiban and
      // "no accent information". So we indicate heiban with a dotted line
      // across the top instead.
      return html('span', { class: 'w-heiban' }, kana.ent);
    } else {
      return (
        moraSubstring(kana.ent, 0, accentPos) +
        'ꜜ' +
        moraSubstring(kana.ent, accentPos)
      );
    }
  }

  // Generate binary pitch display
  const wrapperSpan = html('span', { class: 'w-binary' });
  if (options.hanziDisplay === 'onlysimp') {
    wrapperSpan.classList.add('-hi-contrast');
  }

  // Accent position 0 (heiban: LHHHHH) and accent position 1 (atamadaka: HLLLL)
  // are sufficiently similar that we handle them together.
  if (accentPos === 0 || accentPos === 1) {
    const len = countMora(kana.ent);
    wrapperSpan.append(
      html(
        'span',
        { class: accentPos ? 'h-l' : len > 1 ? 'l-h' : 'h' },
        moraSubstring(kana.ent, 0, 1)
      )
    );

    if (len > 1) {
      wrapperSpan.append(
        html(
          'span',
          { class: accentPos ? 'l' : 'h' },
          moraSubstring(kana.ent, 1)
        )
      );
    }
  } else {
    // Otherwise we have nakadaka (LHHHHL) or odaka (LHHHH)
    wrapperSpan.append(
      html('span', { class: 'l-h' }, moraSubstring(kana.ent, 0, 1))
    );

    wrapperSpan.append(
      html('span', { class: 'h-l' }, moraSubstring(kana.ent, 1, accentPos))
    );

    if (accentPos < countMora(kana.ent)) {
      wrapperSpan.append(
        html('span', { class: 'l' }, moraSubstring(kana.ent, accentPos))
      );
    }
  }

  return wrapperSpan;
}

function renderDefinitions(
  entry: WordResult,
  options: {
    dictLang?: string;
    posDisplay: PartOfSpeechDisplay;
  }
) {
  const senses = entry.s.filter((s) => s.match);
  if (!senses.length) {
    return '';
  }

  const definitionsDiv = html('div', { class: 'w-def' });

  if (senses.length === 1) {
    definitionsDiv.append(renderSense(senses[0], options, entry));
    // definitionsDiv.lang = senses[0].lang || 'en';
    definitionsDiv.lang = options.dictLang || 'en';
    if (
      options.dictLang &&
      options.dictLang !== 'en' &&
      senses[0].lang !== options.dictLang
    ) {
      definitionsDiv.classList.add('foreign');
    }
  } else {
    // First extract any native language senses
    const nativeSenses = senses.filter((s) => s.lang && s.lang !== 'en');
    if (nativeSenses.length) {
      const definitionList = html('ul', {});
      for (const sense of nativeSenses) {
        definitionList.append(
          html(
            'li',
            { lang: sense.lang || 'en' },
            renderSense(sense, options, entry)
          )
        );
      }
      definitionsDiv.append(definitionList);
    }

    // Try grouping the remaining (English) definitions by part-of-speech.
    const enSenses = senses.filter((s) => !s.lang || s.lang === 'en');
    const posGroups =
      options.posDisplay !== 'none' ? groupSenses(enSenses) : [];
    const isForeign = !!options.dictLang && options.dictLang !== 'en';

    // Determine if the grouping makes sense
    //
    // If the group headings make the number of lines used to represent
    // all the senses (ignoring word wrapping) grow by more than 50%, we should
    // skip using groups. This will typically be the case where there are no
    // common parts-of-speech, or at least very few.
    const linesWithGrouping = posGroups.length + enSenses.length;
    const linesWithoutGrouping = enSenses.length;
    const useGroups =
      posGroups.length && linesWithGrouping / linesWithoutGrouping <= 1.5;

    if (useGroups) {
      let startIndex = 1;
      for (const group of posGroups) {
        // Group heading
        const groupHeading = html('p', { class: 'w-group-head' });

        // Verb class tags were added to proverbs for inflection handling but
        // aren't user-facing. Filter them out here.
        const filteredPos = getFilteredTags(group.pos, group.misc);

        for (const pos of filteredPos) {
          const posSpan = html('span', { class: 'w-pos tag' });
          if (options.posDisplay === 'expl') {
            posSpan.lang = getLangTag();
            posSpan.textContent =
              browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos;
          } else {
            posSpan.textContent = pos;
          }
          groupHeading.append(posSpan);
        }

        for (const misc of group.misc) {
          groupHeading.append(
            html(
              'span',
              {
                class: 'w-misc tag',
                lang: getLangTag(),
              },
              browser.i18n.getMessage(
                `misc_label_${misc.replace(/-/g, '_')}`
              ) || misc
            )
          );
        }

        // If there is no group heading, just add a '-' placeholder
        if (!group.pos.length && !group.misc.length) {
          groupHeading.append(html('span', { class: 'w-pos tag' }, '-'));
        }

        definitionsDiv.append(groupHeading);

        // Group items
        const definitionList = html('ol', { start: String(startIndex) });
        for (const sense of group.senses) {
          definitionList.append(
            html(
              'li',
              {
                class: isForeign ? 'foreign' : undefined,
                lang: sense.lang || 'en',
              },
              renderSense(sense, options, entry)
            )
          );
          startIndex++;
        }
        definitionsDiv.append(definitionList);
      }
    } else {
      const definitionList = html('ol', {});
      for (const sense of enSenses) {
        definitionList.append(
          html(
            'li',
            { class: isForeign ? 'foreign' : '', lang: sense.lang || 'en' },
            renderSense(sense, options, entry)
          )
        );
      }
      definitionsDiv.append(definitionList);
    }
  }

  return definitionsDiv;
}

function renderSense(
  sense: Sense,
  options: { posDisplay: PartOfSpeechDisplay },
  entry: WordResult
): DocumentFragment {
  const fragment = document.createDocumentFragment();

  // Verb class tags were added to proverbs for inflection handling but
  // aren't user-facing. Filter them out here.
  const filteredPos = getFilteredTags(sense.pos, sense.misc);

  if (options.posDisplay !== 'none') {
    for (const pos of filteredPos) {
      const posSpan = html('span', { class: 'w-pos tag' });
      switch (options.posDisplay) {
        case 'expl':
          posSpan.lang = getLangTag();
          posSpan.append(
            browser.i18n.getMessage(`pos_label_${pos.replace(/-/g, '_')}`) ||
              pos
          );
          break;

        case 'code':
          posSpan.append(pos);
          break;
      }
      fragment.append(posSpan);
    }
  }

  if (sense.field) {
    for (const field of sense.field) {
      fragment.append(
        html(
          'span',
          { class: 'w-field tag', lang: getLangTag() },
          browser.i18n.getMessage(`field_label_${field}`) || field
        )
      );
    }
  }

  if (sense.misc) {
    for (const misc of sense.misc) {
      fragment.append(
        html(
          'span',
          { class: 'w-misc tag', lang: getLangTag() },
          browser.i18n.getMessage(`misc_label_${misc.replace(/-/g, '_')}`) ||
            misc
        )
      );
    }
  }

  if (sense.dial) {
    for (const dial of sense.dial) {
      fragment.append(
        html(
          'span',
          { class: 'w-dial tag', lang: getLangTag() },
          browser.i18n.getMessage(`dial_label_${dial}`) || dial
        )
      );
    }
  }

  appendGlosses(sense.g, fragment, entry);

  if (sense.inf) {
    fragment.append(
      html(
        'span',
        {
          class: 'w-inf',
          // Mark inf as Japanese because it often contains Japanese text
          lang: 'ja',
        },
        ` (${sense.inf})`
      )
    );
  }

  if (sense.lsrc?.length) {
    fragment.append(renderLangSources(sense.lsrc));
  }

  return fragment;
}

function appendGlosses(
  glosses: Array<Gloss>,
  parent: ParentNode,
  entry: WordResult
) {
  for (const [i, gloss] of glosses.entries()) {
    if (i) {
      parent.append('; ');
    }

    if (gloss.type && gloss.type !== 'tm' && gloss.type !== 'none') {
      const typeStr = browser.i18n.getMessage(`gloss_type_label_${gloss.type}`);
      if (typeStr) {
        parent.append(
          html('span', { class: 'w-type', lang: getLangTag() }, `(${typeStr}) `)
        );
      }
    }

    //TODOP: only check this according to current lang
    const surname_regex = /họ \[(([a-zA-Z:]+[1-5]*\s*)*?([a-zA-Z:]+[1-5]*))\]/;

    let newEnDef: string = process_all_matches(
      gloss.str,
      // "họ [Dong1], hasdfou /họ [Xi1 men2], as;ldfkj hahah fu họ [Yuan2]",
      surname_regex,
      entry,
      process_surname,
      4,
      1
    );

    const double_surname_regex =
      /họ hai chữ \[(([a-zA-Z:]+[1-5]*\s*)*?([a-zA-Z:]+[1-5]*))\]/;

    newEnDef = process_all_matches(
      newEnDef,
      double_surname_regex,
      entry,
      process_surname,
      12,
      1
    );

    const pinyin_in_definition_regex =
      /\[(([a-zA-Z:]+[1-5]*\s*)*?([a-zA-Z:]+[1-5]*))\]/;

    newEnDef = process_all_matches(
      newEnDef,
      pinyin_in_definition_regex,
      entry,
      process_pinyin_wrapper,
      1,
      0
    );

    // console.log('newEnDef', newEnDef)
    parent.append(newEnDef);
    if (gloss.type === 'tm') {
      parent.append('™');
    }
  }
}

function preprocess_pinyin(text: string): string[] {
  return text.replace(/-/g, '').split(/\s+/);
}

function process_surname(match: string, entry: WordResult): string {
  const pinyin_words = preprocess_pinyin(match);
  if (entry.k.length > 1 && entry.k[1].ent.length === pinyin_words.length) {
    return getHanviet(entry.k[1].ent, pinyin_words, true);
  } else {
    // if we can't process this to hanviet, preserve the [ ] because the outer brackets will be pruned by process_all_matches
    return '[' + match + ']';
  }
}

function process_pinyin_wrapper(match: string, entry: WordResult): string {
  return convert_to_toned_pinyin(match);
}

function process_all_matches(
  text: string,
  regex: RegExp,
  entry: WordResult,
  process_callback: (match: string, entry: WordResult) => string,
  beginning_offset: number,
  remove_surrounding_chars: number
): string {
  let newEnDef = text;
  let pinyin_match = newEnDef.match(regex);

  // loop until there is no [pinyin with tone inside square brackets]
  let start_searching_index = 0;
  // console.log('endef', enDef)
  while (pinyin_match) {
    // console.log('start index', start_searching_index)
    // console.log('pinyin match', pinyin_match)
    const processed_match = pinyin_match[1];
    // make the english definition from our data dictionary to have proper pinyin
    // CY: typescript compiler bug: pinyin_match.index is always defined but the type definition says it might be undefined, that's why we need to use !
    const before_part = newEnDef.substring(
      0,
      start_searching_index +
        pinyin_match.index! +
        beginning_offset -
        remove_surrounding_chars
    );
    const converted_part = process_callback(processed_match, entry);
    // console.log('processed_match, converted_part', processed_match, converted_part)
    const after_part = newEnDef.substring(
      start_searching_index +
        pinyin_match.index! +
        beginning_offset +
        remove_surrounding_chars +
        pinyin_match[1].length
    );
    newEnDef = before_part + converted_part + after_part;
    // console.log('before', before_part.slice(-10))
    // console.log('after', after_part)
    start_searching_index = before_part.length + converted_part.length;
    // search again to find out if the remaning definition has any pinyin tone mark
    pinyin_match = after_part.match(regex);
  }
  return newEnDef;
}

function renderLangSources(sources: Array<LangSource>): HTMLElement {
  const sourceLangSpan = html('span', { class: 'w-lsrc', lang: getLangTag() });

  const startsWithWasei = sources[0]?.wasei;
  sourceLangSpan.append(
    browser.i18n.getMessage(
      startsWithWasei ? 'lang_lsrc_wasei_prefix' : 'lang_lsrc_prefix'
    )
  );

  for (const [i, lsrc] of sources.entries()) {
    if (i) {
      sourceLangSpan.append(', ');
    }

    const lang =
      browser.i18n.getMessage(`lang_label_${lsrc.lang || 'en'}`) ||
      lsrc.lang ||
      'English';
    const prefix = lsrc.wasei
      ? browser.i18n.getMessage('lang_lsrc_wasei', [lang])
      : lang;

    sourceLangSpan.append(lsrc.src ? `${prefix}: ` : prefix);

    if (lsrc.src) {
      sourceLangSpan.append(
        html('span', { lang: lsrc.lang || 'en' }, lsrc.src)
      );
    }
  }

  sourceLangSpan.append(browser.i18n.getMessage('lang_lsrc_suffix'));

  return sourceLangSpan;
}
