import { readFile, writeFile, mkdir } from 'node:fs/promises';

// Assets remain pinned to the reviewed public source. No accounts or hosting
// credentials are included; Playground runs this disposable site in the browser.
const assetRevision = 'b566506c357744773581e9553168225bd93435b0';
const assetBase = `https://raw.githubusercontent.com/ivaaandeelgado/freelance-wordpress-cafe-demo/${assetRevision}/assets`;
const blueprint = JSON.parse(await readFile('blueprint.json', 'utf8'));
const imagesPath = '/wordpress/wp-content/miga-images.json';
const setup = blueprint.steps.find(step => step.step === 'runPHP');
if (!setup || !blueprint.steps.some(step => step.path === imagesPath)) {
  throw new Error('Build the local blueprint first with npm run build.');
}

function browserLinks(value) {
  if (typeof value === 'string') {
    return value.replaceAll('href="/"', 'href="@@HOME@@"')
      .replaceAll('/wp-content/plugins/miga-demo/assets/', '@@CONTENT@@/plugins/miga-demo/assets/');
  }
  if (Array.isArray(value)) return value.map(browserLinks);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, browserLinks(item)]));
  }
  return value;
}

blueprint.$schema = 'https://playground.wordpress.net/blueprint-schema.json';
blueprint.steps = blueprint.steps.flatMap(step => {
  if (step.path === imagesPath) {
    return ['cafe.png', 'breakfast.png'].map(name => ({
      step: 'writeFile',
      path: `/wordpress/wp-content/plugins/miga-demo/assets/${name}`,
      data: { resource: 'url', url: `${assetBase}/${name}` },
    }));
  }
  if (/\/miga-(home|menu|visit)\.json$/.test(step.path || '')) {
    return [{ ...step, data: JSON.stringify(browserLinks(JSON.parse(step.data))) }];
  }
  return [step];
});

const oldImageSetup = "$images = json_decode(file_get_contents('/wordpress/wp-content/miga-images.json'), true);\nforeach ($images as $file => $base64) { file_put_contents('/wordpress/wp-content/plugins/miga-demo/assets/' . $file, base64_decode($base64)); }";
const oldLinkSetup = "$raw = str_replace(['@@CARTA@@', '@@VISIT@@'], ['/?page_id=' . $pages['menu'], '/?page_id=' . $pages['visit']], $raw);";
if (!setup.code.includes(oldImageSetup) || !setup.code.includes(oldLinkSetup)) {
  throw new Error('Local blueprint setup changed: review browser adaptation before publishing.');
}
setup.code = setup.code.replace(oldImageSetup, '')
  .replace(oldLinkSetup, "$raw = str_replace(['@@HOME@@', '@@CONTENT@@', '@@CARTA@@', '@@VISIT@@'], [home_url('/'), content_url(), home_url('/?page_id=' . $pages['menu']), home_url('/?page_id=' . $pages['visit'])], $raw);");
setup.code += "\nupdate_user_meta(1, 'show_admin_bar_front', 'false');\nupdate_option('elementor_onboarded', true);\ndelete_transient('elementor_activation_redirect');\n";
blueprint.steps.push({ step: 'login', username: 'admin', password: 'local-demo-only' });
await mkdir('docs', { recursive: true });
await writeFile('docs/playground.json', JSON.stringify(blueprint, null, 2) + '\n');
console.log(`Browser blueprint ready: ${Buffer.byteLength(JSON.stringify(blueprint))} bytes; assets pinned to ${assetRevision}.`);
