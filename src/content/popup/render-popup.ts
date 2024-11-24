/// <reference path="../../common/css.d.ts" />
import { WordResult } from '@birchill/jpdict-idb';

import { KanjiSearchResult } from '../../background/search-result';
import type { FontFace, FontSize } from '../../common/content-config-params';
import { html } from '../../utils/builder';
import { Point } from '../../utils/geometry';
import { getThemeClass } from '../../utils/themes';

import { getOrCreateEmptyContainer } from '../content-container';
import { DisplayMode } from '../popup-state';
import { LookupPuckId } from '../puck';
import { QueryResult } from '../query';

import { renderArrow } from './arrow';
import { renderCloseButton } from './close';
import { renderCopyOverlay } from './copy-overlay';
import { CopyState } from './copy-state';
import { updateExpandable } from './expandable';
import { addFontStyles, removeFontStyles } from './font-styles';
import { renderKanjiEntries } from './kanji';
import { renderMetadata } from './metadata';
import { renderNamesEntries } from './names';
import { getPopupContainer } from './popup-container';
import popupStyles from './popup.css?inline';
import { ShowPopupOptions } from './show-popup';
import { renderCopyDetails, renderUpdatingStatus } from './status';
import { onHorizontalSwipe } from './swipe';
import { renderTabBar } from './tabs';
import { renderWordEntries } from './words';

export function renderPopup(
  result: QueryResult | undefined,
  options: ShowPopupOptions
): HTMLElement | null {
  // We add most styles to the shadow DOM but it turns out that browsers don't
  // load @font-face fonts from the shadow DOM [1], so we need to add @font-face
  // definitions to the main document.
  //
  // [1] e.g see https://issues.chromium.org/issues/41085401
  if (!options.fontFace || options.fontFace === 'bundled') {
    addFontStyles();
  } else {
    removeFontStyles();
  }

  const container = options.container || getDefaultContainer();
  const windowElem = resetContainer({
    host: container,
    displayMode: options.displayMode,
    fontFace: options.fontFace || 'bundled',
    fontSize: options.fontSize || 'normal',
    popupStyle: options.popupStyle,
  });
  const contentContainer = html('div', { class: 'content' });

  const hasResult = result && (result.words || result.kanji || result.names);
  let showTabs =
    hasResult &&
    result.resultType !== 'db-unavailable' &&
    !result.title &&
    options.tabDisplay !== 'none';

  // TODOP: change this to the return value of background dict, not created here. (because it will be recreated everytime a new tab is rendered)
  if (hasResult && result.words && result.words.data?.[0]) {
    const allCharsToShowStrokes: Array<string> = [];
    const wordResult: WordResult = result.words.data[0];
    // we only consider the longest (first) match.
    // TODOP: in the case of match one type but settings only show the other type, can miss characters. For example, 发 simp is the real matched char, but if the settings shows onlytrad, then we will have 2 different trad characters, 發 and 髮 but taking [0] will only show the first char.
    let chosenWord = undefined;
    switch (options.hanziDisplay) {
      case 'simptrad':
      case 'tradsimp':
        for (const word of wordResult.k) {
          if (word.match) {
            chosenWord = word;
            break;
          }
        }
        break;
      case 'onlysimp':
        // always choose simplified
        chosenWord = wordResult.k.length === 2 ? wordResult.k[0] : undefined;
        break;
      case 'onlytrad':
        // always choose traditional
        chosenWord = wordResult.k.length === 2 ? wordResult.k[1] : undefined;
        break;
    }
    if (chosenWord) {
      // if .src is defined, it's not empty string. But check just in case
      const allCharsData = wordResult.k[0].bg?.src
        ? wordResult.k[0].bg.src.split('\n')
        : [];
      const allCharsDataMap = new Map<string, Array<string>>();
      for (const charData of allCharsData) {
        const allComponents = charData.split('_');
        allCharsDataMap.set(allComponents[0], allComponents.slice(1));
      }
      for (const char of chosenWord.ent) {
        allCharsToShowStrokes.push(char);
      }
      // there is only one match (simplified or traditional)
      showTabs = true;
      result.kanji = {
        type: 'kanji',
        data: allCharsToShowStrokes.map((char) => ({
          c: char,
          m: allCharsDataMap.get(char) ?? [], // if key found (meaning this char has associated data in char.txt), then must be an array of 6 elements
        })),
        matchLen: result.words.matchLen,
      } as KanjiSearchResult;
    }
  }

  if (showTabs) {
    const enabledTabs = {
      words: !!result?.words || !!options.meta,
      kanji: !!result?.kanji,
      names: !!result?.names,
    };

    windowElem.append(
      renderTabBar({
        closeShortcuts: options.closeShortcuts,
        displayMode: options.displayMode,
        enabledTabs,
        onClosePopup: options.onClosePopup,
        onShowSettings: options.onShowSettings,
        onSwitchDictionary: options.onSwitchDictionary,
        onTogglePin: options.onTogglePin,
        pinShortcuts: options.pinShortcuts,
        selectedTab: options.dictToShow,
      })
    );

    windowElem.dataset.tabSide = options.tabDisplay || 'top';

    // CY: disable swipe horizontally because it's an awkward gesture
    // onHorizontalSwipe(contentContainer, (direction) => {
    //   options.onSwitchDictionary?.(direction === 'left' ? 'prev' : 'next');
    // });
  }

  const resultToShow = result?.[options.dictToShow];

  switch (resultToShow?.type) {
    case 'kanji':
      contentContainer.append(
        html(
          'div',
          { class: 'expandable' },
          renderKanjiEntries({ entries: resultToShow.data, options })
        )
      );
      break;

    case 'names':
      contentContainer.append(
        renderNamesEntries({
          entries: resultToShow.data,
          matchLen: resultToShow.matchLen,
          more: resultToShow.more,
          options: {
            ...options,
            // Hide the meta if we have already shown it on the words tab
            meta: result?.words ? undefined : options.meta,
          },
        })
      );
      break;

    case 'words':
      {
        contentContainer.append(
          html(
            'div',
            { class: 'expandable' },
            renderWordEntries({
              entries: resultToShow.data,
              matchLen: resultToShow.matchLen,
              more: resultToShow.more,
              namePreview: result!.namePreview,
              options,
              title: result!.title,
            })
          )
        );
      }
      break;

    default:
      {
        if (!options.meta) {
          return null;
        }

        const metadata = renderMetadata({
          fxData: options.fxData,
          preferredUnits: options.preferredUnits,
          isCombinedResult: false,
          matchLen: 0,
          meta: options.meta,
        });
        if (!metadata) {
          return null;
        }
        metadata.classList.add('-metaonly');

        contentContainer.append(
          html('div', { class: 'wordlist entry-data' }, metadata)
        );
      }
      break;
  }

  // Render the copy overlay if needed
  if (showOverlay(options.copyState)) {
    contentContainer.append(
      html(
        'div',
        { class: 'grid-stack' },
        // Dictionary content
        html('div', {}, ...contentContainer.children),
        renderCopyOverlay({
          copyState: options.copyState,
          includeAllSenses: options.copy?.includeAllSenses !== false,
          includeLessCommonHeadwords:
            options.copy?.includeLessCommonHeadwords !== false,
          includePartOfSpeech: options.copy?.includePartOfSpeech !== false,
          kanjiReferences: options.kanjiReferences,
          onCancelCopy: options.onCancelCopy,
          onCopy: options.onCopy,
          result: resultToShow ? result : undefined,
          series: options.dictToShow,
          showKanjiComponents: options.showKanjiComponents,
          hanziDisplay: options.hanziDisplay,
        })
      )
    );

    // Set the overlay styles for the window, but wait a moment so we can
    // transition the styles in.
    requestAnimationFrame(() => {
      // TODO: Drop the class and just keep the data attribute once we've
      // converted everything to Tailwind
      windowElem.classList.add('-has-overlay');
      windowElem.dataset.hasOverlay = 'true';
    });
  }

  // Set copy styles
  switch (options.copyState.kind) {
    case 'active':
      windowElem.classList.add('-copy-active');
      break;

    case 'error':
      windowElem.classList.add('-copy-error');
      break;

    case 'finished':
      windowElem.classList.add('-copy-finished');
      break;
  }

  // Generate status bar contents
  const copyDetails = renderCopyDetails({
    copyNextKey: options.copyNextKey,
    copyState: options.copyState,
    series: resultToShow?.type || 'words',
  });

  let statusBar: HTMLElement | null = null;
  if (copyDetails) {
    statusBar = copyDetails;
  } else if (hasResult && result?.resultType === 'db-updating') {
    statusBar = renderUpdatingStatus();
  }

  let contentWrapper = contentContainer;
  if (statusBar) {
    contentWrapper = html(
      'div',
      { class: 'status-bar-wrapper' },
      contentContainer,
      statusBar
    );
  }

  if (!showTabs && options.onClosePopup) {
    windowElem.append(
      html(
        'div',
        { class: 'close-button-wrapper' },
        contentWrapper,
        renderCloseButton(options.onClosePopup, options.closeShortcuts || [])
      )
    );
  } else {
    windowElem.append(contentWrapper);
  }

  // Collapse expandable containers
  for (const expandable of contentContainer.querySelectorAll<HTMLElement>(
    '.expandable'
  )) {
    updateExpandable(expandable, {
      ...options,
      showKeyboardShortcut: options.displayMode === 'static',
    });
  }

  // Scroll any selected items into view.
  //
  // We need to wait until after the popup has been positioned, however, as
  // otherwise we won't know if it's in view or not.
  requestAnimationFrame(() => {
    const selectedElem =
      contentContainer.querySelector('.expandable .-selected') ||
      contentContainer.querySelector('.-flash');
    selectedElem?.scrollIntoView({ block: 'nearest' });
  });

  return container;
}

function getDefaultContainer(): HTMLElement {
  const defaultContainer = getOrCreateEmptyContainer({
    id: 'linglook-window',
    styles: popupStyles.toString(),
    // Make sure the popup container appears _before_ the puck container so that
    // we can assign them the same z-index and have the puck appear on top.
    before: LookupPuckId,
    legacyIds: [],
  });

  // Make sure our popup doesn't get inverted by Wikipedia's (experimental) dark
  // mode.
  if (document.location.hostname.endsWith('wikipedia.org')) {
    defaultContainer.classList.add('mw-no-invert');
    defaultContainer.style.filter = 'inherit';
  }

  return defaultContainer;
}

function resetContainer({
  host,
  displayMode,
  fontFace,
  fontSize,
  popupStyle,
}: {
  host: HTMLElement;
  displayMode: DisplayMode;
  fontFace: FontFace;
  fontSize: FontSize;
  popupStyle: string;
}): HTMLElement {
  const container = html('div', { class: 'container' });
  const windowDiv = html('div', {
    class: 'window',
    'data-type': 'window',
  });
  container.append(windowDiv);

  // Set initial and interactive status
  container.classList.toggle('ghost', displayMode === 'ghost');
  container.classList.toggle('interactive', displayMode !== 'static');
  container.classList.toggle('pinned', displayMode === 'pinned');

  // Set theme
  windowDiv.classList.add(getThemeClass(popupStyle));

  // Font face
  if (fontFace === 'bundled') {
    windowDiv.classList.add('bundled-fonts');
  }

  // Font size
  if (fontSize !== 'normal') {
    windowDiv.classList.add(`font-${fontSize}`);
  }

  if (host.shadowRoot) {
    host.shadowRoot.append(container);
  } else {
    host.append(container);
  }

  // Reset the container position and size so that we can consistently measure
  // the size of the popup.
  host.style.removeProperty('--left');
  host.style.removeProperty('--top');
  host.style.removeProperty('--max-width');
  host.style.removeProperty('--max-height');

  return windowDiv;
}

function showOverlay(copyState: CopyState): boolean {
  return (
    (copyState.kind === 'active' || copyState.kind === 'error') &&
    (copyState.mode === 'touch' || copyState.mode === 'mouse')
  );
}

export function renderPopupArrow(options: {
  direction: 'vertical' | 'horizontal';
  popupPos: Point;
  popupSize: { width: number; height: number };
  side: 'before' | 'after';
  target: Point;
  theme: string;
}) {
  const popupContainer = getPopupContainer();
  if (!popupContainer) {
    return;
  }

  // Check for cases where the popup overlaps the target element
  const { popupPos, popupSize, target } = options;
  if (options.direction === 'vertical') {
    if (options.side === 'before' && popupPos.y + popupSize.height > target.y) {
      return;
    } else if (options.side === 'after' && popupPos.y < target.y) {
      return;
    }
  } else {
    if (options.side === 'before' && popupPos.x + popupSize.width > target.x) {
      return;
    } else if (options.side === 'after' && popupPos.x < target.x) {
      return;
    }
  }

  // renderArrow({ ...options, popupContainer, target });
}
