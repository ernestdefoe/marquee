import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import DiscussionHero from 'flarum/forum/components/DiscussionHero';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import Link from 'flarum/common/components/Link';
import MediaHero from './components/MediaHero';
import TitlePicker, { typeForTags } from './components/TitlePicker';
import { SOURCES, forDiscussion } from './fixtures';

app.initializers.add('ernestdefoe-marquee', () => {
  // The composer is a lazy chunk in Flarum 2, so extend it by module path.
  // The tag comes first: it decides whether the title field searches a source.
  extend('flarum/forum/components/DiscussionComposer', 'oncreate', function () {
    app.tagList.load(['parent']).then(() => {
      const tags = this.composer.fields.tags || [];
      if (!tags.length && this.chooseTags) this.chooseTags();
    });
  });

  extend('flarum/forum/components/DiscussionComposer', 'headerItems', function (items) {
    // A linked title only stands while its tag does.
    const linked = this.composer.fields.marquee;
    if (linked && linked.type !== typeForTags(this.composer.fields.tags)) this.composer.fields.marquee = null;

    items.setContent(
      'discussionTitle',
      <TitlePicker
        composer={this.composer}
        placeholder={this.attrs.titlePlaceholder}
        disabled={!!this.attrs.disabled}
        onkeydown={this.onkeydown.bind(this)}
      />
    );

    const item = this.composer.fields.marquee;
    if (item) {
      items.add(
        'marquee',
        <span className="Marquee-linked">
          <img src={item.poster} alt="" />
          Linked to <b>{item.title}</b> · {SOURCES[item.type].label} · {SOURCES[item.type].source}
          <button
            type="button"
            className="Button Button--icon Button--link"
            aria-label="Remove link"
            onclick={() => (this.composer.fields.marquee = null)}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </span>,
        -10
      );
    }
  });

  override(DiscussionHero.prototype, 'view', function (original) {
    const item = forDiscussion(this.attrs.discussion);
    return item ? <MediaHero discussion={this.attrs.discussion} item={item} /> : original();
  });

  extend(DiscussionListItem.prototype, 'authorItems', function (items) {
    const discussion = this.attrs.discussion;
    const item = forDiscussion(discussion);
    if (!item) return;

    items.add(
      'marqueePoster',
      <Link className="Marquee-listPoster" href={app.route.discussion(discussion)} tabindex="-1" aria-hidden="true">
        <img src={item.poster} alt="" loading="lazy" />
      </Link>,
      95
    );
  });

  extend(DiscussionListItem.prototype, 'infoItems', function (items) {
    const item = forDiscussion(this.attrs.discussion);
    if (item) items.add('marquee', <span className="Marquee-listMeta">{`${SOURCES[item.type].label} · ${item.year}`}</span>, 5);
  });
});
