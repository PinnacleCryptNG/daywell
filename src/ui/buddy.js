// Animated "Daywell buddy" scenes, drawn as inline SVG and animated in styles.css.

const head = (cx, cy, faceRight) => `
  <circle class="bd-skin" cx="${cx}" cy="${cy}" r="13"/>
  <path class="bd-hair" d="M${cx - 13} ${cy - 1}A13 13 0 0 1 ${cx + 13} ${cy - 3}C${cx + 6} ${cy - 9} ${cx - 6} ${cy - 10} ${cx - 13} ${cy - 1}Z"/>
  ${faceRight
    ? `<g class="bd-eyes"><circle class="bd-eye" cx="${cx + 6}" cy="${cy - 1}" r="1.7"/></g>
       <path class="bd-smile" d="M${cx + 4} ${cy + 5}q3 2.6 6 0"/>`
    : `<g class="bd-eyes"><circle class="bd-eye" cx="${cx - 5}" cy="${cy - 1}" r="1.7"/><circle class="bd-eye" cx="${cx + 5}" cy="${cy - 1}" r="1.7"/></g>
       <path class="bd-smile" d="M${cx - 5} ${cy + 5}q5 4 10 0"/>
       <circle class="bd-cheek" cx="${cx - 8}" cy="${cy + 4}" r="2"/><circle class="bd-cheek" cx="${cx + 8}" cy="${cy + 4}" r="2"/>`}`;

const heart = (x, y) => `<path class="bd-heart" d="M${x} ${y + 5}c-5-3.4-7-5.6-7-8.2a3.6 3.6 0 0 1 7-1.4a3.6 3.6 0 0 1 7 1.4c0 2.6-2 4.8-7 8.2z"/>`;

export function drinkScene(label = 'A little character walks to a water cooler, fills a glass and drinks it') {
  return `<svg class="buddy buddy-drink" viewBox="0 0 200 120" role="img" aria-label="${label}">
  <ellipse class="bd-ground" cx="100" cy="111" rx="92" ry="4"/>
  <g class="bd-cooler-g">
    <rect class="bd-bottle" x="114" y="4" width="28" height="28" rx="9"/>
    <rect class="bd-bottle-water" x="117" y="12" width="22" height="18" rx="6"/>
    <circle class="bd-bubble" cx="124" cy="26" r="2"/>
    <rect class="bd-cooler" x="121" y="30" width="14" height="6" rx="2"/>
    <rect class="bd-cooler" x="110" y="35" width="36" height="75" rx="8"/>
    <rect class="bd-cooler-panel" x="116" y="62" width="24" height="34" rx="5"/>
    <rect class="bd-tap" x="100" y="43" width="12" height="5" rx="2"/>
    <rect class="bd-tap" x="101" y="46" width="4" height="6" rx="1.5"/>
    <rect class="bd-stream" x="102.2" y="52" width="1.6" height="7" rx=".8"/>
  </g>
  <g class="bd-walker"><g class="bd-bob">
    <g class="bd-leg bd-leg-b"><path class="bd-pants" d="M66 80V107h5"/></g>
    <g class="bd-arm bd-arm-b"><path class="bd-limb" d="M64 54V76"/><circle class="bd-skin" cx="64" cy="78" r="3.6"/></g>
    <g class="bd-leg bd-leg-f"><path class="bd-pants" d="M74 80V107h5"/></g>
    <rect class="bd-shirt" x="57" y="46" width="26" height="36" rx="11"/>
    <g class="bd-head">${head(71, 31, true)}</g>
    <g class="bd-arm bd-arm-f"><path class="bd-limb" d="M78 54V76"/>
      <g class="bd-glass">
        <path class="bd-glass-body" d="M77 66h10l-1.3 15h-7.4z"/>
        <rect class="bd-glass-water" x="78.4" y="69.5" width="7.2" height="11" rx="1"/>
      </g>
      <circle class="bd-skin" cx="78" cy="78" r="3.6"/>
    </g>
    ${heart(92, 10)}
  </g></g>
</svg>`;
}

export function stretchScene(label = 'A little character stands up from a desk and stretches') {
  return `<svg class="buddy buddy-stretch" viewBox="0 0 200 120" role="img" aria-label="${label}">
  <ellipse class="bd-ground" cx="100" cy="111" rx="92" ry="4"/>
  <g class="bd-riser"><g class="bd-upper">
    <g class="bd-arm bd-arm-l"><path class="bd-limb" d="M89 52V76"/><circle class="bd-skin" cx="89" cy="78" r="3.6"/></g>
    <g class="bd-arm bd-arm-r"><path class="bd-limb" d="M111 52V76"/><circle class="bd-skin" cx="111" cy="78" r="3.6"/></g>
    <rect class="bd-shirt" x="86" y="43" width="28" height="48" rx="12"/>
    <g class="bd-head">${head(100, 28, false)}</g>
  </g>
  <g class="bd-spark bd-spark-l"><path d="M70 6v6M67 9h6"/></g>
  <g class="bd-spark bd-spark-r"><path d="M130 6v6M127 9h6"/></g>
  ${heart(132, 22)}
  </g>
  <rect class="bd-laptop" x="50" y="66" width="28" height="19" rx="2.5"/>
  <circle class="bd-laptop-dot" cx="64" cy="75.5" r="2"/>
  <rect class="bd-mug" x="126" y="76" width="11" height="10" rx="2.5"/>
  <path class="bd-mug-handle" d="M137 79h2a2.5 2.5 0 0 1 0 5h-2"/>
  <rect class="bd-desk-panel" x="58" y="91" width="84" height="19" rx="3"/>
  <rect class="bd-desk" x="38" y="85" width="124" height="7" rx="3"/>
  <rect class="bd-desk-leg" x="46" y="92" width="5" height="19" rx="2"/>
  <rect class="bd-desk-leg" x="149" y="92" width="5" height="19" rx="2"/>
</svg>`;
}

export const SCENES = { drink: drinkScene, stretch: stretchScene };
