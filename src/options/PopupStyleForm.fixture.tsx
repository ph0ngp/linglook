import { useState } from 'preact/hooks';

import '../../css/popup-fonts.css';

import type {
  AutoExpandableEntry,
  FontFace,
  FontSize,
  HanziDisplay,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { DbLanguageId } from '../common/db-languages';
import '../content/popup/popup.css';

import { PopupStyleForm } from './PopupStyleForm';
import './options.css';

export default function PopupStyleFormFixture() {
  const [theme, setTheme] = useState<string>('default');

  const [hanvietDisplay, setHanvietDisplay] = useState<boolean>(true);
  const [showHskLevel, setShowHskLevel] = useState<boolean>(false);
  const [showBunproDecks, setShowBunproDecks] = useState<boolean>(false);
  const [pinyinDisplay, setPinyinDisplay] = useState<boolean>(false);
  const [showDefinitions, setShowDefinitions] = useState<boolean>(true);

  const [hanziDisplay, setHanziDisplay] = useState<HanziDisplay>('simptrad');

  const [autoExpand, setAutoExpand] = useState<Array<AutoExpandableEntry>>([]);
  const onChangeAutoExpand = (type: AutoExpandableEntry, value: boolean) => {
    setAutoExpand((prev) =>
      value ? [...prev, type] : prev.filter((entry) => entry !== type)
    );
  };

  const [posDisplay, setPosDisplay] = useState<PartOfSpeechDisplay>('expl');

  const [fontSize, setFontSize] = useState<FontSize>('normal');
  const [fontFace, setFontFace] = useState<FontFace>('bundled');

  const [dictLang, setDictLang] = useState<DbLanguageId>('en');

  return (
    <PopupStyleForm
      hanziDisplay={hanziDisplay}
      autoExpand={autoExpand}
      fontFace={fontFace}
      fontSize={fontSize}
      onChangeHanziDisplay={setHanziDisplay}
      onChangeAutoExpand={onChangeAutoExpand}
      onChangeFontFace={setFontFace}
      onChangeFontSize={setFontSize}
      onChangePosDisplay={setPosDisplay}
      onChangeShowBunproDecks={setShowBunproDecks}
      onChangeShowDefinitions={setShowDefinitions}
      onChangeHanvietDisplay={setHanvietDisplay}
      onChangePinyinDisplay={setPinyinDisplay}
      onChangeShowHskLevel={setShowHskLevel}
      onChangeTheme={setTheme}
      posDisplay={posDisplay}
      showBunproDecks={showBunproDecks}
      showDefinitions={showDefinitions}
      hanvietDisplay={hanvietDisplay}
      pinyinDisplay={pinyinDisplay}
      showHskLevel={showHskLevel}
      theme={theme}
      dictLang={dictLang}
      onChangeDictLang={setDictLang}
    />
  );
}
