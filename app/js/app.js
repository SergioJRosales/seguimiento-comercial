let vendedores = [];
let indicadores = [];
let mediciones = [];
let chart;

function setStatus(msg) { document.getElementById('statusText').textContent = msg; }
function getMesNombre(m) { return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1] || ''; }
function formatFechaHoy() { return new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }

function validarConfig() {
  if (!window.APP_CONFIG || !APP_CONFIG.appsScriptUrl || APP_CONFIG.appsScriptUrl === 'PEGAR_AQUI_TU_WEB_APP_URL') {
    throw new Error('Falta configurar la URL del Web App de Apps Script en app/js/config.js');
  }
}

function popularFiltrosFijos() {
  document.getElementById('filtroMes').innerHTML = `<option value="">Todos</option>` + Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${getMesNombre(i + 1)}</option>`).join('');
  const anio = new Date().getFullYear();
  document.getElementById('filtroAnio').innerHTML = `<option value="${anio}">${anio}</option><option value="${anio - 1}">${anio - 1}</option>`;
}

function renderVendedores() {
  const activos = vendedores.filter(v => String(v.activo).toUpperCase() !== 'NO');
  const opts = activos.map(v => `<option value="${v.id}">${v.nombre}</option>`).join('');
  document.getElementById('vendedorSelect').innerHTML = opts || '<option value="">Sin vendedores</option>';
  document.getElementById('filtroVendedor').innerHTML = '<option value="">Todos</option>' + opts;
}

function renderIndicadores() {
  const wrap = document.getElementById('indicadoresWrap');
  const activos = indicadores
    .filter(i => String(i.activo).toUpperCase() !== 'NO')
    .sort((a, b) => Number(a.orden || 999) - Number(b.orden || 999));

  wrap.innerHTML = activos.length ? activos.map(ind => `
    <article class="ind-card" data-id="${ind.id}" data-peso="${Number(ind.peso || 0)}" data-nombre="${ind.nombre}">
      <div class="ind-head">
        <div>
          <div class="ind-title">${ind.orden || ''}. ${ind.nombre}</div>
          <div class="ind-meta">${ind.detalle || ''}</div>
        </div>
        <span class="pill">${Number(ind.peso || 0)}%</span>
      </div>
      <div class="toggle-row">
        <button type="button" class="yn-btn" data-value="1" data-indicador="${ind.id}">Sí cumplió</button>
        <button type="button" class="yn-btn" data-value="0" data-indicador="${ind.id}">No cumplió</button>
      </div>
    </article>
  `).join('') : '<div class="info-box">No hay indicadores activos en Google Sheets.</div>';

  document.querySelectorAll('.yn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const indicadorId = btn.dataset.indicador;
      const value = btn.dataset.value;
      document.querySelectorAll(`.yn-btn[data-indicador="${indicadorId}"]`).forEach(b => {
        b.classList.remove('active-yes', 'active-no');
        if (b.dataset.value === '1' && value === '1') b.classList.add('active-yes');
        if (b.dataset.value === '0' && value === '0') b.classList.add('active-no');
      });
      document.querySelector(`.ind-card[data-id="${indicadorId}"]`).dataset.estado = value;
    });
  });
}

function limpiarFormulario() {
  document.getElementById('fechaMedicion').value = new Date().toISOString().split('T')[0];
  document.getElementById('observacionGeneral').value = '';
  document.querySelectorAll('.ind-card').forEach(card => card.dataset.estado = '');
  document.querySelectorAll('.yn-btn').forEach(btn => btn.classList.remove('active-yes', 'active-no'));
}

async function fetchJSON(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || 'Error en la consulta');
  return data;
}

async function cargarCatalogos() {
  try {
    validarConfig();
    setStatus('Cargando catálogos desde Google Sheets...');
    const data = await fetchJSON(`${APP_CONFIG.appsScriptUrl}?action=getCatalogs`);
    vendedores = Array.isArray(data.vendedores) ? data.vendedores : [];
    indicadores = Array.isArray(data.indicadores) ? data.indicadores : [];
    renderVendedores();
    renderIndicadores();
    limpiarFormulario();
    setStatus(`Catálogos cargados: ${vendedores.length} vendedores, ${indicadores.length} indicadores.`);
  } catch (error) {
    setStatus(error.message);
    alert(error.message);
  }
}

function buildPayload() {
  const fecha = document.getElementById('fechaMedicion').value;
  const vendedorId = document.getElementById('vendedorSelect').value;
  const vendedorNombre = vendedores.find(v => v.id === vendedorId)?.nombre || '';
  const observacion = document.getElementById('observacionGeneral').value;
  if (!fecha || !vendedorId) throw new Error('Completá fecha y vendedor.');
  const date = new Date(fecha + 'T00:00:00');
  const cards = [...document.querySelectorAll('.ind-card')];
  const detalle = cards.map(card => {
    const indicadorId = card.dataset.id;
    const indicador = card.dataset.nombre;
    const peso = Number(card.dataset.peso || 0);
    const cumplio = card.dataset.estado === '1';
    return { indicadorId, indicador, peso, cumplio, puntaje: cumplio ? peso : 0 };
  });
  const puntajeTotal = detalle.reduce((acc, item) => acc + item.puntaje, 0);
  return {
    fecha,
    mes: date.getMonth() + 1,
    anio: date.getFullYear(),
    vendedorId,
    vendedorNombre,
    observacion,
    puntajeTotal,
    detalle
  };
}

async function guardarMedicion() {
  try {
    validarConfig();
    const payload = buildPayload();
    setStatus('Guardando medición en Google Sheets...');
    const data = await fetchJSON(APP_CONFIG.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'saveMeasurement', payload })
    });
    if (!data.ok) throw new Error(data.error || 'No se pudo guardar');
    setStatus('Medición guardada correctamente.');
    limpiarFormulario();
    await cargarMediciones();
  } catch (error) {
    setStatus(error.message);
    alert(error.message);
  }
}

async function cargarMediciones() {
  try {
    validarConfig();
    setStatus('Sincronizando mediciones...');
    const data = await fetchJSON(`${APP_CONFIG.appsScriptUrl}?action=listMeasurements`);
    mediciones = Array.isArray(data.rows) ? data.rows : [];
    renderDashboard();
    setStatus(`Dashboard actualizado con ${mediciones.length} mediciones.`);
  } catch (error) {
    setStatus(error.message);
  }
}

function renderDashboard() {
  const mes = document.getElementById('filtroMes').value ? Number(document.getElementById('filtroMes').value) : null;
  const anio = Number(document.getElementById('filtroAnio').value);
  const vendedorId = document.getElementById('filtroVendedor').value || null;
  const rows = mediciones.filter(m => (!mes || Number(m.mes) === mes) && (!vendedorId || m.vendedorId === vendedorId) && Number(m.anio) === anio);

  const resumen = {};
  rows.forEach(r => {
    const key = `${r.vendedorNombre}-${r.mes}-${r.anio}`;
    if (!resumen[key]) resumen[key] = { vendedor: r.vendedorNombre, mes: Number(r.mes), anio: Number(r.anio), puntajes: [] };
    resumen[key].puntajes.push(Number(r.puntajeTotal));
  });

  const data = Object.values(resumen).map(item => ({
    vendedor: item.vendedor,
    mes: item.mes,
    anio: item.anio,
    puntaje: Number((item.puntajes.reduce((a, b) => a + b, 0) / item.puntajes.length).toFixed(2))
  }));

  document.getElementById('kpiMediciones').textContent = rows.length;
  document.getElementById('kpiVendedores').textContent = new Set(rows.map(r => r.vendedorId)).size;
  const promedio = data.length ? data.reduce((a, b) => a + b.puntaje, 0) / data.length : 0;
  document.getElementById('kpiPromedio').textContent = `${promedio.toFixed(1)}%`;

  const tbody = document.querySelector('#tablaResumen tbody');
  tbody.innerHTML = data.length ? data.map(r => `<tr><td>${r.vendedor}</td><td>${getMesNombre(r.mes)}</td><td>${r.anio}</td><td>${r.puntaje}%</td></tr>`).join('') : '<tr><td colspan="4">Sin mediciones para el filtro seleccionado.</td></tr>';

  const labels = data.map(d => `${d.vendedor} · ${getMesNombre(d.mes)}`);
  const values = data.map(d => d.puntaje);
  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('chartMensual'), {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Puntaje mensual', data: values, backgroundColor: '#e91e8c', borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('fechaActual').textContent = `Actualizado ${formatFechaHoy()}`;
  popularFiltrosFijos();
  limpiarFormulario();
  renderDashboard();
  document.getElementById('guardarMedicion').addEventListener('click', guardarMedicion);
  document.getElementById('sincronizarDatos').addEventListener('click', cargarMediciones);
  document.getElementById('limpiarFormulario').addEventListener('click', limpiarFormulario);
  document.getElementById('recargarCatalogos').addEventListener('click', cargarCatalogos);
  document.getElementById('filtroMes').addEventListener('change', renderDashboard);
  document.getElementById('filtroAnio').addEventListener('change', renderDashboard);
  document.getElementById('filtroVendedor').addEventListener('change', renderDashboard);
  try {
    await cargarCatalogos();
    await cargarMediciones();
  } catch (e) {}
});
