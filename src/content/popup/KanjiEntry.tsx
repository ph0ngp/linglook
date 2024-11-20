import type { KanjiResult } from '@birchill/jpdict-idb';
import HanziWriter from 'hanzi-writer';
import { useEffect, useRef } from 'preact/hooks';
import browser from 'webextension-polyfill';

import type { ReferenceAbbreviation } from '../../common/refs';
import { classes } from '../../utils/classes';
import { getCSSVariable, standardize_color } from '../../utils/themes';

import { KanjiInfo } from './KanjiInfo';
import { KanjiReferencesTable } from './KanjiReferencesTable';
import { KanjiStrokeAnimation } from './KanjiStrokeAnimation';
import { usePopupOptions } from './options-context';
import { containerHasSelectedText } from './selection';
import type { StartCopyCallback } from './show-popup';

export type Props = {
  entry: KanjiResult;
  index: number;
  kanjiReferences: Array<ReferenceAbbreviation>;
  onStartCopy?: StartCopyCallback;
  selectState: 'unselected' | 'selected' | 'flash';
  showComponents?: boolean;
};

const HANZI_WRITER_SIZE = 120;

export function KanjiEntry(props: Props) {
  const hanziContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hanziContainerRef.current) {
      // status div is used to display the loading error message if cannot load
      const status = document.createElement('div');
      status.textContent = '';
      status.style.display = 'flex';
      status.style.alignItems = 'center';
      status.style.justifyContent = 'center';
      status.style.width = `${HANZI_WRITER_SIZE}px`;
      status.style.height = `${HANZI_WRITER_SIZE}px`;
      hanziContainerRef.current.appendChild(status);

      const svgContainer = document.createElement('div');
      hanziContainerRef.current.appendChild(svgContainer);
      const hanziWriter = HanziWriter.create(svgContainer, props.entry.c, {
        width: HANZI_WRITER_SIZE,
        height: HANZI_WRITER_SIZE,
        padding: HANZI_WRITER_SIZE / 40,
        strokeColor: standardize_color(
          getCSSVariable(hanziContainerRef.current, '--text-color')
        ),
        outlineColor: standardize_color(
          getCSSVariable(hanziContainerRef.current, '--stroke-outline')
        ),
        radicalColor: standardize_color(
          getCSSVariable(hanziContainerRef.current, '--primary-highlight')
        ),
        showCharacter: true,
        showOutline: true,
        delayBetweenStrokes: 200,
        charDataLoader: (char, onLoad, onError) => {
          // onLoad(JSON.parse('{"strokes": ["M 520 133 Q 523 296 525 442 L 525 479 Q 525 654 543 722 Q 556 746 540 761 Q 498 792 465 802 Q 449 805 432 791 Q 425 782 432 770 Q 462 727 462 629 Q 462 394 466 128 C 466 98 519 103 520 133 Z", "M 525 442 Q 573 436 682 459 Q 769 477 776 484 Q 786 493 780 503 Q 771 516 738 523 Q 704 529 670 514 Q 637 502 601 493 Q 564 484 525 479 C 495 475 495 445 525 442 Z", "M 528 82 Q 582 83 633 88 Q 781 100 911 81 Q 938 78 945 88 Q 954 103 940 116 Q 907 147 859 171 Q 843 178 813 169 Q 707 150 520 133 L 466 128 Q 363 121 309 114 Q 239 104 137 106 Q 121 106 120 93 Q 119 80 139 63 Q 184 30 234 41 Q 289 56 416 71 Q 468 78 528 82 Z"], "medians": [[[446, 781], [462, 775], [498, 734], [493, 159], [472, 136]], [[531, 448], [551, 462], [627, 473], [698, 493], [768, 496]], [[134, 92], [171, 76], [212, 72], [458, 103], [841, 132], [932, 99]]], "radStrokes": [2]}'))
          // fetch("https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/上.json")
          fetch(
            browser.runtime.getURL(
              'data/hanzi-writer-data/' + encodeURIComponent(`${char}.json`)
            )
          )
            .then((res) => {
              return res.json();
            })
            .then(onLoad)
            .catch(onError);
        },
        onLoadCharDataSuccess: function (data) {
          status.remove();
          // CY: perhaps we don't need this. But still, to be sure and safe.
          svgContainer.style.display = 'block';
          // console.log(props.entry.c, 'onLoadCharDataSuccess', data);
        },
        onLoadCharDataError: function (reason) {
          status.textContent =
            props.entry.c +
            ': ' +
            browser.i18n.getMessage('char_stroke_animation_not_found') +
            ' 😥';
          // hide the svg with size 200 200 for the status to display vertically centered
          svgContainer.style.display = 'none';
          // console.log(props.entry.c, 'onLoadCharDataError', reason);
          //TODOP: bugsnag here?
        },
      });
      svgContainer.onclick = () => {
        void hanziWriter.animateCharacter();
      };
    }
  }, []);

  return (
    <div
      class={classes(
        // 'tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3 tp-h-[120px]',
        `tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3 tp-h-[${HANZI_WRITER_SIZE}px]`,
        // Set the -selected / -flash class since we use that we scroll into
        // view any selected item during / after copying.
        //
        // Once everything is converted to Preact we hopefully won't need this
        // anymore (since we'll do minimal DOM updates) but if we do, then we
        // should prefer using a data attribute to a CSS class.
        props.selectState === 'selected' && '-selected',
        props.selectState === 'flash' && '-flash'
      )}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div ref={hanziContainerRef} />
      </div>
    </div>
  );

  // const kanjiTable = useRef<HTMLDivElement>(null);

  // return (
  //   <div
  //     class={classes(
  //       'tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3',
  //       // Set the -selected / -flash class since we use that we scroll into
  //       // view any selected item during / after copying.
  //       //
  //       // Once everything is converted to Preact we hopefully won't need this
  //       // anymore (since we'll do minimal DOM updates) but if we do, then we
  //       // should prefer using a data attribute to a CSS class.
  //       props.selectState === 'selected' && '-selected',
  //       props.selectState === 'flash' && '-flash'
  //     )}
  //     ref={kanjiTable}
  //   >
  //     <div class="tp-flex tp-items-start tp-gap-[20px]">
  //       <KanjiCharacter
  //         c={props.entry.c}
  //         onClick={(trigger) => {
  //           if (containerHasSelectedText(kanjiTable.current!)) {
  //             return;
  //           }

  //           props.onStartCopy?.(props.index, trigger);
  //         }}
  //         selectState={props.selectState}
  //         st={props.entry.st}
  //       />
  //       <div class="tp-mt-1.5 tp-grow">
  //         <KanjiInfo {...props.entry} showComponents={props.showComponents} />
  //       </div>
  //     </div>
  //     {!!props.kanjiReferences.length && (
  //       <div>
  //         <KanjiReferencesTable
  //           entry={props.entry}
  //           kanjiReferences={props.kanjiReferences}
  //         />
  //       </div>
  //     )}
  //   </div>
  // );
}

type KanjiCharacterProps = {
  c: string;
  onClick?: (trigger: 'touch' | 'mouse') => void;
  selectState: 'unselected' | 'selected' | 'flash';
  st?: string;
};

function KanjiCharacter(props: KanjiCharacterProps) {
  const { interactive } = usePopupOptions();

  // There's no way to trigger the animation when we're not in "mouse
  // interactive" mode so just show the static character in that case.
  return props.st && interactive ? (
    <KanjiStrokeAnimation
      onClick={props.onClick}
      selectState={props.selectState}
      st={props.st}
    />
  ) : (
    <StaticKanjiCharacter
      c={props.c}
      onClick={props.onClick}
      selectState={props.selectState}
    />
  );
}

function StaticKanjiCharacter(props: KanjiCharacterProps) {
  const lastPointerType = useRef<string>('touch');
  const { interactive } = usePopupOptions();

  return (
    <div
      class={classes(
        'tp-text-[--primary-highlight] tp-text-big-kanji tp-text-center tp-pt-2 tp-rounded-md',
        '[text-shadow:var(--shadow-color)_1px_1px_4px]',
        ...(interactive
          ? [
              'hh:hover:tp-text-[--selected-highlight]',
              'hh:hover:tp-bg-[--hover-bg]',
              'hh:hover:tp-cursor-pointer',
              // Fade _out_ the color change
              'hh:tp-transition-colors hh:interactive:tp-duration-100',
              'hh:tp-ease-out',
              'hh:hover:tp-transition-none',
            ]
          : []),
        // Ensure any selection colors are applied before fading in the
        // overlay
        props.selectState === 'selected' &&
          'no-overlay:tp-text-[--selected-highlight] no-overlay:tp-bg-[--selected-bg]',
        // Run the flash animation, but not until the overlay has
        // disappeared.
        props.selectState === 'flash' && 'no-overlay:tp-animate-flash'
      )}
      lang="ja"
      onPointerUp={(evt) => {
        lastPointerType.current = evt.pointerType;
      }}
      onClick={() => {
        const trigger = lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
        props.onClick?.(trigger);
      }}
    >
      {props.c}
    </div>
  );
}
