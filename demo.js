document.addEventListener('DOMContentLoaded', () => {
  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const search = document.querySelector('#menu-search');
  const maximum = document.querySelector('#menu-maximum');
  const groups = [...document.querySelectorAll('.menu-group')];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  let selectedCategory = 'all';
  const applyFilters = () => {
    const query = normalize(search?.value || '');
    const amount = maximum?.value.trim();
    const cap = amount && Number.isFinite(Number(amount)) && Number(amount) >= 0 ? Number(amount) : Infinity;
    let matches = 0;
    groups.forEach(group => {
      const categoryMatches = selectedCategory === 'all' || group.classList.contains(`category-${selectedCategory}`);
      let groupMatches = 0;
      group.querySelectorAll('.menu-item').forEach(item => {
        const price = Number(item.querySelector('.menu-price').textContent.replace('€', '').trim().replace(',', '.'));
        const productId = item.querySelector('[data-product]')?.dataset.product;
        const product = window.MigaExperience?.catalog.find(product => product.id === productId);
        const preferences = (!document.querySelector('#menu-vegan')?.checked || product?.vegan) && (!document.querySelector('#menu-favorites')?.checked || window.MigaFavorites?.has(productId));
        const visible = categoryMatches && preferences && normalize(item.querySelector('.menu-item-copy').textContent).includes(query) && price <= cap;
        item.hidden = !visible;
        if (visible) { matches++; groupMatches++; }
      });
      group.hidden = groupMatches === 0;
    });
    const status = document.querySelector('#menu-status');
    if (status) status.textContent = `${matches} ${matches === 1 ? 'opción disponible' : 'opciones disponibles'}.`;
    const empty = document.querySelector('#menu-empty');
    if (empty) empty.hidden = matches !== 0;
  };
  filterButtons.forEach(button => button.addEventListener('click', () => {
    selectedCategory = button.dataset.filter;
    filterButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    applyFilters();
  }));
  search?.addEventListener('input', applyFilters);
  maximum?.addEventListener('input', applyFilters);
  document.querySelector('#menu-reset')?.addEventListener('click', () => {
    search.value = ''; maximum.value = ''; selectedCategory = 'all';
    for (const id of ['menu-vegan','menu-favorites']) { const input=document.getElementById(id); if(input)input.checked=false; }
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === 'all')));
    applyFilters(); search.focus();
  });
  if (groups.length) applyFilters();
  document.addEventListener('miga:filter', applyFilters);

  const form = document.querySelector('#visit-form');
  if (!form) return;
  const result = document.querySelector('#visit-result');
  const guest = form.elements.namedItem('guest');
  const date = form.elements.namedItem('date');
  const today = new Date();
  const localISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  date.min = localISO;
  const time = form.elements.namedItem('time');
  const updateTimes = () => {
    const selected = date.value ? new Date(`${date.value}T12:00:00`) : null;
    const weekend = selected && [0, 6].includes(selected.getDay());
    for (const option of time.options) {
      option.disabled = Boolean(option.value && weekend && Number(option.value.slice(0, 2)) >= 14);
    }
    if (time.selectedOptions[0]?.disabled) time.value = '';
  };
  date.addEventListener('change', updateTimes);
  form.addEventListener('submit', event => {
    event.preventDefault();
    guest.setCustomValidity(guest.value.trim().length >= 2 ? '' : 'Escribe al menos dos letras para el nombre.');
    date.setCustomValidity(date.value >= localISO ? '' : 'Elige hoy o una fecha posterior.');
    updateTimes();
    time.setCustomValidity(time.value ? '' : 'Elige una hora dentro del horario del concepto.');
    if (!form.reportValidity()) return;
    const formattedDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${date.value}T12:00:00`));
    result.textContent = `Así sería tu visita, ${guest.value.trim()}: ${form.elements.namedItem('people').value} persona(s), el ${formattedDate} a las ${form.elements.namedItem('time').value}. Es una simulación: no se ha reservado, enviado ni guardado nada.`;
    result.hidden = false;
    result.focus();
  });
  form.addEventListener('input', event => {
    if ('setCustomValidity' in event.target) event.target.setCustomValidity('');
    result.hidden = true;
  });
});
