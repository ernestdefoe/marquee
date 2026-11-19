import type Media from '../src/forum/models';
import type { SeasonData } from '../src/forum/types';

// What src/forum/extend.ts adds to core's models, and what the forum code keeps on core's components.

declare module 'flarum/common/models/Discussion' {
  export default interface Discussion {
    marqueeMedia(): Media | false;
    marqueeRelatedMedia(): (Media | undefined)[] | false;
    marqueeSeason(): number | null;
    marqueeEpisode(): number | null;
    marqueeSeasonData(): SeasonData | null;
  }
}

declare module 'flarum/common/components/TextEditor' {
  export default interface TextEditor {
    /** Re-checks the text before the cursor for a season or episode reference. */
    marqueeSuggest?: () => void;
  }
}
