import { createCart } from './cart-state.js?v=4';
import { initializeHeroVideo } from './hero-video.js?v=10';

const products = JSON.parse(document.querySelector('#catalog-data').textContent);
const $ = selector => document.querySelector(selector);
initializeHeroVideo($('#heroVideo'), $('#heroFallbackFrame'), $('#heroFilmStage'));
const money = value => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollBehavior = () => reduceMotion.matches ? 'auto' : 'smooth';
let storage;
try { storage = window.sessionStorage; } catch { /* Storage is optional. */ }
const bag = createCart(products, storage);
let activeDialog = null;
let returnFocus = null;
const accountFormMarkup = $('#accountContent').innerHTML;

function renderBag() {
  const count = bag.count();
  $('#bagCount').textContent = count;
  $('#bagSubtitle').textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
  $('#bagSubtotal').textContent = money(bag.subtotal());
  $('#checkout').disabled = count === 0;
  $('#bagItems').innerHTML = count ? bag.entries().map(({ product: p, quantity }) => `<div class="bag-row"><img src="/images/${encodeURIComponent(p.image)}" alt=""><div class="bag-row-main"><a href="/produto/${p.slug}/"><b>${escape(p.name)}</b></a><small data-nosnippet>${money(p.price)} cada · valor fictício</small><div class="quantity-control"><button data-quantity="${p.id}" data-change="-1" aria-label="Diminuir quantidade de ${escape(p.name)}">−</button><span>${quantity}</span><button data-quantity="${p.id}" data-change="1" aria-label="Aumentar quantidade de ${escape(p.name)}">+</button><button class="remove-item" data-remove="${p.id}">REMOVER</button></div></div></div>`).join('') : '<p class="empty-bag">A próxima FG pode ser a sua. Explore a coleção e encontre a peça em que você se reconhece.</p>';
}

function hideDialog(restoreFocus = true) {
  if (!activeDialog) return;
  activeDialog.classList.remove('open');
  activeDialog.setAttribute('aria-hidden', 'true');
  activeDialog.inert = true;
  activeDialog = null;
  document.body.style.overflow = '';
  if (restoreFocus) returnFocus?.focus();
}

function showDialog(id) {
  if (!activeDialog) returnFocus = document.activeElement;
  else hideDialog(false);
  activeDialog = document.getElementById(id);
  activeDialog.inert = false;
  activeDialog.setAttribute('aria-hidden', 'false');
  activeDialog.classList.add('open');
  document.body.style.overflow = 'hidden';
  activeDialog.querySelector('[role="dialog"]').focus();
}

$('#openBag').addEventListener('click', () => showDialog('bagOverlay'));
$('#openAccount').addEventListener('click', () => showDialog('accountOverlay'));
for (const id of ['closeBag', 'closeAccount', 'closeOrder']) document.getElementById(id).addEventListener('click', () => hideDialog());
for (const overlay of document.querySelectorAll('.bag-overlay, .account-overlay, .order-overlay')) {
  overlay.addEventListener('click', e => { if (e.target === overlay) hideDialog(); });
}

document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) {
    bag.add(add.dataset.add);
    renderBag();
    showDialog('bagOverlay');
  }
  const quantity = e.target.closest('[data-quantity]');
  if (quantity) { bag.change(quantity.dataset.quantity, Number(quantity.dataset.change)); renderBag(); }
  const remove = e.target.closest('[data-remove]');
  if (remove) { bag.remove(remove.dataset.remove); renderBag(); }
  if (e.target.closest('#demoLogout')) $('#accountContent').innerHTML = accountFormMarkup;
});

const grid = $('#productGrid');
if (grid) {
  const cards = [...grid.querySelectorAll('.product-card')];
  const catalogById = new Map(products.map(p => [p.id, p]));
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let selectedCategory = grid.dataset.initialFilter || 'all';
  const query = $('#searchQuery');
  const sort = $('#sortProducts');
  if (query) query.value = new URLSearchParams(window.location.search).get('q') || '';

  function updateCollection() {
    const terms = normalize(query?.value || '').split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const card of cards) {
      const p = catalogById.get(card.querySelector('[data-add]').dataset.add);
      const text = normalize(`${p.name} ${p.type} ${p.description}`);
      card.hidden = (selectedCategory !== 'all' && p.category !== selectedCategory) || !terms.every(term => text.includes(term));
      if (!card.hidden) visible++;
    }
    const ordered = [...cards].sort((a, b) => {
      if (!sort || sort.value === 'collection') return cards.indexOf(a) - cards.indexOf(b);
      const priceA = catalogById.get(a.querySelector('[data-add]').dataset.add).price;
      const priceB = catalogById.get(b.querySelector('[data-add]').dataset.add).price;
      return sort.value === 'price-asc' ? priceA - priceB : priceB - priceA;
    });
    for (const card of ordered) grid.append(card);
    if ($('#resultsCount')) $('#resultsCount').textContent = `${visible} ${visible === 1 ? 'peça' : 'peças'}`;
    if ($('#noResults')) $('#noResults').hidden = visible !== 0;
  }
  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    selectedCategory = button.dataset.filter;
    document.querySelectorAll('.filter').forEach(other => {
      const selected = other === button;
      other.classList.toggle('active', selected);
      other.setAttribute('aria-pressed', String(selected));
    });
    updateCollection();
  }));
  query?.addEventListener('input', updateCollection);
  sort?.addEventListener('change', updateCollection);
  $('#storeSearch')?.addEventListener('submit', e => {
    e.preventDefault();
    updateCollection();
    const nextURL = new URL(window.location.href);
    if (query.value.trim()) nextURL.searchParams.set('q', query.value.trim());
    else nextURL.searchParams.delete('q');
    window.history.replaceState(null, '', nextURL);
  });
  updateCollection();
}

document.querySelectorAll('[data-tabs]').forEach(group => {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  function selectTab(tab, focus = false) {
    for (const other of tabs) {
      const selected = other === tab;
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
      document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
    }
    if (focus) tab.focus();
  }
  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', e => {
      let index = tabs.indexOf(tab);
      if (e.key === 'ArrowRight') index = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
      else if (e.key === 'Home') index = 0;
      else if (e.key === 'End') index = tabs.length - 1;
      else return;
      e.preventDefault();
      selectTab(tabs[index], true);
    });
  }
  const reviewsTab = tabs.find(tab => tab.getAttribute('aria-controls') === 'panel-reviews');
  const syncHash = () => { if (window.location.hash === '#panel-reviews') selectTab(reviewsTab); };
  selectTab(window.location.hash === '#panel-reviews' ? reviewsTab : tabs[0]);
  window.addEventListener('hashchange', syncHash);
  document.querySelectorAll('[data-open-reviews]').forEach(link => link.addEventListener('click', e => {
    e.preventDefault();
    selectTab(reviewsTab, true);
    window.history.replaceState(null, '', '#panel-reviews');
    group.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }));
});

document.querySelectorAll('[data-review-form]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  const parent = form.closest('.review-information');
  parent.querySelector('[data-review-message]').textContent = form.elements['review-text'].value.trim();
  parent.querySelector('[data-review-author]').textContent = form.elements['review-name'].value.trim();
  const preview = parent.querySelector('[data-review-preview]');
  preview.hidden = false;
  preview.scrollIntoView({ behavior: scrollBehavior(), block: 'nearest' });
}));

$('#checkout').addEventListener('click', () => {
  if (!bag.count()) return;
  const items = bag.entries().map(({ product, quantity }) => `${quantity}× ${product.name}`).join(', ');
  $('#orderSummary').textContent = `${items}. Total demonstrativo: ${money(bag.subtotal())}. Você experimentou o fluxo de compra da FG.`;
  showDialog('orderOverlay');
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'accountForm') return;
  e.preventDefault();
  const name = $('#demoName').value.trim().slice(0, 40) || 'Visitante';
  $('#accountContent').innerHTML = '<div class="account-emblem">FG</div><div class="eyebrow dark"><span></span> CONTA DE DEMONSTRAÇÃO</div><h3>CHEGA MAIS,<br><em id="accountName"></em></h3><p>Este é seu espaço na FG. Você está experimentando uma prévia da área do cliente.</p><div class="account-demo-row"><span>Pedidos reais</span><strong>0</strong></div><div class="account-demo-row"><span>Modo da conta</span><strong>Demonstração</strong></div><small class="account-note">Seu nome fica apenas na memória desta página. Nenhum cadastro real foi criado e nenhum dado foi enviado.</small><button class="text-link account-logout" id="demoLogout">SAIR DA DEMONSTRAÇÃO</button>';
  $('#accountName').textContent = name;
});

$('#continueShopping').addEventListener('click', () => {
  bag.clear();
  renderBag();
  hideDialog();
  const collection = $('#colecao');
  if (collection) collection.scrollIntoView({ behavior: scrollBehavior() });
  else window.location.assign('/loja/');
});

document.addEventListener('keydown', e => {
  if (!activeDialog) return;
  if (e.key === 'Escape') { e.preventDefault(); hideDialog(); return; }
  if (e.key !== 'Tab') return;
  const focusable = [...activeDialog.querySelectorAll('a[href],button:not([disabled]),input,[tabindex="0"]')].filter(element => element.getClientRects().length);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first) return;
  if (e.shiftKey && (document.activeElement === first || document.activeElement === activeDialog.querySelector('[role="dialog"]'))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
});

$('#menuToggle').addEventListener('click', () => {
  const expanded = $('.header').classList.toggle('mobile-open');
  $('#menuToggle').setAttribute('aria-expanded', String(expanded));
});
document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => {
  $('.header').classList.remove('mobile-open');
  $('#menuToggle').setAttribute('aria-expanded', 'false');
}));
renderBag();

if ('IntersectionObserver' in window && !reduceMotion.matches) {
  const elements = document.querySelectorAll('.section-heading,.campaign-banner .feature-copy,.brand-story>div,.training-note,.closing h2');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: .12 });
  for (const element of elements) { element.classList.add('reveal'); observer.observe(element); }
  reduceMotion.addEventListener('change', event => {
    if (event.matches) { observer.disconnect(); elements.forEach(element => element.classList.add('is-visible')); }
  });
}
