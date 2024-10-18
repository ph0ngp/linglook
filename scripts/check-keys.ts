import fg from 'fast-glob';
import * as fs from 'node:fs';
import * as process from 'node:process';
import * as url from 'node:url';
import yargs from 'yargs/yargs';

async function main() {
  const args = await yargs(process.argv.slice(2))
    .option('locale', {
      alias: 'l',
      type: 'string',
      description:
        "Locale to check for missing strings. If specified, this should match one of the directory names under _locales. Defaults to all locales other than 'en'",
    })
    .option('copy', {
      alias: 'c',
      type: 'boolean',
      default: false,
      description:
        'Flag to indicate missing strings should be appended to the file along with the English translation. Defaults to false.',
    })
    .option('prefix', {
      alias: 'p',
      type: 'string',
      description:
        'A prefix to add to any copied strings (to indicate they have yet to be translated)',
    }).argv;

  const enData = readEnData();
  let totalMissingKeys = 0;
  let totalExtraKeys = 0;

  let localeFiles: string[] = [];
  if (args.locale && args.locale !== '*') {
    if (args.locale === 'en') {
      throw new Error(
        "Can't check the keys for en locale since it is the primary source"
      );
    }

    const result = await checkLocale({
      ...args,
      locale: args.locale,
      enData,
    });
    totalMissingKeys = result.missingKeys;
    totalExtraKeys = result.extraKeys;
  } else {
    const localeDir = url.fileURLToPath(
      new URL('../_locales', import.meta.url)
    );
    localeFiles = fg.sync('**/messages.json', {
      cwd: localeDir,
      absolute: true,
    });

    // We should have at least one locale other than en
    if (localeFiles.length < 2) {
      throw new Error('Failed to find any locale files');
    }

    for (const file of localeFiles) {
      const locale = getLocaleFromFilePath(file);
      if (locale === 'en') {
        continue;
      }

      const result = await checkLocale({ ...args, locale, enData });
      totalMissingKeys += result.missingKeys;
      totalExtraKeys += result.extraKeys;
    }
  }

  // Return a non-zero exit code if there were missing or extra keys
  if (totalMissingKeys || totalExtraKeys) {
    // Print grand total if we scanned multiple files
    if (!args.locale || args.locale === '*') {
      console.log(
        `Got a total of ${totalMissingKeys} missing key(s) and ${totalExtraKeys} extra key(s).`
      );
    }
    process.exit(2);
  }

  console.log('Good job! 🥰 No missing or extra keys found');

  const differentMessageKeys = getDifferentMessageKeys({
    locale: 'vi',
    enData,
  });
  console.log(
    `Total ${differentMessageKeys.size} different message keys between en and vi:`
  );
  const parsedDatas: Record<string, L18NData> = {};
  for (const file of localeFiles) {
    const locale = getLocaleFromFilePath(file);
    parsedDatas[locale] = readLocaleData(locale).data;
  }
  for (const key of differentMessageKeys) {
    console.log(`  '${key}':`);
    for (const locale of Object.keys(parsedDatas)) {
      console.log(`    ${locale}: '${parsedDatas[locale][key].message}'`);
    }
    console.log('');
  }
}

interface L18NData {
  [key: string]: any;
}

function getLocaleFromFilePath(file: string): string {
  const matches = file.match(/\/([^/]+?)\/messages.json/);
  if (!matches || matches.length < 2) {
    throw new Error(`Failed to determine the locale from path ${file}`);
  }
  return matches[1];
}

function readEnData(): L18NData {
  return readLocaleData('en').data;
}

function readLocaleData(locale: string): {
  data: L18NData;
  filePath: string;
} {
  const messageFile = url.fileURLToPath(
    new URL(`../_locales/${locale}/messages.json`, import.meta.url)
  );
  if (!fs.existsSync(messageFile)) {
    throw new Error(`Could not find message file: ${messageFile}`);
  }

  const fileContent = fs.readFileSync(messageFile, { encoding: 'utf8' });
  const data = JSON.parse(fileContent) as L18NData;
  return { data, filePath: messageFile };
}

// assume that the keys set are identical already
function getDifferentMessageKeys({
  locale,
  enData,
}: {
  locale: string;
  enData: L18NData;
}): Set<string> {
  // console.log(`Checking keys for '${locale}' locale...`);

  const parsedData = readLocaleData(locale).data;

  // Look for different message keys
  const differentMessageKeys = new Set<string>();

  for (const [key, value] of Object.entries(parsedData)) {
    // Check if the message is identical to the English version
    if (
      typeof value === 'object' &&
      'message' in value &&
      typeof enData[key] === 'object' &&
      'message' in enData[key] &&
      value.message !== enData[key].message
    ) {
      differentMessageKeys.add(key);
    }
  }

  // console.log('Different key messages:');
  // for (const key of differentMessageKeys) {
  //   console.log(`  '${key}':`);
  //   console.log(`    en: '${enData[key].message}'`);
  //   console.log(`    ${locale}: '${parsedData[key].message}'`);
  //   console.log('');
  // }
  return differentMessageKeys;
}

async function checkLocale({
  locale,
  copy,
  prefix,
  enData,
}: {
  locale: string;
  copy: boolean;
  prefix?: string;
  enData: L18NData;
}) {
  console.log(`Checking keys for '${locale}' locale...`);

  const { data: parsedData, filePath: messageFile } = readLocaleData(locale);

  // Look for missing keys
  const missingKeys = new Set(Object.keys(enData));
  const extraKeys = new Set<string>();
  for (const key of Object.keys(parsedData)) {
    if (missingKeys.delete(key)) {
      // Key exists in both, so it's not missing
    } else {
      // Key exists in parsedData but not in enData, so it's extra
      extraKeys.add(key);
    }
  }

  // Report results
  for (const key of missingKeys) {
    console.log(`  '${key}' is missing`);
  }
  for (const key of extraKeys) {
    console.log(`  '${key}' is extra`);
  }

  if (missingKeys.size || extraKeys.size) {
    console.log(
      `${missingKeys.size} missing key(s) and ${extraKeys.size} extra key(s) in '${locale}' locale.`
    );
  }

  // Copy, if requested
  if (missingKeys.size && copy) {
    console.log(
      `Copying missing keys${prefix ? ` (prefix: '${prefix}')` : ''}...`
    );
    for (const key of missingKeys) {
      if (prefix) {
        // This awkward arrangement should hopefully mean the message is
        // serialized first.
        const updatedMessage = enData[key];
        updatedMessage.message = `${prefix}${enData[key].message}`;
        parsedData[key] = updatedMessage;
      } else {
        parsedData[key] = enData[key];
      }
    }
    fs.writeFileSync(messageFile, JSON.stringify(parsedData, null, 2), {
      encoding: 'utf8',
    });
  }

  return { missingKeys: missingKeys.size, extraKeys: extraKeys.size };
}

main()
  .then(() => {
    console.log('Done.');
  })
  .catch((e) => {
    console.error('Unhandled error');
    console.error(e);
    process.exit(1);
  });
