# Implementación administrable con Google Sheets

## Hojas usadas
- `Vendedores`
- `Indicadores`
- `Mediciones`
- `Detalle`

## Estructura esperada
### Vendedores
| id | nombre | activo |
|---|---|---|
| v1 | Vendedor 1 | SI |

### Indicadores
| id | orden | nombre | detalle | peso | activo |
|---|---|---|---|---|---|
| i1 | 1 | Indicador | Detalle | 10 | SI |

## Pasos
1. Crear una Google Sheet nueva.
2. Abrir `Extensiones > Apps Script`.
3. Pegar el contenido de `apps-script/Code.gs`.
4. Guardar el proyecto.
5. Implementar como `Web app`.
6. Elegir `Ejecutar como: yo` y `Acceso: cualquier persona con el enlace`.
7. Copiar la URL del Web App.
8. Pegar la URL en `app/js/config.js`.
9. Subir este proyecto a GitHub.
10. Activar GitHub Pages.

## Cómo administrar
- Para desactivar un vendedor, poner `NO` en la columna `activo`.
- Para desactivar un indicador, poner `NO` en la columna `activo`.
- Para cambiar el orden visual, editar la columna `orden`.
- Para cambiar ponderación, editar `peso`.

## Comportamiento
La primera vez que corra el Apps Script, crea automáticamente las hojas y carga datos semilla si están vacías.
