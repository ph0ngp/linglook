import type {
  AutoExpandableEntry,
  FontFace,
  FontSize,
  HanziDisplay,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';

import { CheckboxRow } from './CheckboxRow';
import { NewBadge } from './NewBadge';
import { PopupThemeRadio } from './PopupThemeRadio';

type Props = {
  hanziDisplay: HanziDisplay;
  autoExpand: Array<AutoExpandableEntry>;
  fontFace: FontFace;
  fontSize: FontSize;
  onChangeHanziDisplay: (value: HanziDisplay) => void;
  onChangeAutoExpand: (entry: AutoExpandableEntry, checked: boolean) => void;
  onChangeFontFace: (value: FontFace) => void;
  onChangeFontSize: (value: FontSize) => void;
  onChangePosDisplay: (value: PartOfSpeechDisplay) => void;
  onChangeShowTocflLevel: (value: boolean) => void;
  onChangeShowDefinitions: (value: boolean) => void;
  onChangeHanvietDisplay: (value: boolean) => void;
  onChangePinyinDisplay: (value: boolean) => void;
  onChangeShowHskLevel: (value: boolean) => void;
  onChangeTheme: (theme: string) => void;
  posDisplay: PartOfSpeechDisplay;
  showTocflLevel: boolean;
  showDefinitions: boolean;
  hanvietDisplay: boolean;
  pinyinDisplay: boolean;
  showHskLevel: boolean;
  theme: string;
  dictLang: DbLanguageId;
  onChangeDictLang: (value: DbLanguageId) => void;
};

export function PopupStyleForm(props: Props) {
  const { t } = useLocale();

  return (
    <>
      <div class="mx-auto w-fit pb-6">
        <PopupThemeRadio {...props} />
      </div>
      <div class="flex flex-col gap-3 pb-6">
        <CheckboxRow>
          <input
            id="showHskLevel"
            name="showHskLevel"
            type="checkbox"
            checked={props.showHskLevel}
            onChange={(e) =>
              props.onChangeShowHskLevel(e.currentTarget.checked)
            }
          />
          <label for="showHskLevel">{t('options_show_hsk_levels')}</label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="showTocflLevel"
            name="showTocflLevel"
            type="checkbox"
            checked={props.showTocflLevel}
            onChange={(e) =>
              props.onChangeShowTocflLevel(e.currentTarget.checked)
            }
          />
          <label for="showTocflLevel">{t('options_show_tocfl_levels')}</label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="hanvietDisplay"
            name="hanvietDisplay"
            type="checkbox"
            checked={props.hanvietDisplay}
            onChange={(e) =>
              props.onChangeHanvietDisplay(e.currentTarget.checked)
            }
          />
          <label for="hanvietDisplay">{t('options_show_hanviet')}</label>
        </CheckboxRow>
        {/* <CheckboxRow>
          <input
            id="pinyinDisplay"
            name="pinyinDisplay"
            type="checkbox"
            checked={props.pinyinDisplay}
            onChange={(e) => props.onChangePinyinDisplay(e.currentTarget.checked)}
          />
          <label for="pinyinDisplay">{t('options_pinyin_display')}</label>
        </CheckboxRow>
        <CheckboxRow>
          <input
            id="showDefinitions"
            name="showDefinitions"
            type="checkbox"
            checked={props.showDefinitions}
            onChange={(e) =>
              props.onChangeShowDefinitions(e.currentTarget.checked)
            }
          />
          <label for="showDefinitions">{t('options_show_definitions')}</label>
        </CheckboxRow>*/}
      </div>
      <div class="grid w-fit grid-cols-[repeat(2,auto)] items-baseline gap-4">
        <label for="hanziDisplay">{t('options_hanzi_display_label')}</label>
        <select
          id="hanziDisplay"
          name="hanziDisplay"
          onChange={(evt) => {
            props.onChangeHanziDisplay(evt.currentTarget.value as HanziDisplay);
          }}
        >
          <option value="tradsimp" selected={props.hanziDisplay === 'tradsimp'}>
            {t('options_hanzi_display_tradsimp')}
          </option>
          <option value="simptrad" selected={props.hanziDisplay === 'simptrad'}>
            {t('options_hanzi_display_simptrad')}
          </option>
          <option value="onlysimp" selected={props.hanziDisplay === 'onlysimp'}>
            {t('options_hanzi_display_onlysimp')}
          </option>
          <option value="onlytrad" selected={props.hanziDisplay === 'onlytrad'}>
            {t('options_hanzi_display_onlytrad')}
          </option>
        </select>
        {/* <label for="posDisplay">{t('options_pos_display_label')}</label>
        <select
          id="posDisplay"
          name="posDisplay"
          onChange={(evt) => {
            props.onChangePosDisplay(
              evt.currentTarget.value as PartOfSpeechDisplay
            );
          }}
        >
          <option value="expl" selected={props.posDisplay === 'expl'}>
            {t('options_pos_display_expl')}
          </option>
          <option value="code" selected={props.posDisplay === 'code'}>
            {t('options_pos_display_code')}
          </option>
          <option value="none" selected={props.posDisplay === 'none'}>
            {t('options_pos_display_none')}
          </option>
        </select> */}
        <label for="fontSize">{t('options_font_size_label')}</label>
        <select
          id="fontSize"
          name="fontSize"
          onChange={(evt) => {
            props.onChangeFontSize(evt.currentTarget.value as FontSize);
          }}
        >
          <option value="normal" selected={props.fontSize === 'normal'}>
            {t('options_font_size_normal')}
          </option>
          <option value="large" selected={props.fontSize === 'large'}>
            {t('options_font_size_large')}
          </option>
          <option value="xl" selected={props.fontSize === 'xl'}>
            {t('options_font_size_xl')}
          </option>
        </select>
        <label for="fontFace">
          {t('options_font_face_label')}
          <NewBadge expiry={new Date('2024-08-15')} />
        </label>
        <select
          id="fontFace"
          name="fontFace"
          onChange={(evt) => {
            props.onChangeFontFace(evt.currentTarget.value as FontFace);
          }}
        >
          <option value="bundled" selected={props.fontFace === 'bundled'}>
            {t('options_font_face_bundled')}
          </option>
          <option value="system" selected={props.fontFace === 'system'}>
            {t('options_font_face_system')}
          </option>
        </select>
        <div>{t('options_expand_all_entries')}</div>
        <div class="flex gap-5 px-2 pt-1">
          <CheckboxRow>
            <input
              id="expandWords"
              name="expandWords"
              type="checkbox"
              checked={props.autoExpand.includes('words')}
              onChange={(e) =>
                props.onChangeAutoExpand('words', e.currentTarget.checked)
              }
            />
            <label for="expandWords">{t('tabs_words_label')}</label>
          </CheckboxRow>
          <CheckboxRow>
            <input
              id="expandKanji"
              name="expandKanji"
              type="checkbox"
              checked={props.autoExpand.includes('kanji')}
              onChange={(e) =>
                props.onChangeAutoExpand('kanji', e.currentTarget.checked)
              }
            />
            <label for="expandKanji">{t('tabs_kanji_label')}</label>
          </CheckboxRow>
        </div>
      </div>
    </>
  );
}
