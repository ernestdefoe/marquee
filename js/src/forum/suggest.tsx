import KeyboardNavigatable from 'flarum/common/utils/KeyboardNavigatable';
import classList from 'flarum/common/utils/classList';
import { text, img, pad, date, runtime } from './util';
import { loadSeason } from './api';
import { showFor } from './refs';
import type TextEditor from 'flarum/common/components/TextEditor';
import type ComposerState from 'flarum/forum/states/ComposerState';
import type EditorDriverInterface from 'flarum/common/utils/EditorDriverInterface';
import type { SeasonData, SeasonSummary } from './types';
import { composerFields } from './util';

// "S2", "s02e", "S2E1"… right before the cursor, at the start of a word.
const TYPED = /(?:^|[\s(["'])([Ss](\d{1,2})(?:[Ee](\d{0,3}))?)$/;

/** Which show the post being written is about. */
interface ShowContext {
  mediaId: string | null | undefined;
  seasons: SeasonSummary[];
}

/** One row of the list: what it inserts and how it looks. */
interface SuggestItem {
  insert: string;
  label: string;
  detail: string;
  image: string | null;
}

/** Which show the post being written is about, as { mediaId, seasons }. */
function showContext(composer: ComposerState): ShowContext | null {
  const attrs = composer.body?.attrs || {};
  const discussion = attrs.discussion || attrs.post?.discussion?.();
  const link = showFor(discussion);
  if (link) return { mediaId: link.media.id(), seasons: link.media.details()?.seasons || [] };

  // A new discussion about a show picked in the composer.
  const picked = composerFields(composer).marquee;
  if (picked && picked.kind === 'tv' && picked.id && picked.seasons) return { mediaId: picked.id, seasons: picked.seasons };

  return null;
}

/**
 * Season and episode autocomplete in the post editor: typing S2E in a
 * discussion about a show lists that season's episodes.
 */
class Suggest {
  items: SuggestItem[] = [];
  index = 0;
  active = false;
  start = 0;
  typed: string | null = null;
  cursor: number | null = null;
  readonly editor: TextEditor;
  readonly container: HTMLDivElement;

  constructor(editor: TextEditor) {
    this.editor = editor;
    const $editor = editor.$('.TextEditor-editor');
    this.container = document.createElement('div');
    this.container.className = 'MarqueeSuggestContainer';
    $editor.after(this.container);

    new KeyboardNavigatable()
      .when(() => this.active)
      .onUp(() => this.move(-1))
      .onDown(() => this.move(1))
      .onSelect(() => this.choose(this.items[this.index]))
      .onCancel(() => this.hide())
      .bindTo($editor);
  }

  composer(): ComposerState {
    // Core types a TextEditor's attrs loosely; the composer always passes itself.
    return (this.editor.attrs as { composer: ComposerState }).composer;
  }

  api(): EditorDriverInterface {
    // The editor is built (onbuild) before any input reaches this.
    return this.composer().editor!;
  }

  move(by: number) {
    this.index = (this.index + by + this.items.length) % this.items.length;
    this.render();
  }

  hide() {
    this.active = false;
    this.typed = null;
    m.render(this.container, null);
  }

  choose(item: SuggestItem | undefined) {
    if (!item) return;
    this.api().replaceBeforeCursor(this.start, item.insert + ' ', false);
    this.hide();
  }

  render() {
    // Nothing to show yet (episodes still loading): close the list but keep
    // what was typed, so the arrow-key guard in update() still recognises it.
    if (!this.items.length) {
      this.active = false;
      return m.render(this.container, null);
    }
    this.active = true;
    m.render(this.container, this.list());
    this.position();
  }

  list() {
    return (
      <ul className="Dropdown-menu MarqueeSuggest" role="listbox">
        {this.items.map((item, i) => (
          <li
            role="option"
            aria-selected={String(i === this.index)}
            className={classList('MarqueeSuggest-item', { active: i === this.index })}
            onmousedown={(e: MouseEvent) => {
              e.preventDefault();
              this.choose(item);
            }}
            onmouseenter={() => {
              this.index = i;
              this.render();
            }}
          >
            {item.image ? <img src={item.image} alt="" loading="lazy" decoding="async" /> : <span className="Marquee-noStill" />}
            <span>
              <b>{item.label}</b>
              <small>{item.detail}</small>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  /** Under the caret, or above it when the editor has no room below. */
  position() {
    const caret = this.api().getCaretCoordinates(this.start);
    const menu = this.container.firstChild as HTMLElement;
    const parent = (this.container.offsetParent || this.container.parentNode) as HTMLElement;
    const top = caret.top + 18 + menu.offsetHeight > parent.clientHeight ? caret.top - menu.offsetHeight - 6 : caret.top + 18;
    menu.style.left = `${Math.max(0, Math.min(caret.left, parent.clientWidth - menu.offsetWidth))}px`;
    menu.style.top = `${top}px`;
  }

  /** Runs on every input: offer the season typed before the cursor, then its episodes. */
  update() {
    const api = this.api();
    const context = showContext(this.composer());
    const [cursor, end] = api.getSelectionRange();
    const match = context && cursor === end ? TYPED.exec(api.getLastNChars(12)) : null;
    if (!context || !match) return this.hide();

    const [, typed, seasonDigits, episodeDigits] = match;

    // Arrow keys also reach this listener: same text, keep the highlighted row.
    if (this.active && typed === this.typed && cursor === this.cursor) return;
    this.typed = typed;
    this.cursor = cursor;
    const season = context.seasons.find((s) => s.number === parseInt(seasonDigits, 10));
    if (!season) return this.hide();

    this.start = cursor - typed.length;
    this.index = 0;

    const seasonItem: SuggestItem = {
      insert: `S${pad(season.number)}`,
      label: season.name,
      detail: text('meta.episodes_count', { count: season.episodes }),
      image: img(season.poster, 'w92'),
    };

    // Until the season's episodes arrive, offer the season itself.
    this.items = episodeDigits === undefined ? [seasonItem] : [];
    this.render();

    loadSeason(context.mediaId, season.number).then(
      (data) => this.episodesArrived(data, season, typed, seasonItem, episodeDigits),
      // The season item (if any) stays offered; nothing else to show.
      () => {}
    );
  }

  episodesArrived(data: SeasonData, season: SeasonSummary, typed: string, seasonItem: SuggestItem, episodeDigits: string | undefined) {
    const prefix = episodeDigits || '';
    const episodes = data.episodes
      .filter((e) => !prefix || String(e.n).startsWith(String(parseInt(prefix, 10))))
      .slice(0, 8)
      .map((e): SuggestItem => ({
        insert: `S${pad(season.number)}E${pad(e.n)}`,
        label: text('meta.episode_label', { episode: pad(e.n), name: e.title }),
        detail: [date(e.date), runtime(e.runtime)].filter(Boolean).join(' · '),
        image: img(e.still, 'w300'),
      }));

    // Still typing the same reference?
    const again = TYPED.exec(this.api().getLastNChars(12));
    if (!again || again[1] !== typed) return;

    this.items = episodeDigits === undefined ? [seasonItem, ...episodes] : episodes;
    this.render();
  }
}

/**
 * Season and episode autocomplete in the post editor: typing S2E in a
 * discussion about a show lists that season's episodes. Returns the input
 * listener.
 */
export function attachSuggest(editor: TextEditor): () => void {
  const suggest = new Suggest(editor);
  return () => suggest.update();
}
