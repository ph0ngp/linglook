import type { Config } from '../common/config';
import { useLocale } from '../common/i18n';
import { getReleaseStage } from '../utils/release-stage';

import { DbStatus } from './DbStatus';
import { SectionHeading } from './SectionHeading';
import { useConfigValue } from './use-config-value';
import { useDb } from './use-db';

type Props = {
  config: Config;
};

export function DictionaryDataSettings(props: Props) {
  const { t } = useLocale();
  const { dbState, startDatabaseUpdate, cancelDatabaseUpdate, deleteDatabase } =
    useDb();
  const releaseStage = getReleaseStage();
  const dictLang = useConfigValue(props.config, 'dictLang');

  return (
    <>
      <SectionHeading>{t('options_dictionary_data_heading')}</SectionHeading>
      <div class="py-4">
        <DbStatus
          dictLang={dictLang}
          dbState={dbState}
          devMode={releaseStage === 'development'}
          onCancelDbUpdate={cancelDatabaseUpdate}
          onDeleteDb={deleteDatabase}
          onUpdateDb={startDatabaseUpdate}
        />
      </div>
    </>
  );
}
