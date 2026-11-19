import Extend from 'flarum/common/extenders';
import Discussion from 'flarum/common/models/Discussion';
import Media from './models';
import type { SeasonData } from './types';

export default [
  new Extend.Store().add('marquee-media', Media),

  new Extend.Model(Discussion)
    .hasOne<Media>('marqueeMedia')
    .hasMany<Media>('marqueeRelatedMedia')
    .attribute<number | null>('marqueeSeason')
    .attribute<number | null>('marqueeEpisode')
    .attribute<SeasonData | null>('marqueeSeasonData'),
];
