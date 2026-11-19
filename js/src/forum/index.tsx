import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import DiscussionHero from 'flarum/forum/components/DiscussionHero';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import DiscussionListState from 'flarum/forum/states/DiscussionListState';
import Link from 'flarum/common/components/Link';
import Button from 'flarum/common/components/Button';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';
import MediaHero from './components/MediaHero';
import TitlePicker from './components/TitlePicker';
import TitleDock from './components/TitleDock';
import ScopePicker from './components/ScopePicker';
import { t, img, pad, sourceName, kindForTags, linkFor, titleFor, composerFields } from './util';
import type { MarqueeFields } from './util';
import { openLinkModal } from './components/openers';
import type Mithril from 'mithril';
import type ItemList from 'flarum/common/utils/ItemList';
import type Discussion from 'flarum/common/models/Discussion';
import type ComposerState from 'flarum/forum/states/ComposerState';
import type PostStreamState from 'flarum/forum/states/PostStreamState';
import type TextEditor from 'flarum/common/components/TextEditor';
import type PostStreamScrubber from 'flarum/forum/components/PostStreamScrubber';
import type { IComposerBodyAttrs } from 'flarum/forum/components/ComposerBody';
import type Media from './models';
import type { DiscussionLink, PickedTitle } from './types';
import { applyPrefill } from './utils/startDiscussion';
import CommentPost from 'flarum/forum/components/CommentPost';
import { decorate } from './refs';
import { attachSuggest } from './suggest';
// Registered for companion extensions (ext:ernestdefoe/marquee/forum/utils/posterUrl).
import './utils/posterUrl';

export { default as extend } from './extend';

/** Which title of a discussion's series its card shows, by discussion id. */
const shownTitle = new Map<string | undefined, string | undefined>();

/**
 * What the composer extends read of DiscussionComposer. It is a lazy chunk,
 * extended by module name; core keeps `composer` protected and doesn't type
 * `titlePlaceholder`.
 */
interface MarqueeComposer {
  composer: ComposerState;
  attrs: IComposerBodyAttrs & { titlePlaceholder?: string };
  /** Added by flarum/tags: opens its tag picker. */
  chooseTags?: () => void;
  onkeydown(e: KeyboardEvent): void;
  oncreate(vnode: Mithril.VnodeDOM): void;
  headerItems(): ItemList<Mithril.Children>;
  data(): Record<string, unknown>;
}

/** What the corner button reads of DiscussionPage (core keeps both protected). */
interface MarqueePage {
  discussion: Discussion | null;
  stream: PostStreamState | null;
  /** The corner button's root on <body>. */
  marqueeDock?: HTMLElement;
  oncreate(vnode: Mithril.VnodeDOM): void;
  onremove(vnode: Mithril.VnodeDOM): void;
}

/** The composer's title field: it searches the tag's source, if it has one. */
function titleField(composer: MarqueeComposer, fields: MarqueeFields) {
  return (
    <TitlePicker
      value={fields.title()}
      oninput={(value: string) => fields.title(value)}
      kind={kindForTags(fields.tags)}
      linked={!!fields.marquee}
      onpick={(picked: PickedTitle) => {
        fields.marquee = picked;
        fields.title(titleFor(picked));
      }}
      onlookup={(link: PickedTitle, before: PickedTitle) => {
        // Albums: search has no year. Add it, unless the title was edited meanwhile.
        if (fields.title() === titleFor(before)) fields.title(titleFor(link));
      }}
      onkeydown={composer.onkeydown.bind(composer)}
      placeholder={composer.attrs.titlePlaceholder}
      disabled={!!composer.attrs.disabled}
      inputClassName="DiscussionComposer-title"
      focusOnKind
    />
  );
}

/** "Linked to …" under the title, with a button to remove the link. */
function linkedChip(fields: MarqueeFields, link: PickedTitle) {
  return (
    <span className="Marquee-linked">
      {link.poster ? <img src={img(link.poster, 'w92')} alt="" /> : null}
      {t('composer.linked', { title: <b>{link.title}</b>, source: sourceName(link.kind) })}
      <button
        type="button"
        className="Button Button--icon Button--link"
        aria-label={t('composer.remove_link')}
        onclick={() => (fields.marquee = null)}
      >
        <i className="fas fa-times" aria-hidden="true" />
      </button>
    </span>
  );
}

/** The title picker, the linked title and its season or episode in the new-discussion composer. */
function extendComposer() {
  // The composer is a lazy chunk in Flarum 2, so extend it by module path.
  // The tag comes first: it decides whether the title field searches a source.
  extend<MarqueeComposer, 'oncreate'>('flarum/forum/components/DiscussionComposer', 'oncreate', function () {
    applyPrefill(this.composer);
    app.tagList.load(['parent']).then(() => {
      const tags = composerFields(this.composer).tags || [];
      if (!tags.length && this.chooseTags) this.chooseTags();
    });
  });

  extend<MarqueeComposer, 'headerItems'>('flarum/forum/components/DiscussionComposer', 'headerItems', function (items) {
    const fields = composerFields(this.composer);

    // A link only stands while its tag does.
    if (fields.marquee && fields.marquee.kind !== kindForTags(fields.tags)) fields.marquee = null;

    items.setContent('discussionTitle', titleField(this, fields));

    const link = fields.marquee;
    if (!link) return;

    items.add('marquee', linkedChip(fields, link), -10);

    if (link.seasons && link.seasons.length) {
      items.add('marqueeScope', <ScopePicker link={link} onchange={(l: PickedTitle) => fields.title(titleFor(l, l.season, l.episode))} />, -20);
    }
  });

  extend<MarqueeComposer, 'data'>('flarum/forum/components/DiscussionComposer', 'data', function (data) {
    const link = composerFields(this.composer).marquee;
    if (link) {
      data.marquee = { kind: link.kind, id: link.externalId, season: link.season || null, episode: link.episode ? link.episode.n : null };
    }
  });
}

/** Season and episode chips in posts, and their autocomplete in the editor. */
function extendPosts() {
  // Season and episode references in posts become chips (TV discussions only).
  extend(CommentPost.prototype, ['oncreate', 'onupdate'], function () {
    decorate(this.element.querySelector('.Post-body'), this.attrs.post.discussion());
  });

  // …and the post editor suggests them as you type S2E.
  extend<TextEditor, 'onbuild'>('flarum/common/components/TextEditor', 'onbuild', function () {
    this.marqueeSuggest = attachSuggest(this);
  });
  extend<TextEditor, 'buildEditorParams'>('flarum/common/components/TextEditor', 'buildEditorParams', function (params) {
    // Core types the list as never[]; it holds the editor's input listeners.
    (params.inputListeners as (() => void)[]).push(() => this.marqueeSuggest && this.marqueeSuggest());
  });
}

/** The linked titles come with every page of the discussion list. */
function extendListRequests() {
  // The list's own requests (Load more, a tag page opened in the forum) name
  // their includes, so the server's default include doesn't apply to them.
  extend(DiscussionListState.prototype, 'requestParams', function (params) {
    if (typeof params.include === 'string') params.include = [params.include];
    if (Array.isArray(params.include)) params.include.push('marqueeMedia');
  });
}

/** The discussion menu's Add / Change linked title. */
function extendControls() {
  // Change or remove the link on a posted discussion: "Change the linked title of
  // any discussion", or an author who may rename theirs and has "...of their own".
  extend(DiscussionControls, 'moderationControls', function (items, discussion) {
    if (!discussion.attribute('canMarqueeLink') || !(kindForTags(discussion.tags()) || linkFor(discussion))) return;

    items.add(
      'marquee',
      <Button icon="fas fa-link" onclick={() => openLinkModal(discussion)}>
        {t(linkFor(discussion) ? 'link.change' : 'link.add')}
      </Button>,
      -10
    );
  });
}

/** The post scrubber's height beside a tall card. */
function extendScrubber() {
  // Core sizes the scrubber from where it sits on load, below the hero, so a
  // tall card left it a sliver. Size it from where it sits once the sidebar
  // sticks under the header instead.
  extend<PostStreamScrubber, 'onresize'>('flarum/forum/components/PostStreamScrubber', 'onresize', function () {
    const nav = this.element.closest<HTMLElement>('.DiscussionPage-nav');
    if (!nav || !document.querySelector('.MarqueeHero') || getComputedStyle(nav).position !== 'sticky') return;

    const scrollbar = this.element.querySelector<HTMLElement>('.Scrubber-scrollbar')!;
    const stuckTop = parseFloat(getComputedStyle(nav).top) + parseFloat(getComputedStyle(nav).paddingTop);
    const above = this.element.getBoundingClientRect().top - nav.getBoundingClientRect().top - parseFloat(getComputedStyle(nav).paddingTop);
    const chrome = (this.element as HTMLElement).offsetHeight - scrollbar.offsetHeight;
    const appPadding = parseInt(getComputedStyle(document.getElementById('app')!).paddingBottom, 10) || 0;

    scrollbar.style.maxHeight = Math.max(100, window.innerHeight - stuckTop - above - chrome - appPadding) + 'px';
  });
}

/** The card in place of the discussion hero. */
function extendHero() {
  // The full card needs the details the discussion page loads; until they
  // arrive (or for a discussion with no link) the normal hero shows. With
  // related titles (the rest of a series) the card carries a row of them, and
  // picking one shows that title's card in place, the linked one until then.
  override<DiscussionHero, 'view'>(DiscussionHero.prototype, 'view', function (original) {
    const discussion = this.attrs.discussion;
    const main = linkFor(discussion);
    if (!main || !main.media.details()) return original();

    const related = (discussion.marqueeRelatedMedia() || []).filter((work): work is Media => !!work && !!work.details());
    const series = related.length ? [main.media, ...related] : null;
    const picked = series && series.find((work) => work.id() === shownTitle.get(discussion.id()) && work !== main.media);
    const link: DiscussionLink = picked ? { media: picked, season: null, episode: null, seasonData: null } : main;

    return (
      <MediaHero
        key={[link.media.id(), link.season, link.episode].join(':')}
        discussion={discussion}
        link={link}
        series={series}
        main={main}
        onswitch={(media: Media) => shownTitle.set(discussion.id(), media.id())}
      />
    );
  });
}

/** The corner button that brings the card's actions back. */
function extendDock() {
  // Once the card has scrolled away, a corner button brings its actions back.
  // It lives on <body>, so a theme that transforms the page can't trap it.
  extend<MarqueePage, 'oncreate'>('flarum/forum/components/DiscussionPage', 'oncreate', function () {
    if (app.forum.attribute('marqueeDock') === false) return;
    const page = this;
    this.marqueeDock = document.body.appendChild(document.createElement('div'));
    m.mount(this.marqueeDock, {
      view: () => (
        <TitleDock
          page={page}
          show={(media: Media) => {
            const discussion = page.discussion!;
            const main = linkFor(discussion);
            if (main && media === main.media) shownTitle.delete(discussion.id());
            else shownTitle.set(discussion.id(), media.id());
          }}
        />
      ),
    });
  });

  extend<MarqueePage, 'onremove'>('flarum/forum/components/DiscussionPage', 'onremove', function () {
    if (!this.marqueeDock) return;
    m.mount(this.marqueeDock, null);
    this.marqueeDock.remove();
  });
}

/** A poster beside each linked discussion in the list. */
function extendListPoster() {
  extend(DiscussionListItem.prototype, 'authorItems', function (items) {
    const discussion = this.attrs.discussion;
    const link = linkFor(discussion);
    // The admin can turn list posters off (e.g. when FoF Discussion Thumbnail draws its own).
    if (!link || !link.media.poster() || app.forum.attribute('marqueeListPosters') === false) return;

    items.add(
      'marqueePoster',
      <Link
        className={`Marquee-listPoster Marquee-listPoster--${link.media.kind()}`}
        href={app.route.discussion(discussion)}
        tabindex="-1"
        aria-hidden="true"
      >
        <img src={img(link.media.poster(), 'w92')} alt="" loading="lazy" decoding="async" />
      </Link>,
      95
    );
  });
}

/** What the list says about the linked title. */
function extendListMeta() {
  extend(DiscussionListItem.prototype, 'infoItems', function (items) {
    // The admin picks what the list says: "Game · 2026", "2026" or nothing. A
    // season or episode code shows under the first two, as it says which part is meant.
    const show = app.forum.attribute('marqueeListMeta') || 'kind_year';
    const link = linkFor(this.attrs.discussion);
    if (!link || show === 'none') return;

    const year = link.media.year();
    let label: Mithril.Children;
    if (link.episode) label = t('list.episode', { season: pad(link.season), episode: pad(link.episode) });
    else if (link.season) label = t('list.season', { number: link.season });
    else if (show === 'year') label = year;
    else label = [t(`kind.${link.media.kind()}`), year ? ` · ${year}` : ''];
    if (!label) return;

    items.add('marquee', <span className="Marquee-listMeta">{label}</span>, 5);
  });
}

app.initializers.add('ernestdefoe-marquee', () => {
  extendComposer();
  extendPosts();
  extendListRequests();
  extendControls();
  extendScrubber();
  extendHero();
  extendDock();
  extendListPoster();
  extendListMeta();
});
