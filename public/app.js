const cards = [...document.querySelectorAll('.card')];
const albumOrder = cards.map(card => card.dataset.id);
const firstSpread = 6;
const moreRow = document.querySelector('.album-more');
const expandAlbum = document.querySelector('[data-expand-album]');
const castSelect = document.querySelector('.cast-select');
const profiles = [...document.querySelectorAll('[data-profile]')];
let matchingCards = cards;
let albumExpanded = false;

const entries = new Map(cards.map(card => {
  const image = card.querySelector('img');
  return [card.dataset.id, {
    title: card.querySelector('h3').textContent,
    source: image.getAttribute('src'),
    alt: image.alt,
    episode: card.dataset.episode,
    story: card.dataset.story
  }];
}));
entries.set('cover', {
  title: '你好，绪山真寻',
  source: 'assets/cover.webp',
  alt: document.querySelector('#cover-image').alt,
  episode: '01',
  story: '真寻睡过头的这个中午，和平常有一点不一样。拿起平板，屏幕上竟然映出一张陌生的脸。在搞清楚妹妹的实验之前，先得重新认识镜子里的自己。'
});

const dialog = document.querySelector('#viewer');
const dialogBody = document.querySelector('#dialog-body');
const dialogLabel = document.querySelector('#dialog-label');
const status = document.querySelector('#status');
const storageKey = 'mahiro.club:album:v1';
const menu = document.querySelector('.menu');
const navigation = document.querySelector('#nav');
let dialogMode = '';

const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const activeMotions = new Map();
const photoVersions = new WeakMap();
const coverChoices = [...document.querySelectorAll('[data-cover]')];
const albumGrid = document.querySelector('#album-cards');
const easeOut = 'cubic-bezier(.22,.75,.22,1)';

function motionEnabled() {
  return !motionPreference?.matches && typeof Element.prototype.animate === 'function';
}

function stopMotion(node) {
  const animation = activeMotions.get(node);
  if (animation) {
    activeMotions.delete(node);
    animation.cancel();
  }
}

function playMotion(node, frames, options = {}, onFinish) {
  stopMotion(node);
  if (!motionEnabled()) {
    onFinish?.();
    return;
  }
  const animation = node.animate(frames, {duration:300, easing:easeOut, ...options});
  activeMotions.set(node, animation);
  const finish = () => {
    if (activeMotions.get(node) !== animation) return;
    activeMotions.delete(node);
    onFinish?.();
  };
  animation.onfinish = finish;
  animation.oncancel = finish;
}

motionPreference?.addEventListener?.('change', () => {
  if (motionPreference.matches) {
    for (const animation of activeMotions.values()) animation.finish();
  }
});

// Keep the last decoded picture visible until the latest selection is ready.
function swapPicture(image, src, alt, direction) {
  const frame = image.parentElement;
  const version = (photoVersions.get(image) || 0) + 1;
  photoVersions.set(image, version);
  let echo = frame.querySelector('.picture-echo');
  if (motionEnabled()) {
    if (!echo && image.complete && image.naturalWidth) {
      echo = image.cloneNode(false);
      echo.removeAttribute('id');
      echo.removeAttribute('fetchpriority');
      echo.removeAttribute('loading');
      echo.alt = '';
      echo.className = 'picture-echo';
      echo.setAttribute('aria-hidden', 'true');
      frame.append(echo);
    }
    if (echo) stopMotion(echo);
  } else {
    echo?.remove();
  }
  stopMotion(image);
  image.src = src;
  image.alt = alt;
  if (!echo?.isConnected) return;
  const reveal = () => {
    if (photoVersions.get(image) !== version) return;
    playMotion(echo, [{opacity:1}, {opacity:0}], {duration:230}, () => echo.remove());
    playMotion(image, [
      {transform:'translateX(' + direction * 7 + 'px) scale(1.025)'},
      {transform:'none'}
    ], {duration:360});
  };
  if (image.decode) image.decode().then(reveal, reveal);
  else reveal();
}

function selectCover(id) {
  const selected = coverChoices.findIndex(button => button.dataset.cover === id);
  const previous = coverChoices.findIndex(button => button.getAttribute('aria-pressed') === 'true');
  if (selected === previous) return;
  const entry = entries.get(id);
  swapPicture(document.querySelector('#cover-image'), entry.source, entry.alt, Math.sign(selected - previous));
  for (const button of coverChoices) button.setAttribute('aria-pressed', String(button.dataset.cover === id));
  document.querySelector('#cover-episode').textContent = 'EPISODE ' + entry.episode;
  document.querySelector('#cover-name').textContent = entry.title;
  const open = document.querySelector('.window .expand');
  open.dataset.open = id;
  open.setAttribute('aria-label', '打开封面手记《' + entry.title + '》');
  playMotion(document.querySelector('.cover-caption'), [{opacity:.4,transform:'translateY(4px)'},{opacity:1,transform:'none'}]);
}

function clearCardExit(card) {
  card.classList.remove('card-exiting');
  for (const property of ['left','top','width','height']) card.style.removeProperty(property);
}

function renderAlbum(animate = false) {
  const shown = albumExpanded ? matchingCards : matchingCards.slice(0, firstSpread);
  const visible = new Set(shown);
  const positions = new Map();
  const moving = animate && motionEnabled();
  if (moving) {
    const grid = albumGrid.getBoundingClientRect();
    for (const card of cards) {
      if (card.hidden && !card.classList.contains('card-exiting')) continue;
      const box = card.getBoundingClientRect();
      positions.set(card, {x:box.left-grid.left, y:box.top-grid.top, width:box.width, height:box.height,
        onScreen:box.top < window.innerHeight && box.bottom > 0});
    }
  }
  for (const card of cards) {
    stopMotion(card);
    clearCardExit(card);
    card.hidden = !visible.has(card);
    card.inert = card.hidden;
  }
  if (moving) {
    const grid = albumGrid.getBoundingClientRect();
    for (const [index,card] of shown.entries()) {
      const previous = positions.get(card);
      const box = card.getBoundingClientRect();
      const x = previous ? previous.x - (box.left-grid.left) : 0;
      const y = previous ? previous.y - (box.top-grid.top) : 14;
      if (previous && Math.abs(x) < 1 && Math.abs(y) < 1) continue;
      playMotion(card, [
        {transform:'translate(' + x + 'px,' + y + 'px)', opacity:previous ? 1 : 0},
        {transform:'none',opacity:1}
      ], {duration:320, delay:previous ? 0 : Math.min(index,4)*18, fill:'backwards'});
    }
    for (const [card,box] of positions) {
      if (visible.has(card) || !box.onScreen) continue;
      Object.assign(card.style, {left:box.x+'px',top:box.y+'px',width:box.width+'px',height:box.height+'px'});
      card.classList.add('card-exiting');
      playMotion(card,[{opacity:1,transform:'none'},{opacity:0,transform:'scale(.96)'}],
        {duration:145}, () => clearCardExit(card));
    }
  }
  moreRow.hidden = matchingCards.length <= firstSpread;
  document.querySelector('#album-extent').textContent = '已展开 ' + shown.length + ' / ' + matchingCards.length + ' 篇';
  expandAlbum.textContent = albumExpanded ? '收起相册' : '展开其余 ' + (matchingCards.length - firstSpread) + ' 篇';
  expandAlbum.setAttribute('aria-expanded', String(albumExpanded));
}

function selectPerson(id) {
  for (const panel of profiles) {
    panel.hidden = panel.dataset.profile !== id;
    panel.inert = panel.hidden;
    panel.setAttribute('aria-hidden', String(panel.hidden));
  }
  for (const button of castSelect.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button.dataset.person === id));
  }
}

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return new Set(Array.isArray(value) ? value.filter(id => entries.has(id)) : []);
  } catch {
    return new Set();
  }
}

let saved = loadSaved();

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content) node.textContent = content;
  return node;
}

function makeButton(label, className, action) {
  const button = element('button', className, label);
  button.addEventListener('click', action);
  return button;
}

function refreshSaved() {
  const count = document.querySelector('.count');
  count.textContent = saved.size;
  count.hidden = !saved.size;
  for (const card of cards) card.classList.toggle('is-saved', saved.has(card.dataset.id));
  for (const button of document.querySelectorAll('[data-save]')) {
    const id = button.dataset.save;
    const active = saved.has(id);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', (active ? '取消收藏《' : '收藏《') + entries.get(id).title + '》');
    if (button.classList.contains('viewer-save')) button.textContent = active ? '已收藏' : '收藏这一页';
  }
}

function toggleSaved(id, trigger) {
  if (saved.has(id)) saved.delete(id);
  else saved.add(id);
  let message = saved.has(id) ? '已加入收藏夹。' : '已移出收藏夹。';
  try {
    localStorage.setItem(storageKey, JSON.stringify([...saved]));
  } catch {
    message += '当前浏览器只会在本次访问中保留更改。';
  }
  status.textContent = message;
  refreshSaved();
  const card = cards.find(item => item.dataset.id === id);
  if (card && saved.has(id)) {
    const stamp = card.querySelector('.bookmark');
    playMotion(stamp,[{transform:'translateY(-85%)'},{transform:'translateY(5%)'},{transform:'none'}],{duration:340});
  }
  if (trigger) {
    playMotion(trigger.querySelector('svg') || trigger, [
      {scale:1},{scale:saved.has(id) ? 1.19 : .9, offset:.42},{scale:1}
    ], {duration:260});
  }
}

function displayDialog(label, children, direction = 0) {
  dialogLabel.textContent = label;
  const page = element('div', 'reader-page');
  page.append(...children);
  const oldPage = dialogBody.firstElementChild;
  if (oldPage) stopMotion(oldPage);
  dialogBody.replaceChildren(page);
  const wasOpen = dialog.open;
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0;
  const focusTarget = wasOpen ? dialog.querySelector('#dialog-title') : dialog.querySelector('[data-close]');
  if (wasOpen) focusTarget.tabIndex = -1;
  focusTarget.focus({preventScroll:true});
  if (wasOpen && direction) {
    page.style.transformOrigin = direction > 0 ? 'left center' : 'right center';
    page.classList.add(direction > 0 ? 'turn-forward' : 'turn-back');
    playMotion(page, [
      {opacity:.45, transform:'perspective(1000px) translateX(' + direction * 23 + 'px) rotateY(' + direction * 5 + 'deg)'},
      {opacity:1, transform:'none'}
    ], {duration:340});
  } else if (wasOpen) {
    playMotion(page, [{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220});
  }
}

function showEntry(id, fromCollection = false, order = albumOrder, direction = 0) {
  const entry = entries.get(id);
  if (!entry) return;
  dialogMode = 'entry';
  const img = element('img', 'viewer-img');
  img.src = entry.source;
  img.alt = entry.alt;
  const copy = element('div', 'dialog-copy');
  const title = element('h2', '', entry.title);
  title.id = 'dialog-title';
  const episodeLink = element('a', 'source-link', '第 ' + Number(entry.episode) + ' 话 · 官方剧照出处');
  episodeLink.href = 'https://onimai.jp/episode/' + entry.episode + '.html';
  const actions = element('div', 'dialog-actions');
  const save = element('button', 'button primary viewer-save');
  save.dataset.save = id;
  actions.append(save, episodeLink);
  copy.append(element('div', 'entry-name', 'EPISODE ' + entry.episode), title, element('p', '', entry.story), actions);
  if (fromCollection) {
    copy.append(makeButton('返回收藏夹', 'plain', showCollection));
  } else if (id === 'cover') {
    copy.append(makeButton('从第 1 话开始读', 'plain', () => showEntry(albumOrder[0])));
  } else if (order.length > 1) {
    const position = order.indexOf(id);
    const folio = element('div','folio');
    folio.append(element('span','', '第 ' + (position+1) + ' / ' + order.length + ' 篇'));
    const rule = element('progress');
    rule.max = order.length;
    rule.value = position + 1;
    rule.setAttribute('aria-label','当前阅读位置');
    folio.append(rule);
    copy.prepend(folio);
    const turn = element('div', 'entry-turn');
    turn.setAttribute('role', 'group');
    turn.setAttribute('aria-label', '连续阅读');
    for (const [offset, label] of [[-1, '上一篇'], [1, '下一篇']]) {
      const neighbor = order[position + offset];
      if (!neighbor) continue;
      const link = makeButton('', 'turn-link', () => showEntry(neighbor, false, order, offset));
      link.dataset.step = String(offset);
      link.setAttribute('aria-keyshortcuts', offset > 0 ? 'ArrowRight' : 'ArrowLeft');
      link.append(element('span', '', label), element('strong', '', entries.get(neighbor).title));
      turn.append(link);
    }
    const hint = element('p', 'reader-hint');
    hint.append(element('span','key-hint','左右方向键翻页'), element('span','touch-hint','左右轻扫可翻页'));
    copy.append(turn, hint);
  }
  displayDialog('MEMORY ALBUM / 日常手记', [img, copy], direction);
  refreshSaved();
}

function showCollection() {
  dialogMode = 'collection';
  const copy = element('div', 'dialog-copy');
  const title = element('h2', '', '我的收藏夹');
  title.id = 'dialog-title';
  copy.append(title);
  if (!saved.size) {
    const empty = element('div', 'empty');
    empty.append(element('p', '', '还没有收藏。点一下相册卡片上的爱心，就能把喜欢的画面留在这里。'));
    empty.append(makeButton('去翻相册', 'button primary', () => {
      dialog.close();
      location.hash = 'album';
      document.querySelector('#album-title').focus({preventScroll:true});
    }));
    copy.append(empty);
  } else {
    copy.append(element('p', '', '已收藏 ' + saved.size + ' 页，保存在当前浏览器。'));
    const list = element('ul', 'stash-list');
    for (const id of saved) {
      const entry = entries.get(id);
      const row = element('li');
      const open = makeButton('', '', () => showEntry(id, true));
      const img = element('img');
      img.src = entry.source;
      img.alt = '';
      open.append(img, element('span', '', entry.title));
      const remove = makeButton('移除', 'plain', () => {
        toggleSaved(id);
        showCollection();
      });
      remove.setAttribute('aria-label', '移除《' + entry.title + '》');
      row.append(open, remove);
      list.append(row);
    }
    copy.append(list);
  }
  displayDialog('COLLECTION / 收藏夹', [copy]);
}

function setMenu(expanded) {
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? '收起导航' : '展开导航');
  navigation.classList.toggle('open', expanded);
  menu.querySelector('use').setAttribute('href', expanded ? '#i-x' : '#i-menu');
}

// Adjacent choices can be explored without tabbing through the whole group.
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const choice = event.target.closest?.('[data-cover], [data-filter], [data-person], [data-costume]');
  if (!choice || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  const choices = [...choice.parentElement.querySelectorAll('button')];
  const index = choices.indexOf(choice);
  let next;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = choices.length - 1;
  else next = (index + (event.key === 'ArrowLeft' ? -1 : 1) + choices.length) % choices.length;
  event.preventDefault();
  choices[next].focus({preventScroll:true});
  choices[next].click();
});

menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
navigation.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) {
    setMenu(false);
    menu.focus();
  }
});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('keydown', event => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const offset = {ArrowLeft:'-1',ArrowRight:'1'}[event.key];
  if (!offset || !dialog.open) return;
  const button = dialogBody.querySelector('[data-step="' + offset + '"]');
  if (button) {
    event.preventDefault();
    button.click();
  }
});

let swipeStart;
dialogBody.addEventListener('pointerdown', event => {
  swipeStart = null;
  if (!event.isPrimary || event.pointerType === 'mouse' || event.target.closest('a,button')) return;
  swipeStart = {id:event.pointerId,x:event.clientX,y:event.clientY};
});
dialogBody.addEventListener('pointercancel', () => { swipeStart = null; });
dialogBody.addEventListener('pointerup', event => {
  if (!swipeStart || swipeStart.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy)*1.5 || window.getSelection()?.toString()) return;
  dialogBody.querySelector(dx < 0 ? '[data-step="1"]' : '[data-step="-1"]')?.click();
});
dialog.addEventListener('close', () => {
  swipeStart = null;
  dialogMode = '';
});

document.addEventListener('click', event => {
  const target = event.target.closest('button, a');
  if (!target) return;
  const { open, save, filter, costume } = target.dataset;
  if (open) {
    if (target.tagName === 'A' && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    const order = target.closest('.card') ? matchingCards.map(card => card.dataset.id) : albumOrder;
    showEntry(open, false, order);
  } else if (save) {
    toggleSaved(save, target);
  } else if (target.hasAttribute('data-stash')) {
    setMenu(false);
    showCollection();
  } else if (target.hasAttribute('data-close')) {
    dialog.close();
  } else if (target.dataset.cover) {
    selectCover(target.dataset.cover);
  } else if (filter) {
    if (target.getAttribute('aria-pressed') === 'true') return;
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.setAttribute('aria-pressed', String(button === target));
    }
    matchingCards = filter === 'all' ? cards : cards.filter(card => card.dataset.category === filter);
    albumExpanded = false;
    renderAlbum(true);
    status.textContent = target.textContent + '，共 ' + matchingCards.length + ' 篇手记。';
  } else if (target === expandAlbum) {
    albumExpanded = !albumExpanded;
    renderAlbum(true);
    if (albumExpanded) matchingCards[firstSpread].querySelector('.card-link').focus();
    else document.querySelector('#album-title').focus();
    status.textContent = document.querySelector('#album-extent').textContent;
  } else if (target.dataset.person) {
    selectPerson(target.dataset.person);
    status.textContent = '正在阅读' + target.textContent + '的角色档案。';
  } else if (costume) {
    const img = document.querySelector('#costume');
    if (target.getAttribute('aria-pressed') === 'true') return;
    swapPicture(img, 'assets/' + costume + '.webp', '绪山真寻的官方' + target.textContent + '立绘', costume === 'uniform' ? 1 : -1);
    for (const button of document.querySelectorAll('[data-costume]')) {
      button.setAttribute('aria-pressed', String(button === target));
    }
    status.textContent = '已切换至' + target.textContent + '。';
  }
});

const navLinks = [...navigation.querySelectorAll('a')];
const sections = navLinks.map(link => document.querySelector(link.hash));
let scheduled = false;
function markSection() {
  const line = window.innerHeight * .38;
  let current = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= line) current = section;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) current = sections.at(-1);
  for (const link of navLinks) {
    if (link.hash === '#' + current.id) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  scheduled = false;
}
function onViewportChange() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(markSection);
}
window.addEventListener('scroll', onViewportChange, { passive:true });
window.addEventListener('resize', onViewportChange);
window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  saved = loadSaved();
  if (dialog.open && dialogMode === 'collection') showCollection();
  refreshSaved();
});
for (const card of cards) {
  const bookmark = element('span', 'bookmark', '♥');
  bookmark.setAttribute('aria-hidden','true');
  card.querySelector('.thumb').append(bookmark);
}
document.querySelector('.contact-strip').hidden = false;
document.querySelector('#album-title').tabIndex = -1;
renderAlbum();
selectPerson('mahiro');
document.querySelector('.profile-stage').classList.add('has-tabs');
castSelect.hidden = false;
refreshSaved();
markSection();
