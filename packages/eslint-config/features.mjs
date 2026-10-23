import fs from 'node:fs';

const MESSAGE = 'Un feature no importa otro: la UI compartida vive en @/shared/ui.';

/**
 * Regla de oro 1: un bloque por feature que prohíbe `@/features/<otro>`. `paths` y `patterns` extra se
 * conservan porque `no-restricted-imports` se reemplaza completo por bloque.
 */
export function featureIsolation({ featuresDir, paths = [], patterns = [] }) {
  const features = fs.readdirSync(featuresDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
  return features.map(({ name }) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths,
          patterns: [
            ...patterns,
            { regex: `^@/features(/(?!${name}(/|$))|$)`, message: MESSAGE },
            { regex: '^(\\.\\./)+features/', message: MESSAGE },
          ],
        },
      ],
    },
  }));
}
