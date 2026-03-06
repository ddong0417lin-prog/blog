import test from 'node:test';
import assert from 'node:assert/strict';

import {
  codeBlockScrollContainerClassName,
  codeBlockScrollbarClassName,
} from '../src/components/content/code-block-styles.ts';

test('code block scroll container keeps horizontal scrolling without blocking vertical page scroll', () => {
  assert.match(codeBlockScrollContainerClassName, /\bcode-scroll-content\b/);
  assert.match(codeBlockScrollContainerClassName, /\boverflow-x-auto\b/);
  assert.match(codeBlockScrollContainerClassName, /\[overscroll-behavior-x:contain\]/);
  assert.match(codeBlockScrollContainerClassName, /\[-webkit-overflow-scrolling:touch\]/);
  assert.doesNotMatch(codeBlockScrollContainerClassName, /\[touch-action:pan-x\]/);
});

test('code block exposes a dedicated visible scrollbar rail', () => {
  assert.match(codeBlockScrollbarClassName, /\boverflow-x-auto\b/);
  assert.match(codeBlockScrollbarClassName, /\bcode-scrollbar\b/);
});
