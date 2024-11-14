import { useSelect, useValue } from 'react-cosmos/client';

import '../../css/popup-fonts.css';

import type {
  AccentDisplay,
  FontFace,
  FontSize,
  PartOfSpeechDisplay,
} from '../common/content-config-params';
import { DbLanguageId, dbLanguages } from '../common/db-languages';
import '../content/popup/popup.css';

import { PopupThemeRadio } from './PopupThemeRadio';
import './options.css';

export default function PopupThemeRadioFixture() {
  const [accentDisplay] = useSelect<AccentDisplay>('accentDisplay', {
    defaultValue: 'binary',
    options: ['downstep', 'binary', 'binary-hi-contrast', 'none'],
  });
  const [fontFace] = useSelect<FontFace>('fontFace', {
    defaultValue: 'bundled',
    options: ['bundled', 'system'],
  });
  const [fontSize] = useSelect<FontSize>('fontSize', {
    defaultValue: 'normal',
    options: ['normal', 'large', 'xl'],
  });
  const [posDisplay] = useSelect<PartOfSpeechDisplay>('posDisplay', {
    defaultValue: 'expl',
    options: ['expl', 'code', 'none'],
  });
  const [showBunproDecks] = useValue<boolean>('showBunproDecks', {
    defaultValue: false,
  });
  const [showDefinitions] = useValue<boolean>('showDefinitions', {
    defaultValue: true,
  });
  const [hanvietDisplay] = useValue<boolean>('hanvietDisplay', {
    defaultValue: true,
  });
  const [pinyinDisplay] = useValue<boolean>('pinyinDisplay', {
    defaultValue: false,
  });
  const [showWaniKaniLevel] = useValue<boolean>('showWaniKaniLevel', {
    defaultValue: false,
  });

  const [theme, setTheme] = useSelect<string>('theme', {
    defaultValue: 'default',
    options: ['default', 'light', 'blue', 'lightblue', 'black', 'yellow'],
  });

  const [dictLang] = useSelect<DbLanguageId>('dictLang', {
    // I suspect the React Cosmos typings here are incorrect with regard to
    // constness.
    options: dbLanguages as unknown as DbLanguageId[],
    defaultValue: 'en',
  });

  return (
    <div class="w-fit">
      <PopupThemeRadio
        accentDisplay={accentDisplay}
        fontFace={fontFace}
        fontSize={fontSize}
        onChangeTheme={setTheme}
        posDisplay={posDisplay}
        showBunproDecks={showBunproDecks}
        showDefinitions={showDefinitions}
        hanvietDisplay={hanvietDisplay}
        pinyinDisplay={pinyinDisplay}
        showWaniKaniLevel={showWaniKaniLevel}
        theme={theme}
        dictLang={dictLang}
      />
    </div>
  );
}
