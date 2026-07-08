const SHEET_VENDEDORES = 'Vendedores';
const SHEET_INDICADORES = 'Indicadores';
const SHEET_MEASUREMENTS = 'Mediciones';
const SHEET_DETAILS = 'Detalle';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'ping';
  if (action === 'getCatalogs') return jsonOutput({ ok: true, vendedores: listRows_(SHEET_VENDEDORES, vendedoresHeaders_()), indicadores: listRows_(SHEET_INDICADORES, indicadoresHeaders_()) });
  if (action === 'listMeasurements') return jsonOutput({ ok: true, rows: listRows_(SHEET_MEASUREMENTS, medicionesHeaders_()) });
  return jsonOutput({ ok: true, message: 'Apps Script activo' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;
    if (action === 'saveMeasurement') {
      saveMeasurement_(body.payload);
      return jsonOutput({ ok: true });
    }
    return jsonOutput({ ok: false, error: 'Acción no soportada' });
  } catch (error) {
    return jsonOutput({ ok: false, error: String(error) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function vendedoresHeaders_() { return ['id','nombre','activo']; }
function indicadoresHeaders_() { return ['id','orden','nombre','detalle','peso','activo']; }
function medicionesHeaders_() { return ['timestamp','fecha','mes','anio','vendedorId','vendedorNombre','observacion','puntajeTotal']; }
function detalleHeaders_() { return ['timestamp','fecha','vendedorId','vendedorNombre','indicadorId','indicador','peso','cumplio','puntaje']; }

function getOrCreateSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function ensureCatalogSeeds_() {
  const vend = getOrCreateSheet_(SHEET_VENDEDORES, vendedoresHeaders_());
  const ind = getOrCreateSheet_(SHEET_INDICADORES, indicadoresHeaders_());
  getOrCreateSheet_(SHEET_MEASUREMENTS, medicionesHeaders_());
  getOrCreateSheet_(SHEET_DETAILS, detalleHeaders_());

  if (vend.getLastRow() === 1) {
    vend.getRange(2, 1, 3, 3).setValues([
      ['v1', 'Vendedor 1', 'SI'],
      ['v2', 'Vendedor 2', 'SI'],
      ['v3', 'Vendedor 3', 'SI']
    ]);
  }

  if (ind.getLastRow() === 1) {
    ind.getRange(2, 1, 8, 6).setValues([
      ['i1', 1, 'Armar un perfil comercial', 'Con nombre e imagen de autotrato', 10, 'SI'],
      ['i2', 2, 'Capacitación por 3 meses', '2 meets de 1 hora por semana', 10, 'SI'],
      ['i3', 3, '3 operaciones mensuales para permanencia', 'Cumplimiento mensual', 10, 'SI'],
      ['i4', 4, '2 acciones comerciales semanales', 'Folletos, radio, visitas, etc.', 10, 'SI'],
      ['i5', 5, 'Levantar 100 datos semanales', 'Datos comprobables', 10, 'SI'],
      ['i6', 6, 'Escuchas activas a leads', '1 por semana', 10, 'SI'],
      ['i7', 7, '80% de datos trabajados', 'Indicador de gestión', 10, 'SI'],
      ['i8', 8, 'Evaluación de coordinación comercial', 'Evaluación general', 30, 'SI']
    ]);
  }
}

function listRows_(sheetName, headers) {
  ensureCatalogSeeds_();
  const sheet = getOrCreateSheet_(sheetName, headers);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const rowHeaders = values[0];
  return values.slice(1).filter(r => r.join('') !== '').map(row => Object.fromEntries(rowHeaders.map((h, i) => [h, row[i]])));
}

function saveMeasurement_(payload) {
  ensureCatalogSeeds_();
  const sheet = getOrCreateSheet_(SHEET_MEASUREMENTS, medicionesHeaders_());
  const detail = getOrCreateSheet_(SHEET_DETAILS, detalleHeaders_());
  const ts = new Date();
  sheet.appendRow([ts, payload.fecha, payload.mes, payload.anio, payload.vendedorId, payload.vendedorNombre, payload.observacion || '', payload.puntajeTotal]);
  (payload.detalle || []).forEach(item => {
    detail.appendRow([ts, payload.fecha, payload.vendedorId, payload.vendedorNombre, item.indicadorId, item.indicador, item.peso, item.cumplio ? 'SI' : 'NO', item.puntaje]);
  });
}
