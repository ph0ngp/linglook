import { useCallback } from 'preact/hooks';

import type { Config } from '../common/config';
import type {
  AutoExpandableEntry,
  FontFace,
  FontSize,
  HanziDisplay,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';

import { PopupStyleForm } from './PopupStyleForm';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';

type Props = {
  config: Config;
};

export function PopupStyleSettings(props: Props) {
  const { t } = useLocale();

  const dictLang = useConfigValue(props.config, 'dictLang');
  const onChangeDictLang = useCallback(
    (value: DbLanguageId) => {
      props.config.dictLang = value;
    },
    [props.config]
  );

  const theme = useConfigValue(props.config, 'popupStyle');
  const onChangeTheme = useCallback(
    (value: string) => {
      props.config.popupStyle = value;
    },
    [props.config]
  );

  const hanvietDisplay = useConfigValue(props.config, 'hanvietDisplay');
  const onChangeHanvietDisplay = useCallback(
    (value: boolean) => {
      props.config.hanvietDisplay = value;
    },
    [props.config]
  );

  const hskDisplay = useConfigValue(props.config, 'hskDisplay');
  const onChangeShowHskLevel = useCallback(
    (value: boolean) => {
      props.config.hskDisplay = value ? 'show-matches' : 'hide';
    },
    [props.config]
  );

  const showBunproDecks = useConfigValue(props.config, 'tocflDisplay');
  const onChangeShowBunproDecks = useCallback(
    (value: boolean) => {
      props.config.tocflDisplay = value;
    },
    [props.config]
  );

  const pinyinDisplay = useConfigValue(props.config, 'pinyinDisplay');
  const onChangePinyinDisplay = useCallback(
    (value: boolean) => {
      props.config.pinyinDisplay = value;
    },
    [props.config]
  );

  const showDefinitions = !useConfigValue(props.config, 'readingOnly');
  const onChangeShowDefinitions = useCallback(
    (value: boolean) => {
      props.config.readingOnly = !value;
    },
    [props.config]
  );

  const hanziDisplay = useConfigValue(props.config, 'hanziDisplay');
  const onChangeHanziDisplay = useCallback(
    (value: HanziDisplay) => {
      props.config.hanziDisplay = value;
    },
    [props.config]
  );

  const autoExpand = useConfigValue(props.config, 'autoExpand');
  const onChangeAutoExpand = useCallback(
    (type: AutoExpandableEntry, value: boolean) => {
      props.config.toggleAutoExpand(type, value);
    },
    [props.config]
  );

  const posDisplay = useConfigValue(props.config, 'posDisplay');
  const onChangePosDisplay = useCallback(
    (value: PartOfSpeechDisplay) => {
      props.config.posDisplay = value;
    },
    [props.config]
  );

  const fontSize = useConfigValue(props.config, 'fontSize');
  const onChangeFontSize = useCallback(
    (value: FontSize) => {
      props.config.fontSize = value;
    },
    [props.config]
  );

  const fontFace = useConfigValue(props.config, 'fontFace');
  const onChangeFontFace = useCallback(
    (value: FontFace) => {
      props.config.fontFace = value;
    },
    [props.config]
  );

  return (
    <>
      <SectionHeading>{t('options_popup_style_heading')}</SectionHeading>
      <div class="py-4">
        <PopupStyleForm
          hanziDisplay={hanziDisplay}
          autoExpand={autoExpand}
          fontFace={fontFace}
          fontSize={fontSize}
          onChangeHanziDisplay={onChangeHanziDisplay}
          onChangeAutoExpand={onChangeAutoExpand}
          onChangeFontFace={onChangeFontFace}
          onChangeFontSize={onChangeFontSize}
          onChangePosDisplay={onChangePosDisplay}
          onChangeShowBunproDecks={onChangeShowBunproDecks}
          onChangeShowDefinitions={onChangeShowDefinitions}
          onChangeHanvietDisplay={onChangeHanvietDisplay}
          onChangePinyinDisplay={onChangePinyinDisplay}
          onChangeShowHskLevel={onChangeShowHskLevel}
          onChangeTheme={onChangeTheme}
          posDisplay={posDisplay}
          showBunproDecks={showBunproDecks}
          showDefinitions={showDefinitions}
          hanvietDisplay={hanvietDisplay}
          pinyinDisplay={pinyinDisplay}
          showHskLevel={hskDisplay === 'show-matches'}
          theme={theme}
          dictLang={dictLang}
          onChangeDictLang={onChangeDictLang}
        />
      </div>
    </>
  );
}
