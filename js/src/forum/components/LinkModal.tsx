import app from 'flarum/forum/app';
import FormModal, { type IFormModalAttrs } from 'flarum/common/components/FormModal';
import type Mithril from 'mithril';
import type Discussion from 'flarum/common/models/Discussion';
import type RequestError from 'flarum/common/utils/RequestError';
import type Media from '../models';
import Button from 'flarum/common/components/Button';
import Switch from 'flarum/common/components/Switch';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import classList from 'flarum/common/utils/classList';
import TitlePicker from './TitlePicker';
import ScopePicker from './ScopePicker';
import { t, text, img, sourceName, kindForTags, linkFor, pickFromMedia, titleFor } from '../util';
import { loadSeason } from '../api';
import type { DiscussionLink, PickedTitle } from '../types';

export interface LinkModalAttrs extends IFormModalAttrs {
  discussion: Discussion;
  /** Opened from the card: the title it shows. */
  media?: Media;
}

/** Each title's background by media id: 'none' or an uploaded image's address. */
type Backdrops = Record<string, string>;

/** A background choice: the source's (null), none, or an uploaded image. */
type BackdropChoice = null | 'none' | 'own';

/**
 * Change what a posted discussion is linked to: pick a different title (and,
 * for a show, a season or episode), or remove the link. Optionally renames the
 * discussion to match. Uses the same permission as renaming.
 */
export default class LinkModal extends FormModal<LinkModalAttrs> {
  query!: string;
  rename!: boolean;
  saving!: boolean;
  uploading!: boolean;
  deleting!: boolean;
  loadingFull?: boolean;
  kind?: string;
  link!: PickedTitle | null;
  current!: DiscussionLink | null;
  related!: PickedTitle[];
  relatedQuery!: string;
  savedBackdrops!: Backdrops;
  backdrops!: Backdrops;
  backdropFor?: string;

  oninit(vnode: Mithril.Vnode<LinkModalAttrs, this>) {
    super.oninit(vnode);

    this.query = '';
    this.rename = true;
    this.saving = false;
    this.uploading = false;
    this.deleting = false;

    // The discussion list doesn't carry the related titles or backgrounds, so
    // opened from there it loads them first: saving without them would wipe
    // the related titles, and an uploaded image wouldn't show.
    const discussion = this.attrs.discussion;
    if (discussion.attribute('marqueeBackdrops') === undefined) {
      this.loadingFull = true;
      app.store
        .find<Discussion>('discussions', discussion.id()!, { include: 'marqueeMedia,marqueeRelatedMedia' })
        .then(
          () => this.setup(),
          // Core has already alerted the failed request; without the discussion there is nothing to edit.
          () => this.hide()
        )
        .finally(() => {
          this.loadingFull = false;
          m.redraw();
        });
    } else {
      this.setup();
    }
  }

  /** The form's fields, from the discussion as it is now. */
  setup() {
    const discussion = this.attrs.discussion;
    const current = linkFor(discussion);

    this.kind = kindForTags(discussion.tags()) || current?.media.kind();
    this.link = current
      ? { ...pickFromMedia(current.media), season: current.season, episode: current.episode ? { n: current.episode } : null }
      : null;
    this.current = current;
    this.nameEpisode();

    // The rest of a series, shown as a row on the card (picked by hand).
    this.related = (discussion.marqueeRelatedMedia() || []).filter((media): media is Media => !!media).map(pickFromMedia);
    this.relatedQuery = '';

    // Each title's background: 'none' or an uploaded image's address; a title
    // not in it has the source's. Opened from the card: the title it shows.
    this.savedBackdrops = discussion.attribute<Backdrops | null>('marqueeBackdrops') || {};
    this.backdrops = { ...this.savedBackdrops };
    this.backdropFor = (this.attrs.media || current?.media)?.id();
  }

  /** The page knows the linked episode's number; its name comes from the season. */
  nameEpisode() {
    const current = this.current;
    if (!current || !current.season || !current.episode) return;

    loadSeason(current.media.id(), current.season).then(
      (season) => {
        const episode = season.episodes.find((e) => e.n === current.episode);
        if (episode && this.link && this.link.episode && this.link.episode.n === episode.n) {
          this.link.episode = episode;
          m.redraw();
        }
      },
      // The episode keeps its number; saving then leaves the title as it is (see onsubmit).
      () => {}
    );
  }

  className() {
    // Wide enough for a result's full title, developer and platforms.
    return 'MarqueeLinkModal';
  }

  title() {
    return t('link.title');
  }

  content() {
    if (this.loadingFull) {
      return (
        <div className="Modal-body">
          <LoadingIndicator display="block" />
        </div>
      );
    }

    const link = this.link;

    return (
      <div className="Modal-body">
        <div className="Form">
          <div className="Form-group">{link ? this.currentLink(link) : <p className="helpText">{t('link.none')}</p>}</div>

          {this.kind ? this.searchField(this.kind) : null}

          {link && this.kind ? this.relatedField() : null}

          {link && link.seasons && link.seasons.length ? (
            <div className="Form-group">
              <ScopePicker link={link} onchange={() => m.redraw()} />
            </div>
          ) : null}

          {link && this.current && link.externalId === pickFromMedia(this.current.media).externalId ? this.backdropField() : null}

          {link ? (
            <div className="Form-group">
              <Switch state={this.rename} onchange={(value: boolean) => (this.rename = value)}>
                {t('link.rename', { title: <b>{titleFor(link, link.season, link.episode)}</b> })}
              </Switch>
            </div>
          ) : null}

          <div className="Form-group">
            <Button className="Button Button--primary Button--block" type="submit" loading={this.saving}>
              {t('link.save')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /** What the discussion is linked to now, with a button to remove it. */
  currentLink(link: PickedTitle) {
    return (
      <div className="MarqueeLinkModal-current">
        {link.poster ? <img src={img(link.poster, 'w92')} alt="" /> : <span className="Marquee-noPoster" />}
        <span>
          <b>{link.year ? `${link.title} (${link.year})` : link.title}</b>
          <small>{sourceName(link.kind)}</small>
        </span>
        <Button className="Button Button--link" icon="fas fa-times" onclick={() => (this.link = null)}>
          {t('link.remove')}
        </Button>
      </div>
    );
  }

  /** Search the tag's source for a different title. */
  searchField(kind: string) {
    return (
      <div className="Form-group">
        <label>{t('link.search_label')}</label>
        <TitlePicker
          wrapper="div"
          value={this.query}
          oninput={(value: string) => (this.query = value)}
          kind={kind}
          linked={false}
          onpick={(picked: PickedTitle) => {
            this.link = picked;
            this.nameEpisode();
            this.query = '';
          }}
        />
      </div>
    );
  }

  /** The titles on the card as saved, still on it: the linked one, then its related titles. */
  backdropTitles(): Media[] {
    const kept = (media: Media) => this.related.some((r) => r.kind === media.kind() && r.externalId === media.externalId());
    const related = (this.attrs.discussion.marqueeRelatedMedia() || []).filter((media): media is Media => !!media && kept(media));
    return [this.current!.media, ...related];
  }

  /** A title's background: the source's, none, or an uploaded image. */
  backdropField() {
    const titles = this.backdropTitles();
    if (!titles.some((media) => media.id() === this.backdropFor)) this.backdropFor = titles[0].id();
    const id = this.backdropFor!;
    const value = this.backdrops[id] ?? null;
    const own = !!value && value !== 'none';

    return (
      <div className="Form-group MarqueeLinkModal-backdrop">
        <label>{t('link.backdrop_label')}</label>
        {titles.length > 1 ? (
          <select
            className="FormControl"
            aria-label={text('link.backdrop_for')}
            value={id}
            onchange={(e: Event) => (this.backdropFor = (e.target as HTMLSelectElement).value)}
          >
            {titles.map((media) => (
              <option value={media.id()}>{media.year() ? `${media.title()} (${media.year()})` : media.title()}</option>
            ))}
          </select>
        ) : null}
        <div className="ButtonGroup">
          {this.backdropChoice(id, null, t('link.backdrop_default'))}
          {this.backdropChoice(id, 'none', t('link.backdrop_none'))}
          {this.backdropChoice(id, 'own', t('link.backdrop_own'))}
        </div>
        {own ? <img className="MarqueeLinkModal-backdropPreview" src={value} alt="" /> : null}
        <input
          className="MarqueeLinkModal-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onchange={(e: Event) => this.upload(e.target as HTMLInputElement, id)}
        />
        {this.backdropActions(id, value, own)}
        <p className="helpText">{t('link.backdrop_help')}</p>
      </div>
    );
  }

  /** Opens the file picker for an uploaded background. */
  pickFile() {
    this.element.querySelector<HTMLInputElement>('.MarqueeLinkModal-file')!.click();
  }

  backdropChoice(id: string, choice: BackdropChoice, label: Mithril.Children) {
    const value = this.backdrops[id] ?? null;
    const pressed = choice === 'own' ? !!value && value !== 'none' : value === choice;

    return (
      <Button
        className={classList('Button', { active: pressed })}
        aria-pressed={String(pressed)}
        onclick={() => {
          if (choice === 'own') this.pickFile();
          else if (choice === null) delete this.backdrops[id];
          else this.backdrops[id] = choice;
        }}
      >
        {label}
      </Button>
    );
  }

  /** Upload (or replace) the image, and delete one that is saved. */
  backdropActions(id: string, value: string | null, own: boolean) {
    return (
      <div className="MarqueeLinkModal-backdropActions">
        <Button className="Button" icon="fas fa-upload" loading={this.uploading} onclick={() => this.pickFile()}>
          {own ? t('link.backdrop_replace') : t('link.backdrop_upload')}
        </Button>
        {own && this.savedBackdrops[id] === value ? (
          <Button className="Button Button--danger" icon="fas fa-trash-alt" loading={this.deleting} onclick={() => this.deleteImage(id)}>
            {t('link.backdrop_delete')}
          </Button>
        ) : null}
      </div>
    );
  }

  /** The background as saved, now that an upload or a delete has changed it. */
  savedAs(backdrops: Backdrops | null | undefined, id: string) {
    this.savedBackdrops = backdrops || {};
    if (this.savedBackdrops[id]) this.backdrops[id] = this.savedBackdrops[id];
    else delete this.backdrops[id];
  }

  upload(input: HTMLInputElement, id: string) {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;

    const body = new FormData();
    body.append('backdrop', file);
    body.append('media', id);
    this.uploading = true;
    m.redraw();

    app
      .request<{ data: { backdrops: Backdrops | null } }>({
        method: 'POST',
        url: `${app.forum.attribute('apiUrl')}/marquee/discussions/${this.attrs.discussion.id()}/backdrop`,
        serialize: (raw: FormData) => raw,
        body,
      })
      .then(
        (response) => {
          this.savedAs(response.data.backdrops, id);
          this.attrs.discussion.pushAttributes({ marqueeBackdrops: this.savedBackdrops });
          app.alerts.show({ type: 'success' }, text('link.backdrop_uploaded'));
        },
        // Core's request error handler has already alerted (too large, wrong type…).
        () => {}
      )
      .finally(() => {
        this.uploading = false;
        m.redraw();
      });
  }

  /** Deleted at once, as an upload is saved at once: the file goes with it. */
  deleteImage(id: string) {
    this.deleting = true;
    this.attrs.discussion
      .save({ marqueeBackdrops: { [id]: null } })
      .then(
        () => {
          this.savedAs(this.attrs.discussion.attribute<Backdrops | null>('marqueeBackdrops'), id);
          app.alerts.show({ type: 'success' }, text('link.backdrop_deleted'));
        },
        // Core's request error handler has already alerted.
        () => {}
      )
      .finally(() => {
        this.deleting = false;
        m.redraw();
      });
  }

  /** Related titles: the other games (films, seasons…) of a series, in the card's order. */
  relatedField() {
    const link = this.link!;
    const taken = (r: PickedTitle) =>
      (r.kind === link.kind && r.externalId === link.externalId) || this.related.some((o) => o.kind === r.kind && o.externalId === r.externalId);

    return (
      <div className="Form-group MarqueeLinkModal-related">
        <label>{t('link.related_label')}</label>
        <p className="helpText">{t('link.related_help')}</p>
        {this.related.length ? (
          <ul className="MarqueeLinkModal-relatedList">
            {this.related.map((r, i) => (
              <li>
                {r.poster ? <img src={img(r.poster, 'w92')} alt="" /> : <span className="Marquee-noPoster" />}
                <span>{r.year ? `${r.title} (${r.year})` : r.title}</span>
                <Button
                  className="Button Button--icon Button--link"
                  icon="fas fa-times"
                  aria-label={text('link.related_remove', { title: r.title })}
                  onclick={() => this.related.splice(i, 1)}
                />
              </li>
            ))}
          </ul>
        ) : null}
        <TitlePicker
          wrapper="div"
          value={this.relatedQuery}
          oninput={(value: string) => (this.relatedQuery = value)}
          kind={this.kind}
          linked={false}
          kindPlaceholder={text('link.related_placeholder')}
          onpick={(picked: PickedTitle) => {
            if (!taken(picked)) this.related.push(picked);
            this.relatedQuery = '';
          }}
        />
      </div>
    );
  }

  onsubmit(e: SubmitEvent) {
    e.preventDefault();
    const { discussion } = this.attrs;
    const link = this.link;
    const attributes: Record<string, unknown> = {
      marquee: link ? { kind: link.kind, id: link.externalId, season: link.season || null, episode: link.episode ? link.episode.n : null } : null,
    };
    if (link) attributes.marqueeRelated = this.related.map((r) => ({ kind: r.kind, id: r.externalId }));
    // Uploads are already saved; only switching back to the source's, or to none, is sent.
    const backdrops: Record<string, string | null> = {};
    Object.keys({ ...this.savedBackdrops, ...this.backdrops }).forEach((id) => {
      const value = this.backdrops[id] ?? null;
      if ((value === null || value === 'none') && value !== (this.savedBackdrops[id] ?? null)) backdrops[id] = value;
    });
    if (link && Object.keys(backdrops).length) attributes.marqueeBackdrops = backdrops;

    // Only rename once the episode's name is known (see oninit).
    if (link && this.rename && (!link.episode || link.episode.title)) {
      attributes.title = titleFor(link, link.season, link.episode);
    }

    this.saving = true;
    discussion.save(attributes).then(
      () => {
        app.alerts.show({ type: 'success' }, text('link.saved'));
        this.hide();
      },
      (error: RequestError) => {
        this.saving = false;
        this.onerror(error);
      }
    );
  }
}
