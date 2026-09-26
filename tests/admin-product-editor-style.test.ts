import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { readGlobalCss } from './helpers/stylesheets';

test('product editor remains a viewport dialog without generic modal styles', () => {
  const css = postcss.parse(readGlobalCss());
  const declarations = new Map<string, string>();
  css.walkRules('.product-editor-overlay', (rule) => {
    if (rule.parent?.type !== 'root') return;
    rule.walkDecls((decl) => { declarations.set(decl.prop, decl.value); });
  });
  assert.equal(declarations.get('position'), 'fixed');
  assert.equal(declarations.get('inset'), '0');
  assert.equal(declarations.get('display'), 'flex');
  const content = new Map<string, string>();
  css.walkRules('.modal-content.product-editor', (rule) => {
    if (rule.parent?.type !== 'root') return;
    rule.walkDecls((decl) => { content.set(decl.prop, decl.value); });
  });
  assert.equal(content.get('overflow-y'), 'auto');
});
