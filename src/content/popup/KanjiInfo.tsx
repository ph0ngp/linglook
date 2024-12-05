import type { KanjiResult } from '@birchill/jpdict-idb';

import { useLocale } from '../../common/i18n';

import { FrequencyIndicator } from './FrequencyIndicator';
import { GradeIndicator } from './GradeIndicator';
import { KanjiComponents } from './KanjiComponents';
import { KanjiMeta } from './KanjiMeta';
import { KanjiReadings } from './KanjiReadings';
import { StrokeCount } from './StrokeCount';

export type Props = Pick<
  KanjiResult,
  'r' | 'misc' | 'm' | 'm_lang' | 'rad' | 'comp'
> & {
  showComponents?: boolean;
};

export function KanjiInfo(props: Props) {
  const { t, langTag } = useLocale();

  return (
    <div class="tp-flex tp-flex-col tp-gap-3">
      {/* {props.r && <KanjiReadings r={props.r} />}
      {!!props.misc?.meta?.length && (
        <div class="-tp-mt-1.5">
          <KanjiMeta tags={props.misc.meta} />
        </div>
      )}
      {props.m?.[0] && (
        <div class="tp-text-base tp-leading-snug" lang={props.m_lang}>
          {props.m[0]}
        </div>
      )}
      {props.m?.[1] && (
        <div class="tp-text-base tp-leading-snug" lang={props.m_lang}>
          {props.m[1]}
        </div>
      )} */}

      <div class="tp-grid tp-grid-cols-[auto_1fr] tp-gap-3">
        {!!props.r?.py?.length && (
          <>
            <div
              lang={t('lang_tag')}
              class="tp-text-sm tp-font-bold tp-text-[--text-color] tp-tracking-wide tp-uppercase tp-opacity-75"
            >
              {t('char_pinyin')}
            </div>
            <div lang="zh" class="tp-text-base tp-leading-snug">
              {props.r.py.join(', ')}
            </div>
          </>
        )}
        {!!props.r?.on?.length && (
          <>
            <div
              lang={t('lang_tag')}
              class="tp-text-sm tp-font-bold tp-text-[--text-color] tp-tracking-wide tp-uppercase tp-opacity-75"
            >
              {t('char_hanviet')}
            </div>
            <div lang="vi" class="tp-text-base tp-leading-snug">
              {props.r.on.join(', ')}
            </div>
          </>
        )}
        {props.m?.[0] && (
          <>
            <div
              lang={t('lang_tag')}
              class="tp-text-sm tp-font-bold tp-text-[--text-color] tp-tracking-wide tp-uppercase tp-opacity-75"
            >
              {t('char_definition')}
            </div>
            <div lang={props.m_lang} class="tp-text-base tp-leading-snug">
              {props.m[0]}
            </div>
          </>
        )}
        {props.m?.[2] && (
          <>
            <div
              lang={t('lang_tag')}
              class="tp-text-sm tp-font-bold tp-text-[--text-color] tp-tracking-wide tp-uppercase tp-opacity-75"
            >
              {t('char_radical')}
            </div>
            <div lang={props.m_lang} class="tp-text-base tp-leading-snug">
              {props.m[2]}
            </div>
          </>
        )}
      </div>

      {props.m?.[1] && (
        <div class="tp-flex tp-flex-col tp-gap-1">
          <div
            lang={t('lang_tag')}
            class="tp-text-sm tp-font-bold tp-text-[--text-color] tp-tracking-wide tp-uppercase tp-opacity-75"
          >
            {t('char_hint')}
          </div>
          <div lang={props.m_lang} class="tp-text-base tp-leading-snug">
            {props.m[1]}
          </div>
        </div>
      )}

      {(!!props.misc?.sc || !!props.misc?.freq) && (
        <div class="tp-flex tp-items-base tp-gap-3.5 *:tp-grow" lang={langTag}>
          {!!props.misc?.sc && <StrokeCount sc={props.misc.sc} />}
          {!!props.misc?.freq && (
            <FrequencyIndicator frequency={props.misc.freq} />
          )}
          {/* {props.misc?.gr && <GradeIndicator gr={props.misc.gr} />} */}
        </div>
      )}
      {/* {props.showComponents !== false && props.comp && (
        <KanjiComponents rad={props.rad} comp={props.comp} />
      )} */}
    </div>
  );
}
