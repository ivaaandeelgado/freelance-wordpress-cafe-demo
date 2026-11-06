import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';

let sequence = 0;
const id = () => (++sequence).toString(16).padStart(8, '0');
const classes = css => ({ css_classes: css, _css_classes: css });
const widget = (type, settings, css = '') => ({ id: id(), elType: 'widget', widgetType: type, isInner: false, settings: { ...settings, ...classes(css) }, elements: [] });
const heading = (title, tag = 'h2', css = '') => widget('heading', { title, header_size: tag }, css);
const text = (copy, css = '') => widget('text-editor', { editor: `<p>${copy}</p>` }, css);
const html = (markup, css = '') => widget('html', { html: markup }, css);
const button = (label, url, css = '') => widget('button', { text: label, link: { url }, size: 'md' }, css);
const box = (css, elements, settings = {}) => ({ id: id(), elType: 'container', isInner: false, settings: { content_width: 'full', flex_direction: 'column', ...classes(css), ...settings }, elements });
const photo = (file, alt, css = '') => widget('image', { image: { url: `/wp-content/plugins/miga-demo/assets/${file}`, id: '', alt }, image_size: 'full', caption_source: 'none', link_to: 'none' }, css);
const arrow = '<span aria-hidden="true">↗</span>';

function header(active) {
  return [
    box('concept-strip', [text('UN CONCEPTO PERSONAL · WORDPRESS + ELEMENTOR · MARCA FICTICIA')]),
    box('site-header shell', [
      heading('<a href="/" aria-label="Miga, inicio">miga<span>®</span></a>', 'div', 'wordmark'),
      text('CAFÉ DE BARRIO<br>OBRADOR SIN PRISA', 'brand-note'),
      html(`<nav aria-label="Navegación principal"><a href="/" ${active === 'home' ? 'aria-current="page"' : ''}>El café</a><a href="@@CARTA@@" ${active === 'menu' ? 'aria-current="page"' : ''}>La carta</a><a href="@@VISIT@@" class="nav-visit" ${active === 'visit' ? 'aria-current="page"' : ''}>Ven a vernos ${arrow}</a></nav>`),
    ], { html_tag: 'header' }),
  ];
}
function footer() {
  return box('site-footer', [box('shell footer-inner', [
    box('footer-top', [heading('<a href="/">miga.</a>', 'div', 'footer-wordmark'), text('Buen café.<br>Mejor compañía.', 'footer-motto'), html('<nav aria-label="Navegación del pie"><a href="/">El café</a><a href="@@CARTA@@">La carta</a><a href="@@VISIT@@">Visítanos</a></nav>')]),
    box('footer-bottom', [text('CONCEPTO PERSONAL / IVAN DELGADO'), text('Marca y local ficticios. Imágenes creadas con IA.<br>Demo sin pedidos, pagos ni reservas reales.')]),
  ])], { html_tag: 'footer' });
}
const root = (active, content) => [box(`miga-root page-${active}`, [...header(active), box('page-content', content, { html_tag: 'main', _element_id: 'main-content' }), footer()])];
const home = root('home', [
  box('home-hero', [
    photo('cafe.png', 'Interior conceptual de Miga: barra de madera, mesas y luz de la mañana.', 'hero-photo'),
    box('shell hero-content', [text('CAFÉ, PAN Y LAS COSAS IMPORTANTES.', 'eyebrow'), heading('Lo bueno<br>lleva su <em>tiempo.</em>', 'h1'), text('Un café bien hecho. El pan todavía tibio.<br>Un ratito que es solo tuyo.', 'hero-lead'), button('Descubre la carta', '@@CARTA@@'), html('<div class="round-seal" aria-hidden="true"><span>HECHO</span><b>con<br>calma</b><span>CADA MAÑANA</span></div>')]),
    box('hero-bottom shell', [text('TU PRÓXIMA PAUSA FAVORITA'), text('CAFÉ DE ESPECIALIDAD & OBRADOR')]),
  ]),
  box('manifesto shell', [text('01 / LO QUE NOS MUEVE', 'eyebrow'), heading('Menos correr.<br><em>Más saborear.</em>'), text('Nos gustan las mañanas que empiezan despacio. Las mesas que se comparten y las recetas sencillas, hechas con atención. Miga es nuestra manera de imaginar ese lugar.', 'manifesto-copy')]),
  box('story shell', [
    box('story-visual', [photo('breakfast.png', 'Cappuccino, croissant y tostada sobre una mesa de madera.', 'breakfast-photo'), text('EL PRIMER CAFÉ. EL MEJOR MOMENTO.', 'photo-caption')]),
    box('story-copy', [text('DE LA BARRA A TU MESA', 'eyebrow'), heading('Pocas cosas.<br><em>Bien hechas.</em>'), text('Café con carácter, masa madre y un obrador que huele a mantequilla. Una carta corta para encontrar algo que apetezca a cualquier hora.'), box('small-menu', [box('small-menu-row', [text('01'), heading('Café de especialidad', 'h3'), text('El ritual de cada día.')]), box('small-menu-row', [text('02'), heading('Recién del horno', 'h3'), text('Crujiente por fuera. Tierno por dentro.')]), box('small-menu-row', [text('03'), heading('Algo para quedarse', 'h3'), text('Tostadas y bocados sin complicaciones.')])]), button('Explora lo que preparamos', '@@CARTA@@', 'text-link')]),
  ]),
  box('pause-banner', [box('shell pause-inner', [text('SIN MIRAR EL RELOJ', 'eyebrow'), heading('Hay sitio<br>para otra <em>pausa.</em>'), box('pause-action', [text('Busca tu mesa favorita.<br>Nosotros imaginamos el resto.'), button('Conoce el espacio', '@@VISIT@@', 'outline-button')])])]),
]);

const products = {
  cafe: { title: 'Un buen café', sub: 'PARA EMPEZAR. O PARA VOLVER A EMPEZAR.', number: '01', rows: [['Espresso', 'Corto, intenso y con mucho que contar.', '2,00'], ['Cortado', 'El equilibrio de siempre.', '2,30'], ['Flat white', 'Doble espresso y leche sedosa.', '3,40'], ['Cappuccino', 'Espuma fina, pausa larga.', '3,20'], ['Filtro del día', 'La taza más tranquila de la barra.', '3,80']] },
  horno: { title: 'Del obrador', sub: 'PEQUEÑAS ALEGRÍAS RECIÉN HORNEADAS.', number: '02', rows: [['Croissant de mantequilla', 'Capas, aire y un crujido perfecto.', '2,80'], ['Caracola de canela', 'Canela, mantequilla y un poco de calma.', '3,60'], ['Cookie de chocolate', 'Bordes dorados, centro tierno.', '2,90'], ['Bizcocho de limón', 'Una porción de las de toda la vida.', '3,50']] },
  cocina: { title: 'Para quedarse', sub: 'CUANDO EL CAFÉ PIDE COMPAÑÍA.', number: '03', rows: [['La de siempre', 'Masa madre, tomate y aceite de oliva.', '5,50'], ['Verde que te quiero', 'Tostada de aguacate, hierbas y limón.', '7,50'], ['Brioche de la casa', 'Huevo cremoso y queso sobre pan tierno.', '8,50'], ['Yogur de la mañana', 'Fruta de temporada y granola crujiente.', '5,80']] },
};
const menuGroups = Object.entries(products).map(([key, category]) => box(`menu-group category-${key}`, [
  box('menu-group-heading', [text(category.number, 'menu-number'), box('menu-group-title', [heading(category.title, 'h2'), text(category.sub, 'eyebrow')])]),
  ...category.rows.map(([name, description, price]) => box('menu-item', [box('menu-item-copy', [heading(name, 'h3'), text(description)]), text(`${price} €`, 'menu-price')])),
], { _element_id: `category-${key}` }));
const menu = root('menu', [
  box('menu-intro shell', [box('menu-intro-copy', [text('02 / HECHO PARA DISFRUTAR', 'eyebrow'), heading('La <em>carta.</em>', 'h1'), text('Lo de siempre, con un poco más de cariño.<br>Elige tu ritual de hoy.')]), photo('breakfast.png', 'Desayuno conceptual de café, croissant y tostada.', 'menu-intro-photo')]),
  box('menu-section shell', [
    html('<div class="menu-controls" role="group" aria-label="Filtrar la carta"><button type="button" data-filter="all" aria-pressed="true">Toda la carta <span>↘</span></button><button type="button" data-filter="cafe" aria-pressed="false">Café</button><button type="button" data-filter="horno" aria-pressed="false">Obrador</button><button type="button" data-filter="cocina" aria-pressed="false">Para quedarse</button></div><div class="menu-search-row"><label>Buscar en la carta<input id="menu-search" type="search" placeholder="Café, limón, chocolate…" maxlength="80"></label><label>Precio máximo (€)<input id="menu-maximum" type="number" min="0" step="0.5" placeholder="Sin límite"></label><button id="menu-reset" type="button">Limpiar filtros</button></div><p id="menu-status" class="menu-result-count" role="status" aria-live="polite"></p><p id="menu-empty" class="menu-empty" hidden>No hay opciones con estos filtros. Prueba otra búsqueda o un precio diferente.</p>'),
    box('menu-columns', menuGroups),
    text('Carta y precios ilustrativos de una marca ficticia. Esta demo no permite realizar pedidos.', 'menu-disclaimer'),
  ]),
  box('menu-callout shell', [heading('¿Tu mesa de siempre?<br><em>Todavía está por descubrir.</em>'), button('Imagina tu visita', '@@VISIT@@')]),
]);

const reservation = `<form id="visit-form" aria-describedby="reservation-note">
  <div class="form-pair"><label>Tu nombre<input name="guest" autocomplete="off" required minlength="2" maxlength="60" placeholder="Alex"></label><label>Personas<select name="people" required><option value="2">2 personas</option><option value="1">1 persona</option><option value="3">3 personas</option><option value="4">4 personas</option></select></label></div>
  <div class="form-pair"><label>Día<input name="date" type="date" required></label><label>Hora<select name="time" required><option value="">Elige una hora</option><option>09:00</option><option>10:00</option><option>11:00</option><option>12:00</option><option>13:00</option><option>16:00</option><option>17:00</option></select></label></div>
  <p id="reservation-note">Usa datos ficticios. Es una vista previa: no reserva una mesa ni envía o guarda tus datos.</p>
  <button type="submit">Ver mi visita ${arrow}</button>
  <p id="visit-result" role="status" aria-live="polite" tabindex="-1" hidden></p>
</form>`;
const visit = root('visit', [
  box('visit-intro shell', [text('03 / ENCUENTRA TU MOMENTO', 'eyebrow'), heading('Pasa.<br><em>Estás en tu sitio.</em>', 'h1'), text('Un espacio imaginado para disfrutar sin prisa.<br>El café sabe mejor cuando tienes un rato.')]),
  box('visit-wide-photo shell', [photo('cafe.png', 'Espacio ficticio de Miga con mesas de madera junto a la ventana.')]),
  box('visit-details shell', [
    box('visit-info', [text('LA VIDA ALREDEDOR DE UNA MESA', 'eyebrow'), heading('Un rincón<br><em>de barrio.</em>'), text('Este concepto imagina un pequeño café mediterráneo. Un lugar cercano, de luz cálida y conversaciones largas.'), box('hours', [heading('Horario del concepto', 'h3'), box('hours-row', [text('Lunes a viernes'), text('08:00 — 18:00')]), box('hours-row', [text('Sábado y domingo'), text('09:00 — 14:00')])]), text('LOCAL FICTICIO · SIN DIRECCIÓN COMERCIAL', 'location-note'), html('<details class="visit-faq"><summary>¿Puedo hacer una reserva real?</summary><p>No. Miga es una demostración de portafolio. El formulario solo muestra una vista previa en tu navegador.</p></details>')]),
    box('reservation-panel', [text('UN ENSAYO DE TU PRÓXIMA PAUSA', 'eyebrow'), heading('Imagina tu visita.', 'h2'), text('Prueba el formulario de esta demo.'), html(reservation)]),
  ]),
]);

const templates = { home, menu, visit };
await mkdir('artifacts/templates', { recursive: true });
await mkdir('artifacts/miga-demo/assets', { recursive: true });
const css = await readFile('demo.css', 'utf8');
const js = await readFile('demo.js', 'utf8');
const plugin = `<?php
/**
 * Plugin Name: Miga Portfolio Demo
 * Description: Original editorial design and browser-only menu / visit preview.
 * Version: 1.0.0
 * License: GPL-2.0-or-later
 */
if (!defined('ABSPATH')) { exit; }
add_filter('elementor/frontend/print_google_fonts', '__return_false');
add_action('wp_enqueue_scripts', function () {
  wp_enqueue_style('miga-demo', plugins_url('demo.css', __FILE__), [], '1.0.0');
  wp_enqueue_script('miga-demo', plugins_url('demo.js', __FILE__), [], '1.0.0', true);
}, 100);
`;
for (const [name, data] of [['miga-demo.php', plugin], ['demo.css', css], ['demo.js', js]]) await writeFile(`artifacts/miga-demo/${name}`, data);
const images = {};
for (const file of ['cafe.png', 'breakfast.png']) {
  images[file] = (await readFile(`assets/${file}`)).toString('base64');
  await copyFile(`assets/${file}`, `artifacts/miga-demo/assets/${file}`);
}
for (const [key, content] of Object.entries(templates)) {
  const template = { title: `Miga — ${key}`, type: 'page', version: '0.4', page_settings: { hide_title: 'yes', template: 'elementor_canvas' }, content };
  await writeFile(`artifacts/templates/miga-${key}.json`, JSON.stringify(template, null, 2));
}

const setup = `<?php
require_once '/wordpress/wp-load.php';
wp_set_current_user(1);
$images = json_decode(file_get_contents('/wordpress/wp-content/miga-images.json'), true);
foreach ($images as $file => $base64) { file_put_contents('/wordpress/wp-content/plugins/miga-demo/assets/' . $file, base64_decode($base64)); }
$pages = [];
$spec = ['home' => ['Miga — El café', 'el-cafe'], 'menu' => ['Miga — La carta', 'carta'], 'visit' => ['Miga — Visítanos', 'visitanos']];
foreach ($spec as $key => $info) {
  $page = wp_insert_post(['post_title' => $info[0], 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $info[1]], true);
  if (is_wp_error($page)) { throw new Exception($page->get_error_message()); }
  $pages[$key] = $page;
}
foreach ($pages as $key => $page) {
  $raw = file_get_contents('/wordpress/wp-content/miga-' . $key . '.json');
  $raw = str_replace(['@@CARTA@@', '@@VISIT@@'], ['/?page_id=' . $pages['menu'], '/?page_id=' . $pages['visit']], $raw);
  $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
  update_post_meta($page, '_wp_page_template', 'elementor_canvas');
  update_post_meta($page, '_elementor_edit_mode', 'builder');
  update_post_meta($page, '_elementor_template_type', 'wp-page');
  update_post_meta($page, '_elementor_version', ELEMENTOR_VERSION);
  $document = \\Elementor\\Plugin::$instance->documents->get($page);
  $document->save(['elements' => $data['content'], 'settings' => $data['page_settings']]);
}
update_option('show_on_front', 'page');
update_option('page_on_front', $pages['home']);
update_option('blog_public', 0);
update_option('elementor_google_font', 'no');
update_option('elementor_css_print_method', 'internal');
update_option('admin_email', 'demo@example.test');
wp_update_user(['ID' => 1, 'user_email' => 'demo@example.test', 'display_name' => 'Demo local']);
wp_set_password('local-demo-only', 1);
\\Elementor\\Plugin::$instance->files_manager->clear_cache();
$uploads = wp_upload_dir(); wp_mkdir_p($uploads['basedir']);
file_put_contents($uploads['basedir'] . '/demo-verification.json', wp_json_encode(['wordpress' => get_bloginfo('version'), 'elementor' => ELEMENTOR_VERSION, 'pages' => $pages, 'demo_only' => true, 'images' => 'AI-generated original fictional scenes', 'urls' => ['home' => '/', 'menu' => '/?page_id=' . $pages['menu'], 'visit' => '/?page_id=' . $pages['visit']]]));
`;
const blueprint = {
  landingPage: '/', preferredVersions: { php: '8.3', wp: '7.1.4' }, features: { networking: false },
  steps: [
    { step: 'setSiteOptions', options: { blogname: 'Miga — Café & obrador', blogdescription: 'Concepto personal de portafolio', admin_email: 'demo@example.test' } },
    { step: 'installPlugin', pluginData: { resource: 'url', url: 'https://downloads.wordpress.org/plugin/elementor.4.3.6.zip' }, options: { activate: true } },
    { step: 'mkdir', path: '/wordpress/wp-content/plugins/miga-demo/assets' },
    ...[['miga-demo.php', plugin], ['demo.css', css], ['demo.js', js]].map(([name, data]) => ({ step: 'writeFile', path: `/wordpress/wp-content/plugins/miga-demo/${name}`, data })),
    { step: 'activatePlugin', pluginPath: 'miga-demo/miga-demo.php' },
    { step: 'writeFile', path: '/wordpress/wp-content/miga-images.json', data: JSON.stringify(images) },
    ...await Promise.all(Object.keys(templates).map(async key => ({ step: 'writeFile', path: `/wordpress/wp-content/miga-${key}.json`, data: await readFile(`artifacts/templates/miga-${key}.json`, 'utf8') }))),
    { step: 'runPHP', code: setup },
  ],
};
await writeFile('blueprint.json', JSON.stringify(blueprint, null, 2));
console.log(`Miga: three Elementor pages, ${sequence} editable elements, two local original images.`);
