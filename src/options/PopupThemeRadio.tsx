import type { ComponentProps } from 'preact';
import { forwardRef } from 'preact/compat';
import { useId } from 'preact/hooks';

import type {
  AccentDisplay,
  FontFace,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';
import { classes } from '../utils/classes';
import { useThemeClass } from '../utils/use-theme-class';

type Props = {
  accentDisplay: AccentDisplay;
  fontFace: FontFace;
  fontSize: FontSize;
  onChangeTheme: (theme: string) => void;
  posDisplay: PartOfSpeechDisplay;
  showBunproDecks: boolean;
  showDefinitions: boolean;
  hanvietDisplay: boolean;
  pinyinDisplay: boolean;
  showWaniKaniLevel: boolean;
  theme: string;
  dictLang: DbLanguageId;
};

export function PopupThemeRadio(props: Props) {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2">
      {['default', 'light', 'blue', 'lightblue', 'black', 'yellow'].map(
        (theme) => (
          <PopupRadio
            key={theme}
            name="popupStyle"
            value={theme}
            checked={props.theme === theme}
            onChange={() => props.onChangeTheme(theme)}
          >
            {theme === 'default' ? (
              <div class="stacked">
                <PopupPreview {...props} theme="light" />
                <div class="cover-tl flex">
                  <PopupPreview {...props} theme="black" />
                </div>
              </div>
            ) : (
              <PopupPreview {...props} theme={theme} />
            )}
          </PopupRadio>
        )
      )}
    </div>
  );
}

type InputProps = Omit<
  ComponentProps<'input'>,
  'id' | 'type' | 'class' | 'className'
>;

const PopupRadio = forwardRef<HTMLInputElement, InputProps>(
  (props: InputProps, ref) => {
    const id = useId();

    return (
      <div>
        <input
          ref={ref}
          id={id}
          type="radio"
          class="peer sr-only"
          {...{ ...props, children: undefined }}
        />
        <label
          class={classes(
            'peer-focus-visible:outline-auto group block cursor-pointer rounded-md border border-solid p-2',
            'border-transparent text-center transition duration-300',
            props.checked
              ? 'border-zinc-300 bg-zinc-200 dark:border-zinc-500 dark:bg-zinc-600'
              : 'opacity-50 hover:opacity-100 active:opacity-100'
          )}
          for={id}
        >
          {props.children}
        </label>
      </div>
    );
  }
);

type PopupPreviewProps = {
  accentDisplay: AccentDisplay;
  fontFace: FontFace;
  fontSize: FontSize;
  posDisplay: PartOfSpeechDisplay;
  showBunproDecks: boolean;
  showDefinitions: boolean;
  hanvietDisplay: boolean;
  showWaniKaniLevel: boolean;
  pinyinDisplay: boolean;
  theme: string;
  dictLang: DbLanguageId;
};

const renderHanzi = (accentDisplay: AccentDisplay) => {
  switch (accentDisplay) {
    case 'downstep':
      return (
        <>
          <span class="dimmed">電腦</span>
          <span class="separator" style="display: inline-block; width: 0.5em;">
            {' '}
          </span>
          <span>电脑</span>
        </>
      );
    case 'simptrad':
      return (
        <>
          <span>电脑</span>
          <span class="separator" style="display: inline-block; width: 0.5em;">
            {' '}
          </span>
          <span class="dimmed">電腦</span>
        </>
      );
    case 'binary-hi-contrast':
      return <span>电脑</span>;
    case 'none':
      return <span>電腦</span>;
  }
};

const renderDefinition = (dictLang: DbLanguageId) => {
  let dictDef = '';
  switch (dictLang) {
    case 'vi':
      dictDef = 'máy tính; LT:臺|台[tái]';
      break;
    case 'en':
    default:
      dictDef = 'computer; CL:臺|台[tái]';
      break;
  }
  return (
    <span class="w-def" lang={dictLang}>
      {'\u200b' + dictDef}
    </span>
  );
};

function PopupPreview(props: PopupPreviewProps) {
  const { t } = useLocale();
  const themeClass = useThemeClass(props.theme);

  return (
    <div
      class={classes(
        themeClass,
        'window inline-block min-w-[180px] py-2 text-left',
        props.fontFace === 'bundled' && 'bundled-fonts',
        props.fontSize !== 'normal' && `font-${props.fontSize}`
      )}
    >
      <div class="entry">
        <div>
          <span class="w-kanji">
            {renderHanzi(props.accentDisplay)}
            {/* {props.hanvietDisplay && <Star />} */}
            {(props.showWaniKaniLevel || props.showBunproDecks) && (
              <span
                class="separator"
                style="display: inline-block; width: 0.5em;"
              >
                {' '}
              </span>
            )}
            {props.showWaniKaniLevel && (
              <span class="wk-level">
                <span>1</span>
              </span>
            )}
            {props.showBunproDecks && (
              <span class="bp-tag -vocab">
                <span>{t('popup_bp_vocab_tag', ['1'])}</span>
              </span>
            )}
          </span>
          {/* <span class="w-kana">
            {renderKana(props.accentDisplay)}
            {props.hanvietDisplay && <Star />}
          </span> */}
          {props.pinyinDisplay && (
            <span class="w-romaji" lang="zh">
              diàn nǎo
            </span>
          )}
          <span class="separator" style="display: inline-block; width: 0.5em;">
            {' '}
          </span>
          {props.hanvietDisplay && (
            <span class="w-hanviet" lang="vi">
              điện não
            </span>
          )}
        </div>
        {props.showDefinitions && renderDefinition(props.dictLang)}
      </div>
    </div>
  );
}

function Star() {
  return (
    <svg class="svgicon opacity-50" viewBox="0 0 98.6 93.2">
      <path d="M98 34a4 4 0 00-3-1l-30-4L53 2a4 4 0 00-7 0L33 29 4 33a4 4 0 00-3 6l22 20-6 29a4 4 0 004 5 4 4 0 002 0l26-15 26 15a4 4 0 002 0 4 4 0 004-4 4 4 0 000-1l-6-29 22-20a4 4 0 001-5z" />
    </svg>
  );
}

function renderKana(accentDisplay: AccentDisplay) {
  switch (accentDisplay) {
    case 'downstep':
      return 'りꜜかい';

    case 'simptrad':
    case 'binary-hi-contrast':
      return (
        <span
          class={classes(
            'w-binary',
            accentDisplay === 'binary-hi-contrast' ? '-hi-contrast' : ''
          )}
        >
          <span class="h-l">り</span>
          <span class="l">かい</span>
        </span>
      );

    case 'none':
      return 'りかい';
  }
}

function renderPos(posDisplay: PartOfSpeechDisplay) {
  const { t } = useLocale();

  switch (posDisplay) {
    case 'expl':
      return (
        <span
          class="w-pos tag"
          lang={t('lang_tag')}
        >{`${t('pos_label_n')},  ${t('pos_label_vs')}`}</span>
      );

    case 'code':
      return <span class="w-pos tag">n, vs</span>;

    case 'none':
      return null;
  }
}
