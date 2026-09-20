(() => {
  const { profile, projects, services, skills } = JSON.parse(document.getElementById('business-data').textContent);
  const dialog = document.getElementById('business-dialog');
  const title = document.getElementById('business-title');
  const kicker = document.getElementById('business-kicker');
  const content = document.getElementById('business-content');
  const host = window.parent;
  const aliases = { work: 'work', contact: 'contact', about: 'about', services: 'about', skills: 'about' };
  let opener = null;
  let currentHash = '';

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function link(text, href, className) {
    const node = element('a', text, className);
    node.href = href;
    if (href.startsWith('/')) node.target = '_top';
    if (href.startsWith('https://')) { node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    return node;
  }
  function hostHash() { return host.location.hash; }
  function writeHash(hash) {
    const url = new URL(host.location.href);
    url.hash = hash;
    host.history.replaceState(host.history.state, '', url);
  }
  function homeSection(id) {
    const home = host.document.querySelector('[data-sylva-home]');
    if (!home) return null;
    const target = host.document.getElementById(id);
    return target && home.contains(target) ? target : null;
  }
  function scrollHome(id) {
    const target = homeSection(id);
    if (!target) return false;
    // The complete homepage owns navigation. Standalone embeds keep the panels.
    opener = null;
    closePanel(false);
    writeHash(id === 'home' ? '' : `#${id}`);
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: host.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    return true;
  }
  function renderPanel(panel) {
    content.replaceChildren();
    kicker.textContent = 'Ahmed Esmail · Cairo, Egypt';
    if (panel === 'work') {
      title.textContent = 'Selected work & ideas.';
      content.append(element('p', 'Web experiences, learning platforms, and the ideas behind them. Concept studies are labeled below.'));
      const ordered = [...projects].sort((a, b) => Number(a.sample) - Number(b.sample));
      for (const project of ordered) {
        const item = link('', `/project/${project.slug}/`, 'business-project');
        item.append(element('span', `${project.sample ? 'Concept study' : 'Project'} · ${project.category}`, 'business-category'));
        item.append(element('strong', `${project.title} ↗`), element('p', project.description));
        content.append(item);
      }
    } else if (panel === 'about') {
      title.textContent = 'Built with purpose.';
      content.append(element('p', 'I’m Ahmed Esmail, a full-stack and frontend engineer based in Cairo. I build responsive interfaces, reliable backends, and connected workflows—from the first idea to deployment.'));
      content.append(element('h3', 'How I can help'));
      const list = element('ul', '', 'business-services');
      for (const service of services) list.append(element('li', service.title));
      content.append(list, link('Explore services ↗', '/services/', 'business-action'));
      content.append(element('h3', 'Tools I work with'));
      for (const group of skills) content.append(element('p', `${group.title}: ${group.items.join(' · ')}`));
    } else {
      title.textContent = 'Let’s build your next idea.';
      content.append(element('p', 'Tell me about your business, what you want to build, and the timeline you have in mind.'));
      content.append(link('Start a conversation ↗', `mailto:${profile.email}?subject=${encodeURIComponent('New project enquiry')}`, 'business-action'));
      const email = element('p');
      email.append(link(profile.email, `mailto:${profile.email}`));
      const social = element('div', '', 'business-links');
      social.append(link('GitHub ↗', profile.github), link('LinkedIn ↗', profile.linkedin));
      content.append(email, social);
    }
  }
  function openPanel(panel, trigger, updateHash = true) {
    if (updateHash && scrollHome(panel)) return;
    if (!aliases[panel]) return;
    if (!dialog.open) opener = trigger || document.activeElement;
    renderPanel(aliases[panel]);
    if (updateHash) writeHash(`#${panel}`);
    currentHash = hostHash();
    if (!dialog.open) dialog.showModal();
    title.focus({ preventScroll: true });
  }
  function closePanel(clearHash = true) {
    if (clearHash && hostHash() === currentHash && aliases[currentHash.slice(1)]) writeHash('');
    currentHash = '';
    if (dialog.open) dialog.close();
  }
  dialog.querySelector('.business-close').addEventListener('click', () => closePanel());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePanel(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closePanel();
  });
  dialog.addEventListener('close', () => {
    if (opener?.isConnected && !dialog.open) opener.focus({ preventScroll: true });
    opener = null;
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('[data-business-panel], [data-business-route], [data-business-home]') : null;
    if (!target) return;
    event.preventDefault();
    if (target.hasAttribute('data-business-home')) {
      if (scrollHome('home')) return;
      closePanel();
      writeHash('');
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (target.dataset.businessPanel) openPanel(target.dataset.businessPanel, target);
    else {
      const url = new URL(target.dataset.businessRoute, window.location.origin);
      const section = { '/services/': 'services', '/blogs/': 'journal' }[url.pathname];
      if (section && scrollHome(section)) return;
      if (url.origin === window.location.origin) window.top.location.assign(url.href);
    }
  });
  function followHash() {
    // Native parent anchors handle deep links without opening an iframe dialog.
    if (homeSection(hostHash().slice(1))) {
      opener = null;
      closePanel(false);
      return;
    }
    const panel = aliases[hostHash().slice(1)];
    if (panel) openPanel(panel, null, false);
    else closePanel(false);
  }
  host.addEventListener('hashchange', followHash);
  window.addEventListener('pagehide', () => host.removeEventListener('hashchange', followHash), { once: true });
  followHash();
})();
