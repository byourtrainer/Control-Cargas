import * as XLSX from 'xlsx'
import { desglosarFactura } from './dinero'

// Rango de fechas (inicio/fin, como 'YYYY-MM-DD') de un trimestre natural.
export function rangoTrimestre(anio, trimestre) {
  const mesInicio = (trimestre - 1) * 3 // 1T->0, 2T->3, 3T->6, 4T->9
  const inicio = new Date(anio, mesInicio, 1)
  const fin = new Date(anio, mesInicio + 3, 0)
  const f = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { desde: f(inicio), hasta: f(fin) }
}

// Desglose de IVA/IRPF de una factura ya emitida (a partir de sus columnas
// guardadas) — sin "total objetivo", igual que se muestra en la factura
// impresa, para que el resumen cuadre con lo que el cliente recibió.
function desgloseFactura(f) {
  return desglosarFactura(f.base_imponible, f.iva_porcentaje, f.aplica_irpf, f.irpf_porcentaje)
}

// Base, IVA y parte deducible de un gasto (importe guardado = total con IVA).
function desgloseGasto(g, baseAjustadaParaTotal) {
  const importe = Number(g.importe) || 0
  const ivaPorcentaje = Number(g.iva_porcentaje) || 0
  const deduciblePorcentaje = Number(g.deducible_porcentaje ?? 100)
  const base = baseAjustadaParaTotal(importe, ivaPorcentaje)
  const { iva } = desglosarFactura(base, ivaPorcentaje, false, 0, importe)
  const baseDeducible = Math.round(base * (deduciblePorcentaje / 100) * 100) / 100
  const ivaDeducible = Math.round(iva * (deduciblePorcentaje / 100) * 100) / 100
  return { base, iva, baseDeducible, ivaDeducible }
}

// Calcula los totales del trimestre (IVA repercutido/soportado, bases…)
// sin generar el Excel — se usa también para pintar el resumen en pantalla.
export function calcularResumenTrimestral(facturas, gastos, baseAjustadaParaTotal) {
  const totalesFacturas = facturas.reduce((acc, f) => {
    const { iva, irpf } = desgloseFactura(f)
    acc.baseImponible += Number(f.base_imponible) || 0
    acc.ivaRepercutido += iva
    acc.irpfRetenido += irpf
    acc.totalFacturado += Number(f.total) || 0
    return acc
  }, { baseImponible: 0, ivaRepercutido: 0, irpfRetenido: 0, totalFacturado: 0 })

  const totalesGastos = gastos.reduce((acc, g) => {
    const d = desgloseGasto(g, baseAjustadaParaTotal)
    acc.importe += Number(g.importe) || 0
    acc.baseDeducible += d.baseDeducible
    acc.ivaSoportadoDeducible += d.ivaDeducible
    return acc
  }, { importe: 0, baseDeducible: 0, ivaSoportadoDeducible: 0 })

  const ivaALiquidar = Math.round((totalesFacturas.ivaRepercutido - totalesGastos.ivaSoportadoDeducible) * 100) / 100
  const beneficioEstimado = Math.round((totalesFacturas.baseImponible - totalesGastos.baseDeducible) * 100) / 100

  // Desglose de gastos por categoría, para ver de un vistazo en qué se va el dinero.
  const porCategoria = {}
  gastos.forEach((g) => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + (Number(g.importe) || 0)
  })

  return { totalesFacturas, totalesGastos, ivaALiquidar, beneficioEstimado, porCategoria }
}

// Genera el Excel (3 hojas: Resumen, Facturas emitidas, Gastos) y lo
// descarga — pensado para enviar tal cual a la gestoría.
export function exportarResumenTrimestral({ anio, trimestre, facturas, gastos, baseAjustadaParaTotal, nombreNegocio }) {
  const r = calcularResumenTrimestral(facturas, gastos, baseAjustadaParaTotal)
  const libro = XLSX.utils.book_new()

  const filasResumen = [
    [`Resumen ${trimestre}T ${anio}${nombreNegocio ? ' — ' + nombreNegocio : ''}`],
    [],
    ['INGRESOS (facturas emitidas)'],
    ['Base imponible', r.totalesFacturas.baseImponible.toFixed(2)],
    ['IVA repercutido', r.totalesFacturas.ivaRepercutido.toFixed(2)],
    ['IRPF retenido', r.totalesFacturas.irpfRetenido.toFixed(2)],
    ['Total facturado', r.totalesFacturas.totalFacturado.toFixed(2)],
    [],
    ['GASTOS (deducibles)'],
    ['Importe total gastado', r.totalesGastos.importe.toFixed(2)],
    ['Base deducible', r.totalesGastos.baseDeducible.toFixed(2)],
    ['IVA soportado deducible', r.totalesGastos.ivaSoportadoDeducible.toFixed(2)],
    [],
    ['RESULTADO DEL TRIMESTRE'],
    ['IVA repercutido − IVA soportado = IVA a liquidar', r.ivaALiquidar.toFixed(2), r.ivaALiquidar >= 0 ? '(a ingresar)' : '(a compensar)'],
    ['Base facturada − Base deducible = Beneficio estimado (ref. IRPF)', r.beneficioEstimado.toFixed(2)],
    [],
    ['GASTOS POR CATEGORÍA'],
    ...Object.entries(r.porCategoria).map(([cat, importe]) => [cat, importe.toFixed(2)]),
  ]
  const hojaResumen = XLSX.utils.aoa_to_sheet(filasResumen)
  hojaResumen['!cols'] = [{ wch: 48 }, { wch: 14 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen')

  const filasFacturas = [
    ['Nº factura', 'Fecha', 'Cliente', 'Concepto', 'Base imponible', 'IVA %', 'IVA €', 'IRPF %', 'IRPF €', 'Total'],
    ...facturas.map((f) => {
      const { iva, irpf } = desgloseFactura(f)
      return [
        f.numero_factura, f.fecha_emision, f.cliente_nombre, f.concepto,
        Number(f.base_imponible).toFixed(2), f.iva_porcentaje, iva.toFixed(2),
        f.aplica_irpf ? f.irpf_porcentaje : 0, irpf.toFixed(2), Number(f.total).toFixed(2),
      ]
    }),
  ]
  const hojaFacturas = XLSX.utils.aoa_to_sheet(filasFacturas)
  hojaFacturas['!cols'] = [{ wch: 12 }, { wch: 11 }, { wch: 22 }, { wch: 26 }, { wch: 14 }, { wch: 7 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(libro, hojaFacturas, 'Facturas emitidas')

  const filasGastos = [
    ['Fecha', 'Proveedor', 'Concepto', 'Categoría', 'Importe (con IVA)', 'IVA %', 'Base', 'IVA €', '% Deducible', 'Base deducible', 'IVA deducible'],
    ...gastos.map((g) => {
      const d = desgloseGasto(g, baseAjustadaParaTotal)
      return [
        g.fecha, g.proveedor || '', g.concepto, g.categoria,
        Number(g.importe).toFixed(2), g.iva_porcentaje, d.base.toFixed(2), d.iva.toFixed(2),
        g.deducible_porcentaje, d.baseDeducible.toFixed(2), d.ivaDeducible.toFixed(2),
      ]
    }),
  ]
  const hojaGastos = XLSX.utils.aoa_to_sheet(filasGastos)
  hojaGastos['!cols'] = [{ wch: 11 }, { wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 15 }, { wch: 7 }, { wch: 10 }, { wch: 9 }, { wch: 11 }, { wch: 13 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(libro, hojaGastos, 'Gastos')

  XLSX.writeFile(libro, `Resumen-${trimestre}T-${anio}.xlsx`)
}
