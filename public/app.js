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
  alt: document.querySelector('.window > img').alt,
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

function renderAlbum() {
  const shown = albumExpanded ? matchingCards : matchingCards.slice(0, firstSpread);
  const visible = new Set(shown);
  for (const card of cards) card.hidden = !visible.has(card);
  moreRow.hidden = matchingCards.length <= firstSpread;
  document.querySelector('#album-extent').textContent = '已展开 ' + shown.length + ' / ' + matchingCards.length + ' 篇';
  expandAlbum.textContent = albumExpanded ? '收起相册' : '展开其余 ' + (matchingCards.length - firstSpread) + ' 篇';
  expandAlbum.setAttribute('aria-expanded', String(albumExpanded));
}

function selectPerson(id) {
  for (const panel of profiles) panel.hidden = panel.dataset.profile !== id;
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
  for (const button of document.querySelectorAll('[data-save]')) {
    const id = button.dataset.save;
    const active = saved.has(id);
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', (active ? '取消收藏《' : '收藏《') + entries.get(id).title + '》');
    if (button.classList.contains('viewer-save')) button.textContent = active ? '已收藏' : '收藏这一页';
  }
}

function toggleSaved(id) {
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
}

function displayDialog(label, ...children) {
  dialogLabel.textContent = label;
  dialogBody.replaceChildren(...children);
  const wasOpen = dialog.open;
  if (!wasOpen) dialog.showModal();
  dialog.scrollTop = 0;
  const focusTarget = wasOpen ? dialog.querySelector('#dialog-title') : dialog.querySelector('[data-close]');
  if (wasOpen) focusTarget.tabIndex = -1;
  focusTarget.focus({preventScroll:true});
}

function showEntry(id, fromCollection = false, order = albumOrder) {
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
    const turn = element('div', 'entry-turn');
    turn.setAttribute('role', 'group');
    turn.setAttribute('aria-label', '连续阅读');
    for (const [offset, label] of [[-1, '上一篇'], [1, '下一篇']]) {
      const neighbor = order[position + offset];
      if (!neighbor) continue;
      const link = makeButton('', 'turn-link', () => showEntry(neighbor, false, order));
      link.append(element('span', '', label), element('strong', '', entries.get(neighbor).title));
      turn.append(link);
    }
    copy.append(turn);
  }
  displayDialog('MEMORY ALBUM / 日常手记', img, copy);
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
  displayDialog('COLLECTION / 收藏夹', copy);
}

function setMenu(expanded) {
  menu.setAttribute('aria-expanded', String(expanded));
  menu.setAttribute('aria-label', expanded ? '收起导航' : '展开导航');
  navigation.classList.toggle('open', expanded);
  menu.querySelector('use').setAttribute('href', expanded ? '#i-x' : '#i-menu');
}

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
dialog.addEventListener('close', () => {
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
    toggleSaved(save);
  } else if (target.hasAttribute('data-stash')) {
    setMenu(false);
    showCollection();
  } else if (target.hasAttribute('data-close')) {
    dialog.close();
  } else if (filter) {
    for (const button of document.querySelectorAll('[data-filter]')) {
      button.setAttribute('aria-pressed', String(button === target));
    }
    matchingCards = filter === 'all' ? cards : cards.filter(card => card.dataset.category === filter);
    albumExpanded = false;
    renderAlbum();
    status.textContent = target.textContent + '，共 ' + matchingCards.length + ' 篇手记。';
  } else if (target === expandAlbum) {
    albumExpanded = !albumExpanded;
    renderAlbum();
    if (albumExpanded) matchingCards[firstSpread].querySelector('.card-link').focus();
    else document.querySelector('#album-title').focus();
    status.textContent = document.querySelector('#album-extent').textContent;
  } else if (target.dataset.person) {
    selectPerson(target.dataset.person);
    status.textContent = '正在阅读' + target.textContent + '的角色档案。';
  } else if (costume) {
    const img = document.querySelector('#costume');
    img.src = 'assets/' + costume + '.webp';
    img.alt = '绪山真寻的官方' + target.textContent + '立绘';
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
document.querySelector('#album-title').tabIndex = -1;
renderAlbum();
selectPerson('mahiro');
castSelect.hidden = false;
refreshSaved();
markSection();
