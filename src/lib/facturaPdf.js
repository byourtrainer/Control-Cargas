import { jsPDF } from 'jspdf'
import { desglosarFactura } from './dinero'

// Genera el PDF de una factura con el mismo contenido que la vista de
// impresión (factura-imprimir en PanelAdmin), pero dibujado directamente con
// jsPDF: así el texto sale nítido (no es una captura de pantalla) y no
// depende de que el navegador soporte @media print.
export function generarFacturaPdfBlob(factura, config) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const anchoPagina = 210
  const margen = 20
  let y = 22

  const base = Number(factura.base_imponible) || 0
  const { iva, irpf, total: totalCalculado } = desglosarFactura(base, factura.iva_porcentaje, factura.aplica_irpf, factura.irpf_porcentaje)
  const total = Number(factura.total) || totalCalculado

  // Logo (si existe) arriba a la derecha
  if (config?.logo_base64) {
    try {
      const formato = config.logo_base64.includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(config.logo_base64, formato, anchoPagina - margen - 28, y - 6, 28, 28, undefined, 'FAST')
    } catch {
      // Si el logo no se puede decodificar, se omite sin romper el PDF.
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(factura.tipo === 'completa' ? 'FACTURA' : 'FACTURA SIMPLIFICADA', margen, y)
  y += 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS', margen, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const lineasNegocio = [config?.nombre, config?.nif, config?.direccion, config?.telefono, config?.email].filter(Boolean)
  lineasNegocio.forEach((linea) => { doc.text(String(linea), margen, y); y += 4.5 })
  if (config?.iban) {
    doc.setFont('helvetica', 'bold')
    doc.text(`IBAN: ${config.iban}`, margen, y)
    doc.setFont('helvetica', 'normal')
    y += 4.5
  }

  doc.setFont('helvetica', 'normal')
  doc.text(`Fecha: ${factura.fecha_emision?.split('-').reverse().join('/') || ''}`, anchoPagina - margen, 34, { align: 'right' })
  doc.text(`Factura: ${factura.numero_factura}`, anchoPagina - margen, 39, { align: 'right' })

  y += 4

  if (factura.tipo === 'completa') {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('CLIENTE', margen, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    const lineasCliente = [factura.cliente_nombre, factura.cliente_nif, factura.cliente_direccion, factura.cliente_ciudad_cp].filter(Boolean)
    lineasCliente.forEach((linea) => { doc.text(String(linea), margen, y); y += 4.5 })
  }

  y += 6

  // Tabla concepto / base
  const anchoTabla = anchoPagina - margen * 2
  doc.setFillColor(20, 20, 15)
  doc.rect(margen, y, anchoTabla, 9, 'F')
  doc.setTextColor(245, 243, 238)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('CONCEPTO', margen + 4, y + 6)
  doc.text('BASE IMPONIBLE', anchoPagina - margen - 4, y + 6, { align: 'right' })
  y += 9

  doc.setTextColor(20, 20, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(String(factura.concepto || ''), margen + 4, y + 8)
  doc.text(`${base.toFixed(2)}€`, anchoPagina - margen - 4, y + 8, { align: 'right' })
  y += 14

  doc.setDrawColor(20, 20, 15)
  doc.line(margen, y, anchoPagina - margen, y)
  y += 7

  doc.setFontSize(10)
  doc.text(`IVA (${factura.iva_porcentaje}%)`, anchoPagina - margen - 30, y, { align: 'right' })
  doc.text(`${iva.toFixed(2)}€`, anchoPagina - margen - 4, y, { align: 'right' })
  y += 6
  if (factura.aplica_irpf) {
    doc.text(`IRPF (-${factura.irpf_porcentaje}%)`, anchoPagina - margen - 30, y, { align: 'right' })
    doc.text(`-${irpf.toFixed(2)}€`, anchoPagina - margen - 4, y, { align: 'right' })
    y += 6
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('TOTAL', anchoPagina - margen - 30, y + 2, { align: 'right' })
  doc.text(`${total.toFixed(2)}€`, anchoPagina - margen - 4, y + 2, { align: 'right' })

  return doc.output('blob')
}

export function nombreArchivoFactura(factura) {
  return `Factura-${(factura.numero_factura || 'sin-numero').replace(/[^A-Za-z0-9-]/g, '')}.pdf`
}

export function descargarFacturaPdf(factura, config) {
  const blob = generarFacturaPdfBlob(factura, config)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivoFactura(factura)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

// Normaliza un teléfono español a formato internacional sin espacios para
// usarlo en un enlace wa.me (España: 9 dígitos -> se antepone 34).
export function normalizarTelefonoWhatsapp(telefono) {
  if (!telefono) return null
  const limpio = telefono.replace(/[^\d+]/g, '')
  if (!limpio) return null
  if (limpio.startsWith('+')) return limpio.slice(1)
  if (limpio.length === 9) return `34${limpio}`
  return limpio
}

export function mensajeWhatsappFactura(factura) {
  const mes = factura.fecha_emision
    ? new Date(factura.fecha_emision + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : ''
  const nombre = (factura.cliente_nombre || '').split(' ')[0] || factura.cliente_nombre
  return `Hola ${nombre}, aquí tienes tu factura ${factura.numero_factura}${mes ? ` de ${mes}` : ''}. Total: ${Number(factura.total).toFixed(2)}€. ¡Gracias!`
}
