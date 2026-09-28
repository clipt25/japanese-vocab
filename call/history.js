// The conversation so far, newest at the bottom, kept on screen.
//
// Why this exists: on a real call the staff spoke faster than he could read.
// The single-line band replaced the English he was still reading with the next
// sentence, so he was always a sentence behind and never finished one. Here
// every line stays where it is; he reads at his own pace while new lines arrive.
//
// One rule matters more than any other: if he has scrolled up to re-read
// something, new lines must NOT yank him back down. The list follows the newest
// line only while he is already at the bottom; otherwise a "New lines" button
// appears and waits for him.

const FOLLOW_SLACK_PX = 32;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createHistory(list, { jumpButton, onChange } = {}) {
  let following = true;

  const atBottom = () => list.scrollTop + list.clientHeight >= list.scrollHeight - FOLLOW_SLACK_PX;

  function settle() {
    if (following) {
      list.scrollTop = list.scrollHeight;
      if (jumpButton) jumpButton.hidden = true;
    } else if (jumpButton) {
      jumpButton.hidden = false;
    }
    onChange?.(list.children.length);
  }

  list.addEventListener('scroll', () => {
    following = atBottom();
    if (following && jumpButton) jumpButton.hidden = true;
  });
  jumpButton?.addEventListener('click', () => {
    following = true;
    settle();
  });

  function paint(row) {
    const { node, who, ja, en, live } = row;
    node.className = `turn turn--${who}${live ? ' turn--live' : ''}`;
    if (who === 'you') {
      row.en_.textContent = '';
      row.label.textContent = 'You';
    } else {
      row.label.textContent = '';
      row.en_.textContent = en;
    }
    row.ja_.textContent = ja;
  }

  return {
    // who: 'staff' | 'you'. live: the sentence is still being spoken.
    add(who, ja = '', en = '', { live = false } = {}) {
      const node = el('li');
      const row = { node, who, ja, en, live, updatedAt: Date.now(),
        label: el('span', 'turn__who'), en_: el('p', 'turn__en'), ja_: el('p', 'turn__ja') };
      node.append(row.label, row.en_, row.ja_);
      node._row = row;
      paint(row);
      list.append(node);
      settle();
      return row;
    },
    update(row, changes) {
      if (!row) return;
      Object.assign(row, changes, { updatedAt: Date.now() });
      paint(row);
      settle();
    },
    remove(row) {
      row?.node.remove();
      settle();
    },
    clear() {
      list.replaceChildren();
      following = true;
      settle();
    },
    // Safety net: however the pipeline fails, no row may stay "live" on screen.
    // A live row untouched this long is closed; with no English it says so.
    closeStale(maxAgeMs, unclearText) {
      for (const node of list.children) {
        const row = node._row;
        if (!row?.live || Date.now() - row.updatedAt < maxAgeMs) continue;
        this.update(row, { live: false, ...(row.who === 'staff' && !row.en ? { en: unclearText } : {}) });
      }
    },
    get size() { return list.children.length; },
  };
}
