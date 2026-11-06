document.addEventListener('DOMContentLoaded', () => {
  const settings = window.MigaExperience;
  if (!settings?.catalog) return;
  const catalog = settings.catalog, byId = new Map(catalog.map(product => [product.id, product]));
  const q = selector => document.querySelector(selector);
  const money = cents => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const element = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const cleanLine = item => {
    if (!item || !byId.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) return null;
    const coffee = byId.get(item.id).category === 'cafe';
    return { id: item.id, quantity: item.quantity, size: coffee && item.size === 'large' ? 'large' : 'regular', milk: coffee && item.milk === 'oat' ? 'oat' : 'standard', shot: coffee && item.shot === true };
  };
  const stored = read('miga-bag-v3', []);
  let bag = Array.isArray(stored) ? stored.slice(0, 40).map(cleanLine).filter(Boolean) : [], revision = 0, activeProduct;
  const favoriteData = read('miga-favorites-v3', []);
  const favorites = new Set(Array.isArray(favoriteData) ? favoriteData.filter(id => byId.has(id)) : []);
  window.MigaFavorites = favorites;
  const unit = item => byId.get(item.id).cents + (item.size === 'large' ? 80 : 0) + (item.milk === 'oat' ? 40 : 0) + (item.shot ? 60 : 0);
  const total = () => bag.reduce((sum, item) => sum + unit(item) * item.quantity, 0);
  const key = item => [item.id, item.size, item.milk, item.shot].join(':');
  const details = item => [item.size === 'large' ? 'Taza grande' : '', item.milk === 'oat' ? 'Avena' : '', item.shot ? 'Espresso extra' : ''].filter(Boolean).join(' · ') || 'Receta original';
  let toastTimer;
  function toast(text) { const box = q('#miga-toast'); box.textContent = text; box.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => box.hidden = true, 3500); }
  function download(filename, content, type) { const url = URL.createObjectURL(new Blob([content], { type })); const a = element('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  document.querySelectorAll('.miga-dialog').forEach(dialog => {
    dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); });
  });
  function refreshBag() {
    revision++; save('miga-bag-v3', bag); q('#bag-count').textContent = String(bag.reduce((sum, item) => sum + item.quantity, 0)); q('#bag-total').textContent = money(total()); q('#bag-summary').textContent = money(total()); q('#bag-feedback').textContent = '';
    q('#bag-verify').disabled = q('#bag-download').disabled = q('#bag-clear').disabled = !bag.length;
    q('#bag-lines').replaceChildren(...(bag.length ? bag.map((item, index) => {
      const row = element('article', undefined, 'bag-line'), copy = element('div'); copy.append(element('h3', byId.get(item.id).name), element('p', details(item)), element('strong', money(unit(item) * item.quantity)));
      const controls = element('div', undefined, 'bag-quantity');
      for (const [label, action, disabled] of [['−', () => { item.quantity--; if (!item.quantity) bag.splice(index, 1); refreshBag(); }, false], ['+', () => { item.quantity++; refreshBag(); }, item.quantity >= 10]]) { const button = element('button', label); button.type = 'button'; button.disabled = disabled; button.setAttribute('aria-label', `${label === '+' ? 'Aumentar' : 'Reducir'} ${byId.get(item.id).name}`); button.addEventListener('click', action); controls.append(button); if (label === '−') controls.append(element('span', String(item.quantity))); }
      const remove = element('button', 'Quitar', 'bag-remove'); remove.type = 'button'; remove.setAttribute('aria-label', `Quitar ${byId.get(item.id).name}`); remove.addEventListener('click', () => { bag.splice(index, 1); refreshBag(); }); row.append(copy, controls, remove); return row;
    }) : [element('p', 'Tu bolsa está esperando una buena pausa. Añade algo desde la carta.', 'bag-empty')]));
  }
  function add(item) {
    const existing = bag.find(line => key(line) === key(item));
    if (existing) { if (existing.quantity + item.quantity > 10) { toast('Máximo 10 unidades por preparación.'); return false; } existing.quantity += item.quantity; }
    else { if (bag.length >= 40) { toast('La bolsa admite hasta 40 preparaciones.'); return false; } bag.push(item); }
    refreshBag(); return true;
  }
  q('#bag-open').addEventListener('click', () => q('#bag-dialog').showModal());
  q('#bag-clear').addEventListener('click', () => { bag = []; refreshBag(); });
  const productForm = q('#product-form');
  function selection() { return cleanLine({ id: activeProduct.id, quantity: Number(productForm.elements.quantity.value), size: productForm.elements.size.value, milk: productForm.elements.milk.value, shot: productForm.elements.shot.checked }); }
  function productTotal() { const item = selection(); q('#product-total').textContent = item ? money(unit(item) * item.quantity) : 'Revisa las unidades'; }
  document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => {
    activeProduct = byId.get(button.dataset.product); productForm.reset(); q('#product-title').textContent = activeProduct.name; q('#product-description').textContent = activeProduct.description; q('#coffee-options').hidden = activeProduct.category !== 'cafe'; productTotal(); q('#product-dialog').showModal();
  }));
  productForm.addEventListener('input', productTotal);
  productForm.addEventListener('submit', event => { event.preventDefault(); if (!productForm.reportValidity()) return; const item = selection(); if (item && add(item)) { q('#product-dialog').close(); toast(`${activeProduct.name} añadido a tu pausa.`); } });
  q('#bag-verify').addEventListener('click', async () => {
    if (!bag.length) return; const current = revision, controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 45000); q('#bag-verify').disabled = true; q('#bag-feedback').textContent = 'Comprobando la carta…';
    try { const response = await fetch(settings.quoteUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: bag }), signal: controller.signal }); const quote = await response.json(); if (current !== revision) return; if (!response.ok) throw new Error(quote.message || 'No se pudo comprobar la selección.'); if (quote.totalCents !== total() || quote.demoOnly !== true) throw new Error('La carta ha cambiado. Recarga la página para actualizar los precios.'); q('#bag-feedback').textContent = `${quote.message} Total: ${money(quote.totalCents)}.`; }
    catch (error) { if (current === revision) q('#bag-feedback').textContent = error.name === 'AbortError' ? 'La comprobación ha tardado demasiado. Puedes intentarlo de nuevo.' : error.message; }
    finally { clearTimeout(timeout); q('#bag-verify').disabled = !bag.length; }
  });
  q('#bag-download').addEventListener('click', () => download('mi-pausa-miga.txt', ['MIGA / MI PAUSA', 'Selección de demostración. No es un pedido ni un justificante de pago.', '', ...bag.map(item => `${item.quantity} × ${byId.get(item.id).name} · ${details(item)} · ${money(unit(item) * item.quantity)}`), '', `Total ilustrativo: ${money(total())}`].join('\n'), 'text/plain;charset=utf-8'));
  function refreshFavorites() { document.querySelectorAll('[data-favorite]').forEach(button => { const saved = favorites.has(button.dataset.favorite); button.setAttribute('aria-pressed', String(saved)); button.textContent = saved ? '♥' : '♡'; }); if (q('#favorite-count')) q('#favorite-count').textContent = String(favorites.size); save('miga-favorites-v3', [...favorites]); document.dispatchEvent(new Event('miga:filter')); }
  document.querySelectorAll('[data-favorite]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.favorite; favorites.has(id) ? favorites.delete(id) : favorites.add(id); refreshFavorites(); }));
  ['#menu-vegan', '#menu-favorites'].forEach(selector => q(selector)?.addEventListener('change', () => document.dispatchEvent(new Event('miga:filter'))));

  const ritual = q('#ritual-form');
  if (ritual) {
    q('#ritual-budget').addEventListener('input', () => { q('#ritual-budget-value').textContent = `${q('#ritual-budget').value} €`; q('#ritual-result').hidden = true; });
    ritual.addEventListener('change', () => q('#ritual-result').hidden = true);
    ritual.addEventListener('submit', event => {
      event.preventDefault(); const mood = q('#ritual-mood').value, food = q('#ritual-food').value, cap = Number(q('#ritual-budget').value) * 100;
      const coffeeIds = mood === 'vegetal' ? ['cafe-4', 'cafe-0'] : mood === 'intenso' ? ['cafe-2', 'cafe-0'] : ['cafe-3', 'cafe-4', 'cafe-1'];
      const foods = catalog.filter(product => product.category === (food === 'dulce' ? 'horno' : 'cocina') && (mood !== 'vegetal' || product.vegan));
      const pairs = coffeeIds.flatMap(id => foods.map(snack => [byId.get(id), snack])).filter(pair => pair[0].cents + pair[1].cents <= cap);
      const result = q('#ritual-result'); result.hidden = false;
      if (!pairs.length) { result.textContent = 'No hay una combinación con esas preferencias y presupuesto. Prueba otra compañía o amplía el importe.'; return; }
      const pair = pairs[0], button = element('button', 'Guardar esta combinación +', 'experience-text-button'); button.type = 'button';
      result.replaceChildren(element('small', 'TU RITUAL DE HOY'), element('h3', `${pair[0].name} + ${pair[1].name}`), element('p', `${money(pair[0].cents + pair[1].cents)} · Dos cosas sencillas que combinan bien.`), button);
      button.addEventListener('click', () => { const previous = structuredClone(bag); if (pair.every(product => add({ id: product.id, quantity: 1, size: 'regular', milk: 'standard', shot: false }))) toast('Tu combinación ya está en la bolsa.'); else { bag = previous; refreshBag(); } });
    });
  }

  const visit = q('#visit-form');
  if (visit && q('#floor-tables')) {
    const tables = [{ id: 'V1', name: 'La ventana', seats: 2, description: 'Luz natural y vistas al barrio imaginado.' }, { id: 'V2', name: 'El rincón', seats: 2, description: 'Una mesa recogida para conversar.' }, { id: 'M1', name: 'La compartida', seats: 4, description: 'Espacio para una pausa en compañía.' }, { id: 'M2', name: 'La sobremesa', seats: 4, description: 'En el centro de todas las conversaciones.' }, { id: 'B1', name: 'La barra', seats: 1, description: 'Una pausa corta, cerca del café.' }, { id: 'M3', name: 'La grande', seats: 4, description: 'La mesa amplia del fondo del local.' }];
    let chosen = null;
    function renderSeats() {
      const date = visit.elements.date.value, time = visit.elements.time.value, people = Number(visit.elements.people.value);
      const occupied = [...date + time].reduce((sum, char) => sum + char.charCodeAt(0), 0) % tables.length;
      if (chosen && (chosen.seats < people || tables.indexOf(chosen) === occupied || !date || !time)) chosen = null;
      q('#floor-tables').replaceChildren(...tables.map((table, index) => {
        const unavailable = !date || !time || table.seats < people || index === occupied;
        const button = element('button'); button.type = 'button'; button.disabled = unavailable; button.dataset.table = table.id; button.setAttribute('aria-pressed', String(chosen === table)); button.setAttribute('aria-label', `${table.name}, ${table.seats} plazas${unavailable ? ', no disponible en el ejemplo' : ''}`); button.append(element('b', table.id), element('span', table.name), element('small', `${table.seats} plazas`));
        button.addEventListener('click', () => { chosen = table; q('#visit-result').hidden = true; q('.visit-extras').hidden = true; renderSeats(); }); return button;
      }));
      q('#seat-selection').textContent = chosen ? chosen.name : 'Elige un rincón'; q('#seat-description').textContent = chosen ? chosen.description : date && time ? 'Las mesas se adaptan al tamaño de tu grupo.' : 'Primero elige el día y la hora en el formulario.';
    }
    visit.addEventListener('change', renderSeats); visit.addEventListener('input', () => { q('.visit-extras').hidden = true; renderSeats(); });
    visit.addEventListener('submit', () => { if (visit.checkValidity() && !q('#visit-result').hidden) { if (chosen) q('#visit-result').textContent += ` Rincón elegido: ${chosen.name}.`; q('.visit-extras').hidden = false; } });
    q('#visit-calendar').addEventListener('click', () => {
      if (!visit.checkValidity() || q('#visit-result').hidden) return;
      const day = visit.elements.date.value.replaceAll('-', ''), time = visit.elements.time.value.replace(':', ''), end = String(Number(time.slice(0, 2)) + 1).padStart(2, '0') + time.slice(2);
      const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ivan Delgado//Miga Demo//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${crypto.randomUUID()}@miga.example.test`, `DTSTAMP:${stamp}`, `DTSTART:${day}T${time}00`, `DTEND:${day}T${end}00`, 'SUMMARY:Pausa en Miga (concepto ficticio)', `DESCRIPTION:Plan local de demostración. No confirma ninguna reserva.${chosen ? ' Mesa ' + chosen.id + '.' : ''}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
      download('mi-visita-miga.ics', content, 'text/calendar;charset=utf-8');
    }); renderSeats();
  }
  refreshBag(); refreshFavorites();
});
