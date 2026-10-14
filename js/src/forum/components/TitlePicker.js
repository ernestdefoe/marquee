import Component from 'flarum/common/Component';
import classList from 'flarum/common/utils/classList';
import { SOURCES, label, search } from '../fixtures';

export const typeForTags = (tags) => {
  const slugs = (tags || []).map((t) => t.slug());
  return Object.keys(SOURCES).find((type) => slugs.includes(SOURCES[type].tag));
};

/**
 * The discussion title input. Under a Movies, TV Shows or Games tag it searches
 * that source and offers a dropdown of matches; under any other tag, or none,
 * it is the normal title field.
 */
export default class TitlePicker extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.results = [];
    this.active = 0;
    this.open = false;
  }

  view() {
    const { composer, disabled } = this.attrs;
    const type = this.type();
    const placeholder = type ? SOURCES[type].placeholder : this.attrs.placeholder;
    const open = this.open && this.results.length > 0;

    return (
      <h3 className="Marquee-titleField">
        <input
          className="FormControl DiscussionComposer-title"
          value={composer.fields.title()}
          placeholder={placeholder}
          disabled={disabled}
          role={type ? 'combobox' : undefined}
          aria-expanded={type ? (open ? 'true' : 'false') : undefined}
          aria-autocomplete={type ? 'list' : undefined}
          aria-controls={type ? 'Marquee-results' : undefined}
          aria-activedescendant={open ? `Marquee-result-${this.active}` : undefined}
          oninput={(e) => this.oninput(e.target.value)}
          onkeydown={(e) => this.onkeydown(e)}
          onfocus={() => this.find()}
          onblur={() => setTimeout(() => ((this.open = false), m.redraw()), 150)}
        />
        {open ? this.dropdown() : null}
      </h3>
    );
  }

  onupdate(vnode) {
    super.onupdate(vnode);

    // Once a media tag is chosen, put the cursor in the search box. The tag
    // modal focuses the post body when it closes, so wait for it.
    const type = this.type();
    if (type && type !== this.lastType && !this.attrs.composer.fields.title()) {
      setTimeout(() => this.element.querySelector('input')?.focus(), 50);
    }
    this.lastType = type;

    // The composer clips its content, so fit the list to the room under the title.
    const list = this.element.querySelector('.Marquee-results');
    const composer = this.element.closest('.Composer');
    if (list && composer) {
      const room = composer.getBoundingClientRect().bottom - list.getBoundingClientRect().top - 8;
      list.style.maxHeight = `${Math.max(160, Math.min(360, room))}px`;
    }
  }

  dropdown() {
    const rows = this.results.map((item, i) => (
      <li
        id={`Marquee-result-${i}`}
        role="option"
        aria-selected={i === this.active ? 'true' : 'false'}
        className={classList('Marquee-result', { active: i === this.active })}
        onmousedown={(e) => (e.preventDefault(), this.pick(item))}
        onmouseenter={() => (this.active = i)}
      >
        <img src={item.poster} alt="" loading="lazy" />
        <span>
          <b>{item.title}</b>
          <small>
            {[item.year, ...item.credits.slice(0, 1).map((c) => c[1]), item.platforms ? item.platforms.slice(0, 2).join(', ') : item.meta[2]]
              .filter(Boolean)
              .join(' · ')}
          </small>
        </span>
      </li>
    ));

    rows.push(
      <li className="Marquee-foot">
        <span>{`Results from ${SOURCES[this.type()].source}`}</span>
        <span>Esc keeps a plain title</span>
      </li>
    );

    return (
      <ul className="Dropdown-menu Marquee-results" id="Marquee-results" role="listbox">
        {rows}
      </ul>
    );
  }

  type() {
    return typeForTags(this.attrs.composer.fields.tags);
  }

  oninput(value) {
    const fields = this.attrs.composer.fields;
    fields.title(value);
    fields.marquee = null;
    this.active = 0;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.find(), m.redraw()), 200);
  }

  find() {
    const fields = this.attrs.composer.fields;
    // No media tag chosen: a plain title field.
    if (fields.marquee || !this.type()) return (this.results = []);
    this.results = search(fields.title(), this.type());
    this.open = true;
  }

  pick(item) {
    const fields = this.attrs.composer.fields;
    fields.title(label(item));
    fields.marquee = item;
    this.open = false;
  }

  onkeydown(e) {
    const open = this.open && this.results.length;

    if (open && e.key === 'ArrowDown') this.active = (this.active + 1) % this.results.length;
    else if (open && e.key === 'ArrowUp') this.active = (this.active - 1 + this.results.length) % this.results.length;
    else if (open && e.key === 'Enter') this.pick(this.results[this.active]);
    else if (open && e.key === 'Escape') this.open = false;
    else return this.attrs.onkeydown(e);

    e.preventDefault();
    e.stopPropagation();
  }
}
