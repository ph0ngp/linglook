import type { KanjiResult } from '@birchill/jpdict-idb';
import HanziWriter from 'hanzi-writer';
import { useEffect, useRef, useState } from 'preact/hooks';
import browser from 'webextension-polyfill';

import { useLocale } from '../../common/i18n';
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
  const kanjiTable = useRef<HTMLDivElement>(null);

  return (
    <div
      class={classes(
        // 'tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3 tp-h-[120px]',
        'tp-flex tp-flex-col tp-gap-3.5 tp-px-5 tp-py-3',
        // Set the -selected / -flash class since we use that we scroll into
        // view any selected item during / after copying.
        //
        // Once everything is converted to Preact we hopefully won't need this
        // anymore (since we'll do minimal DOM updates) but if we do, then we
        // should prefer using a data attribute to a CSS class.
        props.selectState === 'selected' && '-selected',
        props.selectState === 'flash' && '-flash'
      )}
      ref={kanjiTable}
    >
      <div class="tp-flex tp-items-start tp-gap-[20px]">
        {/* Left side - Hanzi writer */}
        <KanjiCharacter
          c={props.entry.c}
          onClick={(trigger) => {
            if (containerHasSelectedText(kanjiTable.current!)) {
              return;
            }

            props.onStartCopy?.(props.index, trigger);
          }}
          selectState={props.selectState}
          st={props.entry.st}
        />
        <div class="tp-mt-1.5 tp-grow">
          <KanjiInfo {...props.entry} showComponents={props.showComponents} />
        </div>
      </div>
      {/* <div>
        <KanjiReferencesTable
          entry={props.entry}
          kanjiReferences={props.kanjiReferences}
        />
      </div> */}
    </div>
  );
}

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
//   <div class="tp-flex tp-items-start tp-gap-[20px]">
//     <KanjiCharacter
//       c={props.entry.c}
//       onClick={(trigger) => {
//         if (containerHasSelectedText(kanjiTable.current!)) {
//           return;
//         }

//         props.onStartCopy?.(props.index, trigger);
//       }}
//       selectState={props.selectState}
//       st={props.entry.st}
//     />
//     <div class="tp-mt-1.5 tp-grow">
//       <KanjiInfo {...props.entry} showComponents={props.showComponents} />
//     </div>
//   </div>
//   {!!props.kanjiReferences.length && (
//     <div>
//       <KanjiReferencesTable
//         entry={props.entry}
//         kanjiReferences={props.kanjiReferences}
//       />
//     </div>
//   )}
// </div>
// );
// }

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

  const { t } = useLocale();
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const hanziWriterRef = useRef<HanziWriter>(null);
  const [isCharacterLoaded, setIsCharacterLoaded] = useState(true);
  // default true to show the play button by default initially (for expandable to calculate height correctly) If character is not loaded, we will hide it later

  useEffect(() => {
    if (svgContainerRef.current) {
      const hanziWriter = HanziWriter.create(svgContainerRef.current, props.c, {
        width: HANZI_WRITER_SIZE,
        height: HANZI_WRITER_SIZE,
        padding: HANZI_WRITER_SIZE / 40,
        strokeColor: standardize_color(
          getCSSVariable(svgContainerRef.current, '--text-color')
        ),
        outlineColor: standardize_color(
          getCSSVariable(svgContainerRef.current, '--stroke-outline')
        ),
        radicalColor: standardize_color(
          getCSSVariable(svgContainerRef.current, '--primary-highlight')
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
            .then((res) => res.json())
            .then(onLoad)
            .catch(onError);
        },
        onLoadCharDataSuccess: function (data) {
          setIsCharacterLoaded(true);
          // console.log(props.entry.c, 'onLoadCharDataSuccess', data);
        },
        onLoadCharDataError: function (reason) {
          setIsCharacterLoaded(false);
          svgContainerRef.current!.textContent = `${props.c}: ${browser.i18n.getMessage('char_stroke_animation_not_found')} 😥`;
          // console.log(props.entry.c, 'onLoadCharDataError', reason);
        },
      });
      // Store hanziWriter instance in ref
      hanziWriterRef.current = hanziWriter;
    }
  }, []);
  const isPlaying = false;

  return (
    <div class="tp-flex tp-flex-col tp-items-center tp-gap-3">
      <div
        class={classes(
          // 'tp-text-[--primary-highlight] tp-text-big-kanji tp-text-center tp-pt-2 tp-rounded-md',
          'tp-text-center tp-rounded-md',
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
        lang="zh"
        onPointerUp={(evt) => {
          lastPointerType.current = evt.pointerType;
        }}
        onClick={() => {
          const trigger =
            lastPointerType.current === 'mouse' ? 'mouse' : 'touch';
          props.onClick?.(trigger);
        }}
      >
        <div class="tp-flex tp-flex-col tp-items-center tp-gap-3">
          <div>
            <div
              ref={svgContainerRef}
              class="tp-flex tp-items-center tp-justify-center"
              style={{
                width: `${HANZI_WRITER_SIZE}px`,
                height: `${HANZI_WRITER_SIZE}px`,
              }}
            />
          </div>
        </div>
      </div>
      {/* Only render the play button controls if character is loaded */}
      {isCharacterLoaded && (
        <div
          onClick={() => {
            if (hanziWriterRef.current && isCharacterLoaded) {
              void hanziWriterRef.current.animateCharacter();
            }
          }}
          // class="tp-flex tp-justify-center tp-items-center"
          style={{
            width: `${HANZI_WRITER_SIZE}px`,
          }}
        >
          <svg
            // class="tp-w-big-kanji"
            // ref={timelineSvg}
            viewBox="0 0 100 70"
            style={{
              webkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Play/stop button */}
            {/* The content is only 25 user units high but we make it 50 so that we
             * can expand the hit regions vertically since iOS Safari doesn't do
             * very good hit detection of small targets. */}
            <g
              pointer-events="all"
              class="tp-cursor-pointer tp-opacity-30 hh:hover:tp-opacity-100 tp-fill-[--text-color] hh:hover:tp-fill-[--primary-highlight] tp-transition-transform tp-duration-500"
              style={{
                transform: isPlaying ? 'none' : 'translate(40px, 20px)',
              }}
            >
              <title>
                {t(
                  isPlaying
                    ? 'content_stroke_animation_stop'
                    : 'content_stroke_animation_play'
                )}
              </title>
              <rect
                x={isPlaying ? 0 : -40}
                y={isPlaying ? 0 : -20}
                width={isPlaying ? 25 : 100}
                height={70}
                fill="none"
              />
              <path
                d={
                  isPlaying
                    ? 'M20 12.5v6a4 4 0 01-4 4l-12 0c0 0 0 0 0 0a4 4 90 01-4-4v-12a4 4 90 014-4c0 0 0 0 0 0l12 0a4 4 0 014 4z'
                    : 'M20 12.5v0a2 2 0 01-1 1.7l-16.1 8.1c-.3.1-.6.2-.9.2a2 2 90 01-2-2v-16a2 2 90 012-2c.3 0 .7.1 1 .2l16 8.1a2 2 0 011 1.7z'
                }
                class="tp-transition-[d] tp-duration-500"
                transform="scale(0.8)"
                transform-origin="10px 12.5px"
              />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
