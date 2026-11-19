import app from 'flarum/forum/app';
import Component, { type ComponentAttrs } from 'flarum/common/Component';
import type Mithril from 'mithril';
import type Discussion from 'flarum/common/models/Discussion';
import type PostStreamState from 'flarum/forum/states/PostStreamState';
import type Media from '../models';
import type { DiscussionLink } from '../types';
import Button from 'flarum/common/components/Button';
import Icon from 'flarum/common/components/Icon';
import classList from 'flarum/common/utils/classList';
import extractText from 'flarum/common/utils/extractText';
import MediaHero from './MediaHero';
import { t, text, img, linkFor } from '../util';

// The card's own buttons. The menu offers "details" in their place; what other
// extensions add to the card (Curio's collection, wishlist and owners) it keeps.
const OWN = ['source', 'episode', 'trailer', 'discussShow', 'attribution'];

// Fixed to the bottom of the screen: the button sits above whichever is there.
const BELOW = [
  '.Quickdraw-fab, .MobileTab-bar, .Composer.minimized, .AlertManager .Alert, #bespoke-totop, .Bespoke-toTop',
  '.pl-heads > *, .LobbyShell-dock > *, .ConcourseShell-tabbar, .CookieBanner, .cc-window, #onetrust-banner-sdk',
].join(', ');

/** The bottom of the bar fixed at the top. On phones #header is the drawer; the bar is #app-navigation. */
function topBar() {
  let bottom = 0;
  document.querySelectorAll('#header, #app-navigation').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top <= 1 && r.bottom > 0 && r.height < 160) bottom = Math.max(bottom, r.bottom);
  });
  return bottom;
}

const ICONS: Record<string, string> = {
  movie: 'fas fa-film',
  tv: 'fas fa-tv',
  game: 'fas fa-gamepad',
  music: 'fas fa-compact-disc',
  book: 'fas fa-book',
};

/** The attrs an action button or link may carry. */
interface PlainAttrs {
  title?: Mithril.Children;
  'aria-label'?: Mithril.Children;
  className?: string;
}

/** A plain button or link vnode (a component's tag is its class). */
const isPlain = (vnode: Mithril.Children): vnode is Mithril.Vnode<PlainAttrs> => {
  if (!vnode || typeof vnode !== 'object' || Array.isArray(vnode)) return false;
  const tag = (vnode as Mithril.Vnode).tag as string | { prototype?: unknown };
  return typeof tag === 'string' ? ['a', 'button'].includes(tag) : tag === Button || tag?.prototype instanceof Button;
};

/**
 * Once the card has scrolled away, a button in the corner opens a menu for
 * each of the discussion's titles: back to its card, and what other
 * extensions put on it. Attrs: page (the DiscussionPage), show(media).
 */
/** What the dock reads of the DiscussionPage (core keeps both protected). */
export interface DockPage {
  discussion: Discussion | null;
  stream: PostStreamState | null;
}

export interface TitleDockAttrs extends ComponentAttrs {
  page: DockPage;
  show: (media: Media) => void;
}

/** The discussion's titles, once the linked one's details have loaded. */
interface DockTitles {
  discussion: Discussion;
  main: DiscussionLink;
  related: Media[];
}

export default class TitleDock extends Component<TitleDockAttrs> {
  open!: boolean;
  away!: boolean;
  onMove!: () => void;
  onKey!: (e: KeyboardEvent) => void;
  outside!: (e: PointerEvent) => void;
  onSlid!: (e: TransitionEvent) => void;

  oninit(vnode: Mithril.Vnode<TitleDockAttrs, this>) {
    super.oninit(vnode);
    this.open = false;
    this.away = false;
  }

  oncreate(vnode: Mithril.VnodeDOM<TitleDockAttrs, this>) {
    super.oncreate(vnode);

    let frame = 0;
    this.onMove = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const hero = document.querySelector('.MarqueeHero');
        // Gone once it has slid under the bar at the top.
        const away = !!hero && hero.getBoundingClientRect().bottom < topBar();
        if (away !== this.away) {
          this.away = away;
          if (!away) this.open = false;
          m.redraw();
        }
        this.lift();
      });
    };
    this.onKey = (e) => {
      if (e.key === 'Escape' && this.open) {
        this.open = false;
        m.redraw();
      }
    };
    this.outside = (e) => {
      if (this.open && !this.element.contains(e.target as Node)) {
        this.open = false;
        m.redraw();
      }
    };

    window.addEventListener('scroll', this.onMove, { passive: true });
    window.addEventListener('resize', this.onMove);
    // Quickdraw and tab bars slide into place: measure them again once they have.
    this.onSlid = (e) => {
      if (e.target instanceof Element && e.target.matches(`${BELOW}, .Quickdraw, .MobileTab`)) this.onMove();
    };
    document.addEventListener('transitionend', this.onSlid);
    document.addEventListener('keydown', this.onKey);
    document.addEventListener('pointerdown', this.outside);
    this.onMove();
  }

  onupdate(vnode: Mithril.VnodeDOM<TitleDockAttrs, this>) {
    super.onupdate(vnode);
    this.lift();
  }

  onremove(vnode: Mithril.VnodeDOM<TitleDockAttrs, this>) {
    super.onremove(vnode);
    window.removeEventListener('scroll', this.onMove);
    window.removeEventListener('resize', this.onMove);
    document.removeEventListener('transitionend', this.onSlid);
    document.removeEventListener('keydown', this.onKey);
    document.removeEventListener('pointerdown', this.outside);
  }

  /** Clear of anything fixed to the bottom right: tab bars, banners, Quickdraw's button. */
  lift() {
    if (!this.element) return;
    const height = window.innerHeight;
    let lift = 0;
    document.querySelectorAll(BELOW).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.top > height / 2 && r.right > window.innerWidth - 80) lift = Math.max(lift, height - r.top);
    });
    // acpl/mobile-tab slides away while scrolling down: go by its class, not where it is mid-slide.
    const tab = document.querySelector<HTMLElement>('.MobileTab:not(.MobileTab--hidden)');
    if (tab) lift = Math.max(lift, tab.offsetHeight);
    const dock = this.element as HTMLElement;
    dock.style.setProperty('--marquee-dock-lift', `${lift}px`);

    // The menu opens upward, into the room between the top bar and the button.
    const header = topBar();
    const button = this.element.querySelector('.MarqueeDock-button');
    if (button) dock.style.setProperty('--marquee-dock-room', `${Math.max(160, button.getBoundingClientRect().top - header - 20)}px`);
  }

  titles(): DockTitles | null {
    const discussion = this.attrs.page.discussion;
    const main = discussion && linkFor(discussion);
    if (!main || !main.media.details()) return null;

    const related = (discussion.marqueeRelatedMedia() || []).filter((work): work is Media => !!work && !!work.details());
    return { discussion, main, related };
  }

  view() {
    const titles = this.titles();
    const composing = ['normal', 'fullScreen'].includes(app.composer.position);
    if (!titles || !this.away || composing) return <div className="MarqueeDock is-hidden" />;

    const { main } = titles;
    const label = text('dock.open', { title: main.media.title() });
    const icon = app.forum.attribute('marqueeDockIcon');

    return (
      <div className={classList('MarqueeDock', { 'is-open': this.open })}>
        {this.open ? this.menu(titles) : null}
        <button
          type="button"
          className="MarqueeDock-button"
          aria-expanded={String(this.open)}
          aria-controls="MarqueeDock-menu"
          aria-label={label}
          title={label}
          onclick={() => (this.open = !this.open)}
        >
          {icon || !main.media.poster() ? (
            this.open ? null : (
              <Icon name={icon || ICONS[main.media.kind()] || 'fas fa-film'} />
            )
          ) : (
            <img src={img(main.media.poster(), 'w92')} alt="" />
          )}
          {this.open ? <Icon name="fas fa-xmark" className="MarqueeDock-close" /> : null}
        </button>
      </div>
    );
  }

  menu({ discussion, main, related }: DockTitles) {
    const works: DiscussionLink[] = [main, ...related.map((media) => ({ media, season: null, episode: null, seasonData: null }))];

    return (
      <div className="MarqueeDock-menu Dropdown-menu" id="MarqueeDock-menu" role="menu">
        {works.map((link) => (
          <section className="MarqueeDock-title">
            <h3>
              {link.media.poster() ? <img src={img(link.media.poster(), 'w92')} alt="" /> : null}
              <span>
                {link.media.title()}
                {link.media.year() ? <small>{link.media.year()}</small> : null}
              </span>
            </h3>
            <ul>
              <li>
                <button type="button" className="Button" role="menuitem" onclick={() => this.details(link.media)}>
                  <Icon name="fas fa-circle-info" className="Button-icon" />
                  <span className="Button-label">{t('dock.details')}</span>
                </button>
              </li>
              {this.extras(discussion, link, main).map((item) => (
                <li onclick={() => (this.open = false)}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  /**
   * What other extensions add to this title's card, from the card's own list,
   * so each keeps working as it does there. An icon-only button gets its label.
   */
  extras(discussion: Discussion, link: DiscussionLink, main: DiscussionLink): Mithril.Children[] {
    const card: MediaHero = Object.create(MediaHero.prototype);
    card.attrs = { discussion, link, main };
    card.seasonData = null;

    const items = card.actionItems();
    OWN.forEach((key) => items.has(key) && items.remove(key));

    // Plain buttons and links only: a menu row can't hold a dropdown.
    const list: Mithril.Children[] = items.toArray();
    return list.filter(isPlain).map((vnode) => {
      const attrs: PlainAttrs = vnode.attrs || {};
      const children = vnode.children as Mithril.ChildArray | string | null | undefined;
      if (children && children.length) return vnode;
      const label = attrs.title || attrs['aria-label'];
      return label ? m(vnode.tag, { ...attrs, className: (attrs.className || '').replace('Button--icon', '') }, extractText(label)) : vnode;
    });
  }

  /** Back to the card, showing this title. */
  details(media: Media) {
    this.open = false;
    this.attrs.show(media);

    // Deep in a long discussion, scrolling up loaded every earlier page on the
    // way. Go to the first post as the scrubber does: core loads the posts near
    // it and, with post 1 at the start of the stream, scrolls to the very top.
    const stream = this.attrs.page.stream;
    if (stream) stream.goToFirst();
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
