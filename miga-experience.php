<?php
/** Original, read-only quotation endpoint for the fictional Miga portfolio demo. */
if (!defined('ABSPATH')) { exit; }

function miga_demo_catalog() {
    static $catalog = null;
    if ($catalog === null) {
        $catalog = json_decode(file_get_contents(__DIR__ . '/catalog.json'), true);
    }
    return is_array($catalog) ? $catalog : [];
}

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('miga-experience', plugins_url('experience.css', __FILE__), ['miga-demo'], '3.0.0');
    wp_enqueue_script('miga-experience', plugins_url('experience.js', __FILE__), ['miga-demo'], '3.0.0', true);
    wp_localize_script('miga-experience', 'MigaExperience', [
        'catalog' => miga_demo_catalog(),
        'quoteUrl' => esc_url_raw(rest_url('miga/v1/quote')),
    ]);
}, 110);

add_action('rest_api_init', function () {
    register_rest_route('miga/v1', '/quote', [
        'methods' => 'POST',
        'permission_callback' => '__return_true',
        'callback' => function (WP_REST_Request $request) {
            if (strlen($request->get_body()) > 16000) {
                return new WP_Error('miga_size', 'La selección es demasiado grande.', ['status' => 413]);
            }
            $body = $request->get_json_params();
            $items = is_array($body) ? ($body['items'] ?? null) : null;
            if (!is_array($items) || !array_is_list($items) || count($items) < 1 || count($items) > 40) {
                return new WP_Error('miga_items', 'Selecciona entre 1 y 40 líneas.', ['status' => 400]);
            }
            $catalog = array_column(miga_demo_catalog(), null, 'id');
            $lines = []; $total = 0;
            foreach ($items as $item) {
                if (!is_array($item) || !is_string($item['id'] ?? null) || !isset($catalog[$item['id']])) {
                    return new WP_Error('miga_product', 'Producto no reconocido.', ['status' => 400]);
                }
                $product = $catalog[$item['id']];
                $quantity = $item['quantity'] ?? null;
                $size = $item['size'] ?? 'regular';
                $milk = $item['milk'] ?? 'standard';
                $shot = $item['shot'] ?? false;
                if (!is_int($quantity) || $quantity < 1 || $quantity > 10 ||
                    !in_array($size, ['regular', 'large'], true) ||
                    !in_array($milk, ['standard', 'oat'], true) || !is_bool($shot) ||
                    ($product['category'] !== 'cafe' && ($size !== 'regular' || $milk !== 'standard' || $shot))) {
                    return new WP_Error('miga_options', 'Revisa cantidades y opciones del producto.', ['status' => 400]);
                }
                // Ignore all client-provided prices: calculate integer cents from the catalog.
                $unit = $product['cents'] + ($size === 'large' ? 80 : 0) + ($milk === 'oat' ? 40 : 0) + ($shot ? 60 : 0);
                $subtotal = $unit * $quantity;
                $total += $subtotal;
                $lines[] = ['id' => $product['id'], 'name' => $product['name'], 'quantity' => $quantity, 'unitCents' => $unit, 'subtotalCents' => $subtotal];
            }
            return new WP_REST_Response(['demoOnly' => true, 'currency' => 'EUR', 'lines' => $lines, 'totalCents' => $total, 'message' => 'Presupuesto comprobado. No se ha creado ningún pedido ni cobro.'], 200);
        },
    ]);
});
