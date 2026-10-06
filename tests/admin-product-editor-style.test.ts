import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { readGlobalCss } from './helpers/stylesheets';

/** Declarations of a selector, top-level or inside an at-rule whose params match `media`. */
function declarations(css: postcss.Root, selector: string, media?: RegExp) {
  const found = new Map<string, string>();
  css.walkRules(selector, (rule) => {
    const parent = rule.parent;
    const inMedia = parent?.type === 'atrule' ? (parent as postcss.AtRule).params : null;
    if (media ? !inMedia || !media.test(inMedia) : parent?.type !== 'root') return;
    rule.walkDecls((decl) => {
      found.set(decl.prop, decl.value);
    });
  });
  return found;
}

test('product editor opens as a full-height side sheet that scrolls inside', () => {
  const css = postcss.parse(readGlobalCss());
  const sheet = declarations(css, '.dialog.adm-dialog--sheet', /min-width:\s*900px/);
  assert.equal(sheet.get('height'), '100%');
  assert.equal(sheet.get('max-height'), 'none');
  assert.equal(declarations(css, '.dialog__body').get('overflow-y'), 'auto');
  assert.equal(declarations(css, '.adm-editor__layout').get('display'), 'grid');
});

test('the old modal editor styles are gone', () => {
  const css = readGlobalCss();
  assert.doesNotMatch(css, /\.product-editor-overlay/);
});
