import fs from 'node:fs/promises';
import postcss from 'postcss';
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';

export default {
  buildConfig: {
    plugins: [
      {
        name: 'inline-popup-styles',
        setup(build) {
          // Match the extension's inline CSS imports so browser tests exercise
          // the real popup stylesheet, including its Tailwind configuration.
          build.onLoad({ filter: /\.css$/ }, async ({ path, suffix }) => {
            if (suffix !== '?inline') {
              return;
            }
            const source = await fs.readFile(path, 'utf8');
            const plugins = source.includes('@config')
              ? [tailwindcss(), postcssImport()]
              : [postcssImport()];
            const { css } = await postcss(plugins).process(source, {
              from: path,
            });
            return {
              contents: `export default ${JSON.stringify(css)}`,
              loader: 'js',
              watchFiles: [path],
            };
          });
        },
      },
    ],
  },
};
