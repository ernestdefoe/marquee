import Model from 'flarum/common/Model';
import type { MediaDetails } from './types';

/** A linked movie, show or game. `details` is only sent on the discussion page. */
export default class Media extends Model {
  kind() {
    return Model.attribute<string>('kind').call(this);
  }
  externalId() {
    return Model.attribute<string>('externalId').call(this);
  }
  title() {
    return Model.attribute<string>('title').call(this);
  }
  year() {
    return Model.attribute<number | null>('year').call(this);
  }
  poster() {
    return Model.attribute<string | null>('poster').call(this);
  }
  artist() {
    return Model.attribute<string | null>('artist').call(this);
  }
  details() {
    return Model.attribute<MediaDetails | undefined>('details').call(this);
  }
}
