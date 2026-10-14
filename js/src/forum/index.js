import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import DiscussionHero from 'flarum/forum/components/DiscussionHero';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import Link from 'flarum/common/components/Link';
import MediaHero from './components/MediaHero';
import TitlePicker, { typeForTags } from './components/TitlePicker';
import ScopePicker from './components/ScopePicker';
import { SOURCES, pad, forDiscussion } from './fixtures';
import { applyPrefill } from './startDiscussion';

const posterFor = ({ item, season }) => season?.poster || item.poster;

const describe = ({ item, season, episode }) => {
  if (episode) return `S${pad(season.number)}E${pad(episode.n)} · ${episode.date}`;
  if (season) return `Season ${season.number} · ${season.year}`;
  return `${SOURCES[item.type].label} · ${item.year}`;
};

app.initializers.add('ernestdefoe-marquee', () => {
  // The composer is a lazy chunk in Flarum 2, so extend it by module path.
  // The tag comes first: it decides whether the title field searches a source.
  extend('flarum/forum/components/DiscussionComposer', 'oncreate', function () {
    applyPrefill(this.composer);
    app.tagList.load(['parent']).then(() => {
      const tags = this.composer.fields.tags || [];
      if (!tags.length && this.chooseTags) this.chooseTags();
    });
  });

  extend('flarum/forum/components/DiscussionComposer', 'headerItems', function (items) {
    const fields = this.composer.fields;

    // A linked title only stands while its tag does.
    if (fields.marquee && fields.marquee.item.type !== typeForTags(fields.tags)) fields.marquee = null;

    items.setContent(
      'discussionTitle',
      <TitlePicker
        composer={this.composer}
        placeholder={this.attrs.titlePlaceholder}
        disabled={!!this.attrs.disabled}
        onkeydown={this.onkeydown.bind(this)}
      />
    );

    const link = fields.marquee;
    if (!link) return;

    items.add(
      'marquee',
      <span className="Marquee-linked">
        <img src={posterFor(link)} alt="" />
        Linked to <b>{link.item.title}</b> · {SOURCES[link.item.type].label} · {SOURCES[link.item.type].source}
        <button type="button" className="Button Button--icon Button--link" aria-label="Remove link" onclick={() => (fields.marquee = null)}>
          <i className="fas fa-times" aria-hidden="true" />
        </button>
      </span>,
      -10
    );

    if (link.item.seasons) items.add('marqueeScope', <ScopePicker composer={this.composer} />, -20);
  });

  override(DiscussionHero.prototype, 'view', function (original) {
    const link = forDiscussion(this.attrs.discussion);
    return link ? <MediaHero discussion={this.attrs.discussion} link={link} /> : original();
  });

  extend(DiscussionListItem.prototype, 'authorItems', function (items) {
    const discussion = this.attrs.discussion;
    const link = forDiscussion(discussion);
    if (!link) return;

    items.add(
      'marqueePoster',
      <Link className="Marquee-listPoster" href={app.route.discussion(discussion)} tabindex="-1" aria-hidden="true">
        <img src={posterFor(link)} alt="" loading="lazy" />
      </Link>,
      95
    );
  });

  extend(DiscussionListItem.prototype, 'infoItems', function (items) {
    const link = forDiscussion(this.attrs.discussion);
    if (link) items.add('marquee', <span className="Marquee-listMeta">{describe(link)}</span>, 5);
  });
});
