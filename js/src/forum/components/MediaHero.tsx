import Component, { type ComponentAttrs } from 'flarum/common/Component';
import type Mithril from 'mithril';
import type Discussion from 'flarum/common/models/Discussion';
import type Tag from 'ext:flarum/tags/common/models/Tag';
import type Media from '../models';
import type { DiscussionLink, PickedTitle, Episode, MediaDetails, SeasonData } from '../types';
import ItemList from 'flarum/common/utils/ItemList';
import listItems from 'flarum/common/helpers/listItems';
import classList from 'flarum/common/utils/classList';
import tagsLabel from 'ext:flarum/tags/common/helpers/tagsLabel';
import app from 'flarum/forum/app';
import { t, text, img, sourceName, pickFromMedia, titleFor, titleYear, showSourceLink, backdropColor, backdropTagColor, hexColor } from '../util';
import { loadSeason, primeSeason } from '../api';
import { startDiscussion } from '../utils/startDiscussion';
import Button from 'flarum/common/components/Button';
import isDark from 'flarum/common/utils/isDark';
import { loadedSeasonBrowser, openEpisodeModal, openLinkModal } from './openers';
import { subject, type Subject, type SubjectArgs } from '../subjects';

export type { Subject } from '../subjects';

export interface MediaHeroAttrs extends ComponentAttrs {
  discussion: Discussion;
  /** What this card shows: the linked title, or a related one picked from the row. */
  link: DiscussionLink;
  /** What the discussion is linked to. */
  main: DiscussionLink;
  /** The linked title and its related ones, when there are any. */
  series?: Media[] | null;
  onswitch?: (media: Media) => void;
}

/**
 * Replaces the discussion hero when the discussion is linked to a movie, show
 * (or one season or episode of it) or game. Keeps the core title and badge
 * classes so themes still apply.
 */
export default class MediaHero extends Component<MediaHeroAttrs> {
  seasonData!: SeasonData | null;
  showOther?: boolean;

  oninit(vnode: Mithril.Vnode<MediaHeroAttrs, this>) {
    super.oninit(vnode);

    const { media, season, seasonData } = this.attrs.link;
    primeSeason(media.id(), seasonData);
    this.seasonData = seasonData;

    if (season && !seasonData) {
      loadSeason(media.id(), season).then(
        (data) => {
          this.seasonData = data;
          m.redraw();
        },
        // The card keeps to what the show's details say about the season (an episode's own aren't known).
        () => {}
      );
    }
  }

  /**
   * The buttons under the card. Other extensions add to it: each gets the
   * discussion, the linked media and what this card is about (season, episode).
   */
  actionItems() {
    const { media, season } = this.attrs.link;
    const d = this.details();
    const s = subject(...this.subjectArgs());
    const pick = pickFromMedia(media);
    const ep = this.episode();
    const source = sourceName(media.kind());
    const items = new ItemList<Mithril.Children>();

    // The admin can hide the button; the attribution below always stays (TMDB and IGDB ask for it).
    if (showSourceLink()) {
      items.add(
        'source',
        <a className="Button Button--primary" href={s.url} target="_blank" rel="noopener noreferrer">
          {s.linkLabel || t('hero.view_on', { source })}
        </a>,
        100
      );
    }

    this.addWatchItem(items, d, pick, ep);

    if (season && app.session.user) {
      items.add(
        'discussShow',
        <button type="button" className="Button" onclick={() => startDiscussion(pick)}>
          <i className="fas fa-tv" aria-hidden="true" /> {t('hero.discuss_show')}
        </button>,
        80
      );
    }

    items.add('attribution', this.attribution(d, source), -100);

    return items;
  }

  /** For an episode, its details; otherwise the trailer, if there is one. */
  addWatchItem(items: ItemList<Mithril.Children>, d: MediaDetails, pick: PickedTitle, ep: Episode | null) {
    if (ep) {
      items.add(
        'episode',
        <button type="button" className="Button" onclick={() => openEpisodeModal(pick, this.seasonData!, ep)}>
          <i className="fas fa-info-circle" aria-hidden="true" /> {t('hero.episode_details')}
        </button>,
        90
      );
    } else if (d.trailer) {
      items.add(
        'trailer',
        <a className="Button" href={`https://www.youtube.com/watch?v=${d.trailer}`} target="_blank" rel="noopener noreferrer">
          <i className="fas fa-play" aria-hidden="true" /> {t('hero.trailer')}
        </a>,
        90
      );
    }
  }

  /** Where the data comes from, as the sources ask, and who wrote or translated the description. */
  attribution(d: MediaDetails, source: string) {
    return (
      <span className="MarqueeHero-attribution">
        {t(`hero.attribution_${source.toLowerCase().replace(' ', '_')}`)}
        {d.wikipedia?.url
          ? [
              ' · ',
              t('hero.from_wikipedia', {
                a: <a href={d.wikipedia.url} target="_blank" rel="noopener noreferrer" />,
                license: <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer license" />,
              }),
            ]
          : null}
        {d.translation?.by === 'deepl' ? [' · ', t('hero.translated_deepl')] : null}
      </span>
    );
  }

  /**
   * No description in the data language (no Wikipedia article, no DeepL): say
   * so, and keep the source's English behind a toggle, as Curio does.
   */
  untranslated(s: Subject) {
    const untranslated = s.untranslated!;
    const names = new Intl.DisplayNames([app.translator.getLocale() || 'en'], { type: 'language' });
    const name = (code: string) => {
      try {
        return names.of(code);
      } catch (e) {
        // Not a language code Intl knows: show the code itself.
        return code;
      }
    };
    const other = name(untranslated.have);

    return (
      <div className="MarqueeHero-overview MarqueeHero-overview--missing">
        <p>{t('hero.no_description', { language: name(untranslated.want.split('-')[0]) })}</p>
        <button
          type="button"
          className="Button Button--link"
          aria-expanded={String(!!this.showOther)}
          onclick={() => (this.showOther = !this.showOther)}
        >
          {t(this.showOther ? 'hero.hide_other' : 'hero.show_other', { language: other })}
        </button>
        {this.showOther ? <p lang={untranslated.have}>{s.overview}</p> : null}
      </div>
    );
  }

  /** The discussion's titles (linked one first): picking one shows its card here. */
  series(series: Media[], shown: Media) {
    return (
      <ul className="MarqueeHero-series" aria-label={text('hero.series')}>
        {series.map((work) => (
          <li>
            <button
              type="button"
              className="MarqueeHero-seriesItem"
              aria-pressed={String(work === shown)}
              onclick={() => {
                if (work !== shown) this.attrs.onswitch?.(work);
              }}
            >
              {work.title()}
              {work.year() ? <small>{work.year()}</small> : null}
            </button>
          </li>
        ))}
      </ul>
    );
  }

  /** The card is only drawn once the discussion page has loaded the details (see forum/index). */
  details(): MediaDetails {
    return this.attrs.link.media.details()!;
  }

  episode(): Episode | null {
    const { episode } = this.attrs.link;
    return (episode && this.seasonData?.episodes.find((e) => e.n === episode)) || null;
  }

  subjectArgs(): SubjectArgs {
    const { media, season, episode } = this.attrs.link;
    return [media, this.details(), season, episode, this.seasonData];
  }

  /**
   * The card is titled by the work itself. A discussion renamed to something
   * else ("This indie game is one of my favourites") keeps that as a headline
   * above it. Until an episode's data arrives its title isn't known yet.
   */
  workTitle(): string {
    const { media, season, episode } = this.attrs.link;
    const ep = this.episode();
    // Titles made before the year was switched off still carry it: not a rename.
    return episode && !ep ? this.attrs.discussion.title() : titleFor(pickFromMedia(media), season, ep);
  }

  renamed(workTitle: string): boolean {
    const { media, season } = this.attrs.link;
    const title = this.attrs.discussion.title();
    // A related title picked from the row is checked against the linked one:
    // the discussion is named after that, not renamed (Wlork, Discuss d/40077 #85).
    const main = this.attrs.main;
    return main && main.media !== media
      ? !main.episode && ![false, true].some((year) => titleFor(pickFromMedia(main.media), main.season, null, year) === title)
      : workTitle !== title && titleFor(pickFromMedia(media), season, this.episode(), true) !== title;
  }

  /** Each title on the card may have its own background (uploaded, or none). */
  backdrop(s: Subject): string | null {
    const own = (this.attrs.discussion.attribute<Record<string, string> | null>('marqueeBackdrops') || {})[String(this.attrs.link.media.id())];
    return own === 'none' ? null : own || s.backdrop;
  }

  /**
   * Without an image: the admin's colour, the tag's if chosen (as Flarum's own
   * header), or the forum's banner colour (as the welcome banner).
   */
  color(backdrop: string | null, tags: Tag[]): string | null {
    if (backdrop) return null;
    return (
      backdropColor() ||
      (backdropTagColor() && tags.map((tag) => tag.color()).find(Boolean)) ||
      hexColor(getComputedStyle(document.body).getPropertyValue('--hero-bg').trim())
    );
  }

  tags(): Tag[] {
    const tags = this.attrs.discussion.tags && this.attrs.discussion.tags();
    return (tags || []).filter((tag): tag is Tag => !!tag);
  }

  view() {
    const { discussion, link } = this.attrs;
    const media = link.media;
    const s = subject(...this.subjectArgs());
    const workTitle = this.workTitle();
    const renamed = this.renamed(workTitle);
    const backdrop = this.backdrop(s);
    const color = this.color(backdrop, this.tags());

    return (
      <header
        className={classList('Hero DiscussionHero MarqueeHero', `MarqueeHero--${media.kind()}`, {
          'MarqueeHero--episode': this.episode(),
          'MarqueeHero--renamed': renamed,
          'MarqueeHero--backdrop': !!backdrop,
          'MarqueeHero--color': !!color,
          'MarqueeHero--light': !!color && !isDark(color),
        })}
        style={color ? { '--marquee-bg': color } : undefined}
      >
        {backdrop ? <div className="MarqueeHero-backdrop" style={{ backgroundImage: `url(${backdrop})` }} /> : null}
        {discussion.attribute('canMarqueeLink') ? (
          <Button
            className="Button Button--icon MarqueeHero-edit"
            icon="fas fa-pen"
            aria-label={text('link.edit_card')}
            title={text('link.edit_card')}
            onclick={() => openLinkModal(discussion, media)}
          />
        ) : null}
        <div className="container MarqueeHero-inner">
          {s.poster ? (
            <img className="MarqueeHero-poster" src={img(s.poster, 'w342')} alt="" fetchpriority="high" />
          ) : (
            <span className="MarqueeHero-poster" />
          )}
          <div className="MarqueeHero-body">{this.body(s, workTitle, renamed)}</div>
        </div>
      </header>
    );
  }

  /** Everything beside the poster, top to bottom. */
  body(s: Subject, workTitle: string, renamed: boolean) {
    const { link, series } = this.attrs;
    const pick = pickFromMedia(link.media);
    const title = this.attrs.discussion.title();

    return [
      this.heroItems(),
      renamed ? <h1 className="MarqueeHero-headline">{title}</h1> : null,
      renamed ? <h2 className="DiscussionHero-title">{workTitle}</h2> : <h1 className="DiscussionHero-title">{workTitle}</h1>,
      <ul className="MarqueeHero-meta">
        {s.meta.filter(Boolean).map((part) => (
          <li>{part}</li>
        ))}
      </ul>,

      series ? this.series(series, link.media) : null,

      <div className="MarqueeHero-scores">{s.score}</div>,

      this.credits(s),

      this.overview(s),

      s.extra || null,

      this.people(s),

      pick.seasons && pick.seasons.length ? this.seasonBrowser(pick) : null,

      <div className="MarqueeHero-links">{this.actionItems().toArray()}</div>,
    ];
  }

  /** Core's tags and badges, and for a season or episode the show it belongs to. */
  heroItems() {
    const { discussion, link } = this.attrs;
    const { media, season } = link;
    const badges = discussion.badges().toArray();
    const tags = discussion.tags && discussion.tags();

    return (
      <ul className="DiscussionHero-items">
        {tags && tags.length ? <li className="item-tags">{tagsLabel(tags, { link: true })}</li> : null}
        {badges.length ? (
          <li className="item-badges">
            <ul className="DiscussionHero-badges badges">{listItems(badges)}</ul>
          </li>
        ) : null}
        {season ? (
          <li className="MarqueeHero-parent">
            <i className="fas fa-tv" aria-hidden="true" /> {media.year() && titleYear() ? `${media.title()} (${media.year()})` : media.title()}
          </li>
        ) : null}
      </ul>
    );
  }

  credits(s: Subject) {
    if (!s.credits.length) return null;

    return (
      <dl className="MarqueeHero-credits">
        {s.credits.map(([k, v]) => (
          <div>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    );
  }

  overview(s: Subject) {
    if (s.overview && s.untranslated) return this.untranslated(s);
    return s.overview ? <p className="MarqueeHero-overview">{s.overview}</p> : null;
  }

  people(s: Subject) {
    if (!s.people || !s.people[1] || !s.people[1].length) return null;
    const [heading, people] = s.people;

    return (
      <div>
        <h2 className="MarqueeHero-sectionTitle">{heading}</h2>
        <ul className="MarqueeHero-cast">
          {people.map((c) => (
            <li>
              {c.photo ? <img src={img(c.photo, 'w185')} alt="" loading="lazy" decoding="async" /> : <span className="Marquee-noPhoto" />}
              <b>{c.name}</b>
              <span>{c.role}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /** A show's seasons, once their chunk has loaded. */
  seasonBrowser(pick: PickedTitle) {
    const SeasonBrowser = loadedSeasonBrowser();
    const { season, episode } = this.attrs.link;
    return SeasonBrowser ? <SeasonBrowser link={pick} season={season} episode={episode} /> : null;
  }
}
