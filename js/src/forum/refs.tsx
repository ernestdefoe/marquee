import app from 'flarum/forum/app';
import type Mithril from 'mithril';
import type Discussion from 'flarum/common/models/Discussion';
import type { DiscussionLink, SeasonSummary } from './types';
import { text, img, pad, date, linkFor, pickFromMedia, showScores } from './util';
import { loadSeason } from './api';
import { openEpisodeModal } from './components/openers';

/** A season a chip asked the header's season browser to open. */
export const seasonRequest: { number: number | null } = { number: null };

let popover: HTMLDivElement | null = null;

/** The show a post's discussion is linked to, with its details loaded. */
export function showFor(discussion: Discussion | false | null | undefined): DiscussionLink | null {
  const link = discussion && linkFor(discussion);
  return link && link.media.kind() === 'tv' && link.media.details() ? link : null;
}

/**
 * Turn the season and episode spans the formatter left in a post into chips,
 * but only for seasons and episodes the linked show really has. Runs on create
 * and update, so edited and live-arriving posts are covered.
 */
export function decorate(element: Element | null, discussion: Discussion | false | null | undefined) {
  const link = showFor(discussion);
  if (!link || !element) return;

  const seasons = link.media.details()?.seasons || [];

  element.querySelectorAll<HTMLElement>('.MarqueeRef:not([data-mq])').forEach((el) => {
    el.dataset.mq = '1';

    const season = seasons.find((s) => s.number === parseInt(el.dataset.season || '', 10));
    const episode = parseInt(el.dataset.episode || '', 10) || null;
    if (!season || (episode && episode > season.episodes)) return;

    el.classList.add('MarqueeRef--live', episode ? 'MarqueeRef--episode' : 'MarqueeRef--season');
    el.setAttribute('role', 'button');
    el.tabIndex = 0;

    const open = () => (episode ? openEpisode(link, season.number, episode) : openSeason(season.number));
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      open();
    });
    el.addEventListener('mouseenter', () => preview(el, link, season, episode));
    el.addEventListener('mouseleave', hidePreview);

    if (episode) {
      loadSeason(link.media.id(), season.number).then(
        (data) => {
          const ep = data.episodes.find((e) => e.n === episode);
          if (!ep || el.querySelector('.MarqueeRef-title')) return;
          const title = document.createElement('span');
          title.className = 'MarqueeRef-title';
          title.textContent = ep.title;
          el.appendChild(title);
        },
        // The chip still works without the episode's name; the season is fetched again on click.
        () => {}
      );
    }
  });
}

function openEpisode(link: DiscussionLink, number: number, episode: number) {
  hidePreview();
  loadSeason(link.media.id(), number).then((season) => {
    const ep = season.episodes.find((e) => e.n === episode);
    if (ep) openEpisodeModal(pickFromMedia(link.media), season, ep);
  });
}

function openSeason(number: number) {
  hidePreview();
  seasonRequest.number = number;
  document.querySelector('.MarqueeSeasons')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  m.redraw();
}

function preview(el: HTMLElement, link: DiscussionLink, season: SeasonSummary, episode: number | null) {
  const show = (html: Mithril.Children) => {
    popover ??= Object.assign(document.createElement('div'), { className: 'MarqueeRefPreview' });
    if (!popover.isConnected) document.body.appendChild(popover);
    m.render(popover, html);
    const r = el.getBoundingClientRect();
    popover.style.left = `${Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - 288))}px`;
    popover.style.top = `${window.scrollY + r.bottom + 8}px`;
    popover.hidden = false;
  };

  if (!episode) {
    show([
      season.poster ? <img src={img(season.poster, 'w92')} alt="" className="MarqueeRefPreview-poster" /> : null,
      <span>
        <b>{season.name}</b>
        <small>{[season.year, text('meta.episodes_count', { count: season.episodes })].filter(Boolean).join(' · ')}</small>
      </span>,
    ]);
    return;
  }

  loadSeason(link.media.id(), season.number).then((data) => {
    const ep = data.episodes.find((e) => e.n === episode);
    if (!ep || !el.matches(':hover')) return;
    show([
      ep.still ? <img src={img(ep.still, 'w300')} alt="" className="MarqueeRefPreview-still" /> : null,
      <span>
        <b>{text('meta.full_episode_label', { season: pad(season.number), episode: pad(ep.n), name: ep.title })}</b>
        <small>{[date(ep.date), ep.score && showScores() ? `★ ${ep.score}%` : null].filter(Boolean).join(' · ')}</small>
      </span>,
    ]);
  });
}

function hidePreview() {
  if (popover) popover.hidden = true;
}
