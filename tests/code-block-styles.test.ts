import test from 'node:test';
import assert from 'node:assert/strict';

import { codeBlockScrollContainerClassName } from '../src/components/content/code-block-styles.ts';

test('code block scroll container keeps mobile horizontal panning enabled', () => {
  assert.match(codeBlockScrollContainerClassName, /\boverflow-x-auto\b/);
  assert.match(codeBlockScrollContainerClassName, /\[touch-action:pan-x\]/);
  assert.match(codeBlockScrollContainerClassName, /\[overscroll-behavior-x:contain\]/);
  assert.match(codeBlockScrollContainerClassName, /\[-webkit-overflow-scrolling:touch\]/);
});
