import {
  type DataSeriesState,
  type DataVersion,
  MajorDataSeries,
  allDataSeries,
  allMajorDataSeries,
} from '@birchill/jpdict-idb';
import { VariantPropsOf, variantProps } from 'classname-variants/react';
import { RenderableProps } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { JpdictState } from '../background/jpdict';
import { localizedDataSeriesKey } from '../common/data-series-labels';
import { DbLanguageId } from '../common/db-languages';
import { useLocale } from '../common/i18n';
import { classes } from '../utils/classes';
import { isFirefox } from '../utils/ua-utils';

import { Linkify } from './Linkify';
import { formatDate, formatSize } from './format';

type Props = {
  dictLang: DbLanguageId;
  dbState: JpdictState;
  devMode?: boolean;
  onCancelDbUpdate?: () => void;
  onDeleteDb?: () => void;
  onUpdateDb?: () => void;
};

export function DbStatus(props: Props) {
  const { t } = useLocale();
  return (
    <div class="flex flex-col gap-4">
      <p class="m-0">
        <Linkify
          text={t('options_about_linglook_text')}
          links={[
            {
              keyword: t('options_about_linglook_link_text'),
              href: 'https://github.com/ph0ngp/LingLook',
            },
          ]}
        />
      </p>
    </div>
    // <div class="flex flex-col gap-4 py-4">
    //   <DbSummaryBlurb dictLang={props.dictLang} />
    //   {/* <DbSummaryStatus
    //     dbState={props.dbState}
    //     onCancelDbUpdate={props.onCancelDbUpdate}
    //     onUpdateDb={props.onUpdateDb}
    //   />
    //   {props.devMode && (
    //     <div class="rounded-lg border border-solid border-red-900 bg-red-50 px-4 py-2 text-red-900 dark:border-red-200/50 dark:bg-red-900/30 dark:text-red-50">
    //       <span>Database testing features: </span>
    //       <button onClick={props.onDeleteDb}>Delete database</button>
    //     </div>
    //   )} */}
    // </div>
  );
}

// function DbSummaryBlurb(props: { dictLang: DbLanguageId }) {
//   const { t } = useLocale();

//   const attribution = t('options_data_source');
//   const attribution_vn = t('options_data_source_vn');
//   // const license = t('options_edrdg_license');
//   // const licenseKeyword = t('options_edrdg_license_keyword');
//   const accentAttribution = t('options_accent_data_source');
//   const strokeAttribution = t('options_stroke_data_source');
//   const mitLicense = t('options_mit_license');
//   const creativeCommonsLicense = t('options_creative_commons_license');
//   const hanziWriterProject = t('options_hanzi_writer_project');
//   const hanvietPinyinProject = t('options_hanviet_pinyin_project');

//   return (
//     <>
//       {props.dictLang === 'vi' && (
//         <p class="m-0">
//           <Linkify
//             text={attribution_vn}
//             links={[
//               {
//                 keyword: 'CVDICT',
//                 href: 'https://github.com/ph0ngp/CVDICT',
//               },
//               {
//                 keyword: creativeCommonsLicense,
//                 href: 'https://creativecommons.org/licenses/by-sa/4.0/',
//               },
//             ]}
//           />
//         </p>
//       )}
//       <p class="m-0">
//         <Linkify
//           text={attribution}
//           links={[
//             {
//               keyword: 'CC-CEDICT',
//               href: 'https://www.mdbg.net/chinese/dictionary?page=cedict',
//             },
//             {
//               keyword: creativeCommonsLicense,
//               href: 'https://creativecommons.org/licenses/by-sa/4.0/',
//             },
//           ]}
//         />
//       </p>
//       {props.dictLang !== 'vi' && (
//         <p class="m-0">
//           <Linkify
//             text={attribution_vn}
//             links={[
//               {
//                 keyword: 'CVDICT',
//                 href: 'https://github.com/ph0ngp/CVDICT',
//               },
//               {
//                 keyword: creativeCommonsLicense,
//                 href: 'https://creativecommons.org/licenses/by-sa/4.0/',
//               },
//             ]}
//           />
//         </p>
//       )}
//       <p class="m-0">
//         <Linkify
//           text={strokeAttribution}
//           links={[
//             {
//               keyword: hanziWriterProject,
//               href: 'https://hanziwriter.org',
//             },
//             {
//               keyword: mitLicense,
//               href: 'https://hanziwriter.org/license.html',
//             },
//           ]}
//         />
//       </p>
//       <p class="m-0">
//         <Linkify
//           text={accentAttribution}
//           links={[
//             {
//               keyword: hanvietPinyinProject,
//               href: 'https://github.com/ph0ngp/hanviet-pinyin-wordlist',
//             },
//             {
//               keyword: mitLicense,
//               href: 'https://github.com/ph0ngp/hanviet-pinyin-wordlist/blob/main/LICENSE',
//             },
//           ]}
//         />
//       </p>
//     </>
//   );
// }

function DbSummaryStatus(props: {
  dbState: JpdictState;
  onCancelDbUpdate?: () => void;
  onUpdateDb?: () => void;
}) {
  const { t } = useLocale();

  if (props.dbState.updateState.type === 'idle') {
    return (
      <IdleStateSummary dbState={props.dbState} onUpdateDb={props.onUpdateDb} />
    );
  }

  if (props.dbState.updateState.type === 'checking') {
    return (
      <DbSummaryContainer>
        <div>{t('options_checking_for_updates')}</div>
        <CancelUpdateButton onClick={props.onCancelDbUpdate} />
      </DbSummaryContainer>
    );
  }

  const {
    dbState: {
      updateState: {
        series,
        totalProgress,
        version: { major, minor, patch },
      },
    },
  } = props;
  const versionString = `${major}.${minor}.${patch}`;

  const progressAsPercent = Math.round(totalProgress * 100);
  const dbLabel = t(localizedDataSeriesKey[series]);

  return (
    <DbSummaryContainer>
      <div>
        <progress
          class="mb-2 block"
          max={100}
          id="update-progress"
          value={totalProgress * 100}
        />
        <label class="block italic" for="update-progress">
          {t('options_downloading_data', [
            dbLabel,
            versionString,
            String(progressAsPercent),
          ])}
        </label>
      </div>
      <CancelUpdateButton onClick={props.onCancelDbUpdate} />
    </DbSummaryContainer>
  );
}

const dbSummaryContainerProps = variantProps({
  base: 'flex flex-wrap items-center gap-x-4 gap-y-2 [&>:first-child]:grow',
  variants: {
    errorClass: {
      none: '',
      warning: classes(
        'rounded-lg border border-solid px-4 py-2',
        // Light mode
        'border-yellow-800 bg-yellow-50 text-yellow-800',
        // Dark mode
        'dark:border-yellow-400/50 dark:bg-yellow-900/50 dark:text-yellow-50'
      ),
      error: classes(
        'rounded-lg border border-solid px-4 py-2',
        // Light mode
        'border-red-900 bg-red-50 text-red-900',
        // Dark mode
        'dark:border-red-200/50 dark:bg-red-900/30 dark:text-red-50'
      ),
    },
  },
  defaultVariants: {
    errorClass: 'none',
  },
});

function DbSummaryContainer(
  props: RenderableProps<VariantPropsOf<typeof dbSummaryContainerProps>>
) {
  return <div {...dbSummaryContainerProps(props)}>{props.children}</div>;
}

function IdleStateSummary(props: {
  dbState: JpdictState;
  onUpdateDb?: () => void;
}) {
  const { t } = useLocale();
  const isUnavailable = allDataSeries.some(
    (series) => props.dbState[series].state === 'unavailable'
  );

  const errorDetails = useErrorDetails(props.dbState);
  if (errorDetails) {
    const { class: errorClass, errorMessage, nextRetry } = errorDetails;
    return (
      <DbSummaryContainer errorClass={errorClass}>
        <div>{errorMessage}</div>
        {nextRetry && (
          <div class="grow self-start">
            {t('options_db_update_next_retry', formatDate(nextRetry))}
          </div>
        )}
        <UpdateButton
          label={isUnavailable ? 'retry' : 'check'}
          lastCheck={props.dbState.updateState.lastCheck}
          onClick={props.onUpdateDb}
        />
      </DbSummaryContainer>
    );
  }

  return (
    <DbSummaryContainer>
      <div class="grid auto-cols-fr grid-flow-col grid-rows-[repeat(2,_auto)] gap-x-2 sm:gap-x-4">
        {allMajorDataSeries.map((series) => {
          const versionInfo = props.dbState[series].version;
          return versionInfo ? (
            <DataSeriesVersion series={series} version={versionInfo} />
          ) : null;
        })}
      </div>
      <div class="mt-2">
        <UpdateButton
          label={isUnavailable ? 'retry' : 'check'}
          lastCheck={props.dbState.updateState.lastCheck}
          onClick={props.onUpdateDb}
        />
      </div>
    </DbSummaryContainer>
  );
}

function useErrorDetails(dbState: JpdictState): {
  class: 'warning' | 'error';
  errorMessage: string;
  nextRetry?: Date;
} | null {
  const { t } = useLocale();

  const { updateError } = dbState;
  const quota = useStorageQuota(updateError?.name === 'QuotaExceededError');

  // Offline errors
  if (updateError?.name === 'OfflineError') {
    return { class: 'warning', errorMessage: t('options_offline_explanation') };
  }

  // Quote exceeded errors have a special message.
  if (updateError?.name === 'QuotaExceededError' && quota !== undefined) {
    return {
      class: 'error',
      errorMessage: t('options_db_update_quota_error', formatSize(quota)),
      nextRetry: updateError.nextRetry,
    };
  }

  // Generic update errors
  if (updateError && updateError?.name !== 'AbortError') {
    return {
      class: 'error',
      errorMessage: t('options_db_update_error', updateError.message),
      nextRetry: updateError.nextRetry,
    };
  }

  // Check if we have any version info
  const hasVersionInfo = allMajorDataSeries.some(
    (series) => !!dbState[series].version
  );
  if (hasVersionInfo) {
    return null;
  }

  // Otherwise, return a suitable summary error
  const summaryStates: Array<[DataSeriesState, string]> = [
    ['init', 'options_database_initializing'],
    [
      'unavailable',
      isFirefox()
        ? 'options_database_unavailable_firefox'
        : 'options_database_unavailable',
    ],
    ['empty', 'options_no_database'],
  ];
  for (const [state, key] of summaryStates) {
    if (allMajorDataSeries.some((series) => dbState[series].state === state)) {
      return {
        class: 'error',
        errorMessage: t(key),
      };
    }
  }

  return null;
}

function useStorageQuota(enable: boolean): number | undefined {
  const [quota, setQuota] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!enable) {
      setQuota(undefined);
      return;
    }

    navigator.storage
      .estimate()
      .then(({ quota }) => {
        if (typeof quota !== 'undefined') {
          // For Firefox, typically origins get a maximum of 20% of the global
          // limit. When we have unlimitedStorage permission, however, we can
          // use up to the full amount of the global limit. The storage API,
          // however, still returns 20% as the quota, so multiplying by 5 will
          // give the actual quota.
          if (isFirefox()) {
            quota *= 5;
          }
        }
        setQuota(quota);
      })
      .catch(() => {
        // Ignore. This UA likely doesn't support the navigator.storage API
      });
  }, [enable]);

  return quota;
}

function DataSeriesVersion(props: {
  series: MajorDataSeries;
  version: DataVersion;
}) {
  const { t } = useLocale();

  const titleKeys: { [series in MajorDataSeries]: string } = {
    kanji: 'options_kanji_data_title',
    names: 'options_name_data_title',
    words: 'options_words_data_title',
  };
  const { major, minor, patch, lang } = props.version;
  const titleString = t(
    titleKeys[props.series],
    `${major}.${minor}.${patch} (${lang})`
  );

  const sourceNames: { [series in MajorDataSeries]: string } = {
    kanji: 'KANJIDIC',
    names: 'JMnedict/ENAMDICT',
    words: 'JMdict/EDICT',
  };

  const { databaseVersion, dateOfCreation } = props.version;

  const sourceName = sourceNames[props.series];
  let sourceString;
  if (databaseVersion && databaseVersion !== 'n/a') {
    sourceString = t('options_data_series_version_and_date', [
      sourceName,
      databaseVersion,
      dateOfCreation,
    ]);
  } else {
    sourceString = t('options_data_series_date_only', [
      sourceName,
      dateOfCreation,
    ]);
  }

  return (
    <>
      <div>{titleString}</div>
      <div class="text-sm text-zinc-500 dark:text-zinc-400">{sourceString}</div>
    </>
  );
}

function UpdateButton(props: {
  label: 'retry' | 'check';
  lastCheck?: Date | null;
  onClick?: () => void;
}) {
  const { t } = useLocale();

  const buttonLabel = t(
    props.label === 'retry'
      ? 'options_update_retry_button_label'
      : 'options_update_check_button_label'
  );

  return (
    <div>
      <button type="button" onClick={props.onClick}>
        {buttonLabel}
      </button>
      {props.lastCheck && (
        <div class="mt-1.5 text-xs italic">
          {t('options_last_database_check', formatDate(props.lastCheck))}
        </div>
      )}
    </div>
  );
}

function CancelUpdateButton(props: { onClick?: () => void }) {
  const { t } = useLocale();

  return (
    <button type="button" onClick={props.onClick}>
      {t('options_cancel_update_button_label')}
    </button>
  );
}
