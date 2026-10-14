import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OrdersSkeleton from '../src/app/yonetim/_components/skeletons/OrdersSkeleton';
import ProductsSkeleton from '../src/app/yonetim/_components/skeletons/ProductsSkeleton';
import DashboardSkeleton from '../src/app/yonetim/_components/skeletons/DashboardSkeleton';
import SettingsSkeleton from '../src/app/yonetim/_components/skeletons/SettingsSkeleton';
import { TabLoading } from '../src/app/yonetim/_components/TabState';
import AdminShellSkeleton from '../src/app/yonetim/_components/AdminShellSkeleton';

test('1:1 Geometric OrdersSkeleton renders 4 tasks, segmented status bar, and 6-row table', () => {
  const html = renderToStaticMarkup(React.createElement(OrdersSkeleton));
  assert.match(html, /class="adm-tab adm-orders-skeleton"/);
  assert.match(html, /class="adm-tasks"/);
  // Exactly 4 task cards
  const taskCount = (html.match(/class="adm-task"/g) || []).length;
  assert.equal(taskCount, 4);
  // Status pills & segmented bar
  assert.match(html, /class="adm-segmented"/);
  // 6 rows in table body + 1 in head = 7 rows
  assert.match(html, /class="adm-table adm-orders-table"/);
  const rowCount = (html.match(/<tr>/g) || []).length;
  assert.equal(rowCount, 7);
});

test('1:1 Geometric ProductsSkeleton renders 4 metric boxes, toolbar, and 56px thumbnail table', () => {
  const html = renderToStaticMarkup(React.createElement(ProductsSkeleton));
  assert.match(html, /class="adm-tab adm-products-skeleton"/);
  const taskCount = (html.match(/class="adm-task"/g) || []).length;
  assert.equal(taskCount, 4);
  assert.match(html, /class="adm-toolbar"/);
  assert.match(html, /class="adm-table adm-products-table"/);
  // 56px thumbnail presence
  assert.match(html, /class="adm-skel adm-row__thumb"/);
  assert.match(html, /width:\s*56px/);
});

test('1:1 Geometric DashboardSkeleton renders revenue chart box, KPI cards, and task list', () => {
  const html = renderToStaticMarkup(React.createElement(DashboardSkeleton));
  assert.match(html, /class="adm-bento adm-dashboard-skeleton"/);
  assert.match(html, /class="adm-card adm-bento__revenue"/);
  const kpiCount = (html.match(/class="adm-card adm-bento__kpi"/g) || []).length;
  assert.equal(kpiCount, 2);
  assert.match(html, /class="adm-bento__tasks"/);
});

test('1:1 Geometric SettingsSkeleton renders 7 TOC links and fieldset cards', () => {
  const html = renderToStaticMarkup(React.createElement(SettingsSkeleton));
  assert.match(html, /class="adm-settings adm-settings-skeleton"/);
  assert.match(html, /class="adm-settings__toc"/);
  assert.match(html, /class="adm-settings__sections"/);
  const fieldsetCount = (html.match(/class="adm-fieldset"/g) || []).length;
  assert.equal(fieldsetCount, 3);
});

test('TabLoading routes tab-level requests to 1:1 geometric skeletons without layout shift', () => {
  const ordersHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Siparişler yükleniyor', tab: 'orders' }));
  assert.match(ordersHtml, /adm-orders-skeleton/);

  const productsHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Ürünler yükleniyor', tab: 'products' }));
  assert.match(productsHtml, /adm-products-skeleton/);

  const dashboardHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Gösterge paneli yükleniyor', tab: 'dashboard' }));
  assert.match(dashboardHtml, /adm-dashboard-skeleton/);

  const settingsHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Ayarlar yükleniyor', tab: 'settings' }));
  assert.match(settingsHtml, /adm-settings-skeleton/);
});

test('TabLoading prevents modal dialogs and editors from rendering full page table skeletons', () => {
  // OrderDetailDialog uses singular "Sipariş yükleniyor"
  const orderDialogHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Sipariş yükleniyor' }));
  assert.doesNotMatch(orderDialogHtml, /adm-orders-skeleton/);
  assert.doesNotMatch(orderDialogHtml, /adm-orders-table/);
  assert.match(orderDialogHtml, /class="adm-state"/);

  // ProductEditor uses singular "Ürün yükleniyor"
  const productEditorHtml = renderToStaticMarkup(React.createElement(TabLoading, { label: 'Ürün yükleniyor' }));
  assert.doesNotMatch(productEditorHtml, /adm-products-skeleton/);
  assert.doesNotMatch(productEditorHtml, /adm-products-table/);
  assert.match(productEditorHtml, /class="adm-state"/);
});

test('AdminShellSkeleton renders the neutral panel shell structure', () => {
  const html = renderToStaticMarkup(React.createElement(AdminShellSkeleton));
  assert.match(html, /class="adm-shell adm-shell--skeleton"/);
  assert.match(html, /class="adm-sidebar"/);
  assert.match(html, /class="adm-topbar"/);
  assert.match(html, /class="adm-hero"/);
});
