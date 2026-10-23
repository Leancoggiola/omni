export default {
  '*.{ts,js,mjs}': ['eslint --fix --max-warnings 0 --no-warn-ignored', 'prettier --write'],
  '*.{json,md,css,scss}': ['prettier --write'],
};
