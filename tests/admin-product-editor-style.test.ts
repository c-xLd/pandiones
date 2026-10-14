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

test('product editor page: two columns with a sticky rail, one column under 1100 px, save bar under the layout', () => {
  const css = postcss.parse(readGlobalCss());
  const layout = declarations(css, '.adm-editor__layout');
  assert.equal(layout.get('display'), 'grid');
  assert.match(layout.get('grid-template-columns') ?? '', /minmax\(0, 1fr\) 300px/);
  assert.equal(declarations(css, '.adm-editor__layout', /max-width:\s*1100px/).get('grid-template-columns'), 'minmax(0, 1fr)');
  assert.equal(declarations(css, '.adm-editor__side').get('position'), 'sticky');
  assert.equal(declarations(css, '.adm-editor .adm-editor__savebar').get('grid-column'), 'auto');
  // Order details still open as the full-height sheet.
  assert.equal(declarations(css, '.dialog.adm-dialog--sheet', /min-width:\s*900px/).get('height'), '100%');
});

test('the old modal editor, side-sheet editor and single-role picker styles are gone', () => {
  const css = readGlobalCss();
  assert.doesNotMatch(css, /\.product-editor-overlay|\.adm-dialog--editor|\.adm-media-picker|\.adm-vx__media|\.adm-editor__upload/);
});

test('media strip: cover tile is marked by more than colour, tiles keep a visible keyboard focus', () => {
  const css = postcss.parse(readGlobalCss());
  assert.equal(declarations(css, '.adm-vx__tile.is-cover').get('outline'), '2px solid var(--accent-gold)');
  assert.equal(declarations(css, '.adm-vx__tile:focus-visible').get('outline'), '2px solid var(--ink)');
  assert.equal(declarations(css, '.adm-vx__strip-list').get('overflow-x'), 'auto');
});
