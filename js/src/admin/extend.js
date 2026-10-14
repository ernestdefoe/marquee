import { Admin } from 'flarum/common/extenders';
import app from 'flarum/admin/app';
import TagSources from './TagSources';

const t = (key, params) => app.translator.trans(`ernestdefoe-marquee.admin.${key}`, params);

export default [
  new Admin()
    // Custom so the help can carry a link: a setting's help is not rendered as rich text.
    .customSetting(function () {
      return (
        <div className="Form-group">
          <label for="marquee-tmdb-token">{t('tmdb_token_label')}</label>
          <div className="helpText">
            {t('tmdb_token_help', { a: <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" /> })}
          </div>
          <input
            id="marquee-tmdb-token"
            className="FormControl"
            type="password"
            autocomplete="off"
            bidi={this.setting('ernestdefoe-marquee.tmdb_token')}
          />
        </div>
      );
    }, 100)
    .setting(
      () => ({
        setting: 'ernestdefoe-marquee.language',
        type: 'text',
        label: t('language_label'),
        help: t('language_help'),
        placeholder: 'en-US',
      }),
      90
    )
    .customSetting(function () {
      return <TagSources stream={this.setting('ernestdefoe-marquee.tags', '{}')} />;
    }, 80),
];
