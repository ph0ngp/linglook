import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { Browser, chromium } from 'playwright';
import { create, fragment } from 'xmlbuilder2';

const DEST_FOLDER = url.fileURLToPath(new URL('../images', import.meta.url));
const XCODE_LARGE_ICON_FOLDER = url.fileURLToPath(
  new URL(
    '../xcode13/Shared (App)/Assets.xcassets/LargeIcon.imageset',
    import.meta.url
  )
);
const XCODE_APP_ICON_FOLDER = url.fileURLToPath(
  new URL(
    '../xcode13/Shared (App)/Assets.xcassets/AppIcon.appiconset',
    import.meta.url
  )
);
const XCODE_RESOURCES_FOLDER = url.fileURLToPath(
  new URL('../xcode13/Shared (App)/Resources', import.meta.url)
);
const SVG_NS = 'http://www.w3.org/2000/svg';

async function main() {
  const browser = await chromium.launch();

  const allAppIcons = getPngFiles(XCODE_APP_ICON_FOLDER);
  for (const file of allAppIcons) {
    const { name, size } = getNameAndSize(file);
    await saveIcon({
      browser,
      enabled: true,
      sizes: [size],
      style: '10',
      // https://forums.developer.apple.com/forums/thread/670578
      fillRatio: name === 'mac' ? 824 / 1024 : 1,
      rounded: name === 'mac' ? true : false,
      withSVG: false,
      writePath: XCODE_APP_ICON_FOLDER,
      customName: file,
    });
  }

  await saveIcon({
    browser,
    enabled: true,
    sizes: [384],
    style: '10',
    fillRatio: 0.75,
    rounded: true,
    withSVG: false,
    writePath: XCODE_RESOURCES_FOLDER,
    customName: 'Icon.png',
  });

  await saveIcon({
    browser,
    enabled: true,
    sizes: [128, 256, 384],
    style: '10',
    fillRatio: 0.75,
    rounded: true,
    withSVG: false,
    writePath: XCODE_LARGE_ICON_FOLDER,
  });

  for (const style of ['10', '天'] as const) {
    for (const enabled of [true, false]) {
      // Generic icons
      await saveIcon({
        browser,
        enabled,
        sizes: [16, 32, 48, 96, 128],
        style,
        fillRatio: 1,
        rounded: true,
        withSVG: true,
        writePath: DEST_FOLDER,
      });

      // Progress icons
      for (const progress of [
        0,
        20,
        40,
        60,
        80,
        100,
        'indeterminate',
      ] as const) {
        for (const color of ['green', 'blue', 'purple'] as const) {
          await saveIcon({
            browser,
            enabled,
            progress: { value: progress, color },
            sizes: [16, 32, 48],
            style,
            fillRatio: 1,
            rounded: true,
            withSVG: true,
            writePath: DEST_FOLDER,
          });
        }
      }
    }

    // Error icons
    await saveIcon({
      badge: 'error',
      browser,
      enabled: false,
      sizes: [16, 32, 48],
      style,
      fillRatio: 1,
      rounded: true,
      withSVG: true,
      writePath: DEST_FOLDER,
    });
  }

  await browser.close();
}

function getPngFiles(directoryPath: string): string[] {
  return fs
    .readdirSync(directoryPath)
    .filter((file) => path.extname(file).toLowerCase() === '.png');
}

function getNameAndSize(filename: string) {
  const onlyFilename = filename.substring(0, filename.lastIndexOf('.'));
  const parts = onlyFilename.split('-icon-');
  const name = parts[0];
  const sizeParts = parts[1].split('@');
  const firstSize = parseFloat(sizeParts[0]);
  const multiplier = parseInt(sizeParts[1].slice(0, -1));
  const size = firstSize * multiplier;
  return { name, size };
}

async function saveIcon({
  badge,
  browser,
  enabled,
  progress,
  sizes,
  fillRatio,
  style,
  rounded,
  withSVG,
  writePath,
  customName,
}: {
  badge?: 'error';
  browser: Browser;
  enabled: boolean;
  progress?: {
    value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
    color: 'green' | 'blue' | 'purple';
  };
  sizes: Array<number>;
  fillRatio: number;
  style: '10' | '天';
  rounded: boolean;
  withSVG: boolean;
  writePath: string;
  customName?: string;
}) {
  // Filename
  const filenameParts = ['10ten'];
  if (style === '天') {
    filenameParts.push('sky');
  }
  if (!enabled && badge !== 'error') {
    filenameParts.push('disabled');
  }
  if (badge === 'error') {
    filenameParts.push('error');
  }
  if (progress) {
    const { value, color } = progress;
    filenameParts.push(typeof value === 'number' ? `${value}p` : value);
    filenameParts.push(color);
  }

  // SVG version
  if (withSVG) {
    const svg = generateSvg({
      badge,
      enabled,
      progress,
      size: 32,
      fillRatio,
      style,
      rounded,
    });
    const filename = filenameParts.join('-') + '.svg';
    const dest = path.join(writePath, filename);
    console.log(`Writing ${dest}...`);
    fs.writeFileSync(dest, svg);
  }

  // PNG versions
  for (const size of sizes) {
    const page = await browser.newPage();
    const svg = generateSvg({
      badge,
      enabled,
      progress,
      size,
      fillRatio,
      style,
      rounded,
    });
    const svgUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    await page.setContent(
      `<html><body><img id="img" src="${svgUrl}" width="${size}" height="${size}"></body></html>`
    );
    const filename = filenameParts.join('-') + `-${size}.png`;
    const dest = path.join(writePath, customName ?? filename);
    console.log(`Writing ${dest}...`);
    await page.locator('#img').screenshot({ omitBackground: true, path: dest });
  }
}

const COLORS = {
  green: ['green', 'lime'],
  blue: ['#004d91', '#26bdfb'],
  purple: ['#5b006e', '#e458fa'],
};

function generateSvg({
  badge,
  enabled,
  progress,
  size,
  fillRatio,
  style,
  rounded,
}: {
  badge?: 'error';
  enabled: boolean;
  progress?: {
    value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
    color: 'green' | 'blue' | 'purple';
  };
  size: number;
  fillRatio: number;
  style: '10' | '天';
  rounded: boolean;
}) {
  const svg = create().ele('svg', {
    xmlns: SVG_NS,
    viewBox: `0 0 ${size} ${size}`,
  });

  // Progress bar gradient
  if (progress) {
    if (size > 48) {
      throw new Error('Progress bar is only supported for sizes <= 48');
    }

    const gradientDimension = {
      16: {
        x1: '-.42',
        x2: '-.42',
        y1: -137.42,
        y2: -137.5,
        gradientTransform: 'translate(6 -2735) scale(10 -20)',
      },
      32: {
        x1: -16.4,
        x2: -16.4,
        y1: -138.09,
        y2: -138.24,
        gradientTransform: 'translate(168 -2735) scale(10 -20)',
      },
      48: {
        x1: -46.87,
        x2: -46.87,
        y1: -138.76,
        y2: -138.99,
        gradientTransform: 'translate(474 -2735) scale(10 -20)',
      },
    };

    svg
      .ele('defs')
      .ele('linearGradient', {
        id: 'linear-gradient',
        ...gradientDimension[size as 16 | 32 | 48],
        gradientUnits: 'userSpaceOnUse',
      })
      .ele('stop', { offset: '.2', 'stop-color': COLORS[progress.color][1] })
      .up()
      .ele('stop', { offset: 1, 'stop-color': COLORS[progress.color][0] });
  }

  // Background
  const realSize = size * fillRatio;
  const offset = (size - realSize) * 0.5;
  // originally backgroundRounding is 0.15625, this number is taken from original source: 16 -> 2.5, 32->5, 128 ->20,...
  // 0.225 from https://forums.developer.apple.com/forums/thread/670578
  const backgroundRounding = rounded ? realSize * 0.225 : 0;
  svg.ele('rect', {
    x: offset,
    y: offset,
    width: realSize,
    height: realSize,
    fill: enabled ? '#1d1a19' : 'white',
    opacity: enabled ? undefined : '0.5',
    rx: backgroundRounding,
  });

  // 10ten logo
  svg.import(getLogo({ enabled, size: realSize, style, x: offset, y: offset }));

  // Progress bar
  if (progress) {
    if (size > 48) {
      throw new Error('Progress bar is only supported for sizes <= 48');
    }

    svg.import(
      getProgressBar({
        color: progress.color,
        enabled,
        value: progress.value,
        size: size as 16 | 32 | 48,
      })
    );
  }

  // Error badge
  if (badge === 'error') {
    if (progress) {
      throw new Error('Error badge is not supported with progress bar');
    }
    if (enabled) {
      throw new Error('Error badge is only shown in disabled state');
    }
    if (size > 48) {
      throw new Error('Error badge is only supported for sizes <= 48');
    }
    svg.import(getErrorBadge(size as 16 | 32 | 48));
  }

  return svg.end({ headless: true, prettyPrint: true });
}

// generate one L shape
function createPath(
  x0: number,
  y0: number,
  ho: number,
  c: number,
  topcurve: number,
  innercurve: number,
  r: number
): string {
  const hi = ho - c * ((1 / Math.sqrt(2) - 1) * r + 1);
  console.assert(hi === ho - c);
  // hi = ho - c
  const bigc = c + (c + hi - ho);
  console.assert(bigc === c);

  return `M${x0} ${y0}v-${ho}c0 -${c * topcurve} ${c} -${c * topcurve} ${c} 0v${hi}c0 ${c * (1 - innercurve)} ${c * innercurve} ${c} ${c} ${c}h${hi}c${c * topcurve} 0 ${c * topcurve} ${c} 0 ${c}h-${ho}c-${bigc * (1 - innercurve)} 0 -${bigc} -${bigc * innercurve} -${bigc} -${bigc}Z`;
}

// generate 2 L shapes
function create2Path(
  viewbox: number,
  rate: number = 0.5,
  split: number = 0.8,
  innercurve: number = 0.3,
  distance: number = 1.7
): string {
  const total_size = viewbox * rate;
  const ho = total_size * split;
  const c = total_size * (1 - split);
  const x0 = (viewbox - total_size) * 0.5;
  const y0 = viewbox - x0 - c;
  const topcurve = 0;
  const r = 0;
  const c2 = c * distance;

  return `${createPath(x0, y0, ho, c, topcurve, innercurve, r)}${createPath(x0 + c2, y0 - c2, ho - c2, c, topcurve, innercurve, r)}`;
}

function getLogo({
  enabled,
  size,
  style,
  x,
  y,
}: {
  enabled: boolean;
  size: number;
  style: '10' | '天';
  x: number;
  y: number;
}) {
  // const blueDot = {
  //   '10': {
  //     16: { cx: 13.5, cy: 11.5, r: 0.9 },
  //     32: { cx: 26.5, cy: 22.5, r: 1.8 },
  //     48: { cx: 39.5, cy: 34, r: 2.7 },
  //     96: { cx: 73, cy: 64.5, r: 4.5 },
  //     128: { cx: 98, cy: 86, r: 6 },
  //   },
  //   天: {
  //     16: { cx: 13.5, cy: 11.5, r: 1.1 },
  //     32: { cx: 27, cy: 23, r: 1.82 },
  //     48: { cx: 40, cy: 34.5, r: 2.7 },
  //     96: { cx: 74.5, cy: 66, r: 4.55 },
  //     128: { cx: 99, cy: 86, r: 6 },
  //   },
  // };
  // const yellowDot = {
  //   '10': {
  //     16: { cx: 9, cy: 8, r: 0.9 },
  //     32: { cx: 18, cy: 16, r: 1.8 },
  //     48: { cx: 27, cy: 24, r: 2.7 },
  //     96: { cx: 52, cy: 48, r: 4.5 },
  //     128: { cx: 70, cy: 64, r: 6 },
  //   },
  //   天: {
  //     16: { cx: 2.5, cy: 4.5, r: 1.1 },
  //     32: { cx: 5, cy: 9.5, r: 1.82 },
  //     48: { cx: 8, cy: 14, r: 2.7 },
  //     96: { cx: 21.5, cy: 31, r: 4.55 },
  //     128: { cx: 29, cy: 40, r: 6 },
  //   },
  // };

  return (
    fragment()
      // .ele('circle', {
      //   ...blueDot[style][size],
      //   fill: enabled ? '#2698fb' : '#4a4a4b',
      // })
      // .up()
      // .ele('circle', {
      //   ...yellowDot[style][size],
      //   fill: enabled ? '#ffd500' : '#4a4a4b',
      // })
      // .up()
      .ele('path', {
        d: create2Path(size),
        fill: enabled ? 'white' : '#4a4a4b',
        transform: `translate(${x}, ${y})`,
      })
      .up()
  );
}

function getProgressBar({
  color,
  enabled,
  value,
  size,
}: {
  color: 'green' | 'blue' | 'purple';
  enabled: boolean;
  value: 0 | 20 | 40 | 60 | 80 | 100 | 'indeterminate';
  size: 16 | 32 | 48;
}) {
  const backgroundPath = {
    16: 'M2.17 13h11.66c.64 0 1.17.52 1.17 1.17 0 .64-.52 1.17-1.17 1.17H2.17c-.64 0-1.17-.52-1.17-1.17 0-.64.52-1.17 1.17-1.17Z',
    32: 'M4.75 26h22.5c1.24 0 2.25 1.01 2.25 2.25s-1.01 2.25-2.25 2.25H4.75c-1.24 0-2.25-1.01-2.25-2.25S3.51 26 4.75 26Z',
    48: 'M6.5 39h35c1.93 0 3.5 1.57 3.5 3.5S43.43 46 41.5 46h-35C4.57 46 3 44.43 3 42.5S4.57 39 6.5 39Z',
  };
  const barPath = {
    0: {
      16: 'M2.17 13.39v1.56c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75v3c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17v4.67c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    20: {
      16: 'M2.17 13.39h2.31v1.54H2.17c-.38 0-.77-.38-.77-.77s.38-.77.77-.77Z',
      32: 'M4.75 26.75H9.2v2.97H4.75c-.74 0-1.48-.74-1.48-1.48s.74-1.48 1.48-1.48Z',
      48: 'M6.5 40.17h7v4.67h-7c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    40: {
      16: 'M2.17 13.39h4.66v1.56H2.17c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h9v3h-9c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h14v4.67h-14c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    60: {
      16: 'M2.17 13.39h7v1.56h-7c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h13.5v3H4.75c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h21v4.67h-21c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    80: {
      16: 'M2.17 13.39h9.33v1.56H2.17c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.75 26.75h18v3h-18c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h28v4.67h-28c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
    100: {
      16: 'M2.19 13.39h11.67c.39 0 .78.39.78.78s-.39.78-.78.78H2.19c-.39 0-.78-.39-.78-.78s.39-.78.78-.78Z',
      32: 'M4.8 26.75h22.5c.75 0 1.5.75 1.5 1.5s-.75 1.5-1.5 1.5H4.8c-.75 0-1.5-.75-1.5-1.5s.75-1.5 1.5-1.5Z',
      48: 'M6.5 40.17h35c1.17 0 2.33 1.17 2.33 2.33s-1.17 2.33-2.33 2.33h-35c-1.17 0-2.33-1.17-2.33-2.33s1.17-2.33 2.33-2.33Z',
    },
  };
  const indeterminatePath = {
    16: 'm2.19 14.94 1.5-1.56h1.13l-1.5 1.56H2.19Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H4.44Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H6.69Zm2.25 0 1.5-1.56h1.13l-1.5 1.56H8.94Zm2.25 0 1.5-1.56h1.13l-1.5 1.56h-1.13Z',
    32: 'm4.8 29.75 2.9-3h2.17l-2.9 3H4.8Zm4.35 0 2.9-3h2.17l-2.9 3H9.15Zm4.35 0 2.9-3h2.17l-2.9 3H13.5Zm4.35 0 2.9-3h2.17l-2.9 3h-2.17Zm4.35 0 2.9-3h2.17l-2.9 3H22.2Z',
    48: 'm6.57 44.83 4.44-4.67h3.33L9.9 44.83H6.57Zm6.66 0 4.44-4.67H21l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Zm6.66 0 4.44-4.67h3.33l-4.44 4.67h-3.33Z',
  };

  const result = fragment();
  result
    .ele('path', {
      d: backgroundPath[size],
      fill: enabled ? undefined : '#4a4a4b',
      'fill-opacity': enabled ? '.7' : undefined,
    })
    .up()
    .ele('path', {
      d: barPath[value === 'indeterminate' ? 100 : value][size],
      fill: 'url(#linear-gradient)',
    });

  if (value === 'indeterminate') {
    result.ele('path', { d: indeterminatePath[size], fill: COLORS[color][0] });
  }

  return result;
}

function getErrorBadge(size: 16 | 32 | 48) {
  const trianglePath = {
    16: 'M14.76 3.28 13.52.8a.488.488 0 0 0-.67-.22.47.47 0 0 0-.22.22l-1.24 2.48a.5.5 0 0 0 .45.72h2.48c.28 0 .5-.22.5-.5 0-.08-.02-.15-.05-.22Z',
    32: 'm30.88 7.34-2.85-5.7c-.28-.57-.98-.8-1.54-.51-.22.11-.4.29-.51.51l-2.85 5.7A1.149 1.149 0 0 0 24.16 9h5.7c.64 0 1.15-.51 1.15-1.15 0-.18-.04-.35-.12-.51Z',
    48: 'm46 11.16-4.27-8.55a1.728 1.728 0 0 0-3.09 0l-4.27 8.55c-.42.85-.08 1.89.78 2.31.24.12.5.18.77.18h8.55a1.73 1.73 0 0 0 1.55-2.5Z',
  };
  const exclamationMark = {
    16: 'M12.79 1.47c0-.14.13-.25.29-.25s.29.11.29.25v1c0 .14-.13.25-.29.25s-.29-.11-.29-.25v-1Zm.29 2.1a.29.29 0 1 1 0-.58.29.29 0 0 1 0 .58Z',
    32: 'M26.33 3.18c0-.32.3-.58.67-.58s.67.26.67.58v2.3c0 .32-.3.58-.67.58s-.67-.26-.67-.58v-2.3ZM27 8a.67.67 0 1 1 0-1.34A.67.67 0 0 1 27 8Z',
    48: 'M39.18 4.93c0-.48.45-.86 1-.86s1 .39 1 .86v3.45c0 .48-.45.86-1 .86s-1-.39-1-.86V4.93Zm1 7.23c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1Z',
  };

  return fragment()
    .ele('path', {
      d: trianglePath[size],
      fill: '#f24b59',
    })
    .up()
    .ele('path', {
      d: exclamationMark[size],
      fill: 'white',
    })
    .up();
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
