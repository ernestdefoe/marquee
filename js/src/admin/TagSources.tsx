import app from 'flarum/admin/app';
import Component, { type ComponentAttrs } from 'flarum/common/Component';
import type Mithril from 'mithril';
import type Stream from 'flarum/common/utils/Stream';
import type Tag from 'ext:flarum/tags/common/models/Tag';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import Select from 'flarum/common/components/Select';
import tagIcon from 'ext:flarum/tags/common/helpers/tagIcon';

const t = (key: string) => app.translator.trans(`ernestdefoe-marquee.admin.${key}`);

/**
 * Which tags search which source. A discussion started under a mapped tag gets
 * the title picker; every other tag keeps the normal composer.
 */
export interface TagSourcesAttrs extends ComponentAttrs {
  /** The setting: a JSON map of tag id to kind. */
  stream: Stream<string>;
}

export default class TagSources extends Component<TagSourcesAttrs> {
  tags!: Tag[] | null;

  oninit(vnode: Mithril.Vnode<TagSourcesAttrs, this>) {
    super.oninit(vnode);
    this.tags = null;
    app.store.find<Tag[]>('tags').then((tags) => {
      this.tags = tags;
      m.redraw();
    });
  }

  view() {
    const map = this.map();
    const options = {
      '': t('source_none'),
      movie: t('source_movie'),
      tv: t('source_tv'),
      game: t('source_game'),
      music: t('source_music'),
      book: t('source_book'),
    };

    return (
      <div className="Form-group MarqueeTagSources">
        <label>{t('tags_label')}</label>
        <div className="helpText">{t('tags_help')}</div>
        {!this.tags ? (
          <LoadingIndicator size="small" display="inline" />
        ) : (
          <table className="MarqueeTagSources-table">
            <tbody>
              {this.tags.map((tag) => (
                <tr>
                  <td>
                    {tagIcon(tag)} {tag.name()}
                  </td>
                  <td>
                    <Select value={map[String(tag.id())] || ''} options={options} onchange={(value: string) => this.set(String(tag.id()), value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  map(): Record<string, string> {
    try {
      return JSON.parse(this.attrs.stream() || '{}') || {};
    } catch (e) {
      // A setting that isn't valid JSON maps no tags; saving writes a valid one.
      return {};
    }
  }

  set(tagId: string, kind: string) {
    const map = this.map();
    if (kind) map[tagId] = kind;
    else delete map[tagId];
    this.attrs.stream(JSON.stringify(map));
  }
}
