// Redondeo monetario en céntimos enteros — evita los clásicos 79,99€ o
// 100,01€ que salen de encadenar operaciones con decimales en JavaScript.

// Dada una base imponible, un % de IVA y (opcionalmente) un % de IRPF,
// devuelve el IVA, el IRPF y el total ya redondeados a céntimo, calculados
// en céntimos enteros para que sumen exacto.
//
// Si se pasa `totalObjetivo` (p. ej. el importe redondo que el cliente debe
// pagar: 80€, 100€…), el total se fija a ese valor exacto y es el IVA quien
// absorbe el céntimo de redondeo — con solo 2 decimales de base no existe,
// en general, una base cuyo IVA calculado "hacia delante" reproduzca un
// total redondo (ver baseAjustadaParaTotal). Esto es lo mismo que hace
// cualquier programa de facturación: el total manda, el desglose se ajusta.
export function desglosarFactura(baseImponible, ivaPorcentaje, aplicaIrpf, irpfPorcentaje, totalObjetivo = null) {
  const baseCents = Math.round((Number(baseImponible) || 0) * 100)
  const irpfCents = aplicaIrpf ? Math.round(baseCents * (Number(irpfPorcentaje) / 100)) : 0

  if (totalObjetivo != null) {
    const totalCents = Math.round(Number(totalObjetivo) * 100)
    const ivaCents = totalCents - baseCents + irpfCents
    return { iva: ivaCents / 100, irpf: irpfCents / 100, total: totalCents / 100 }
  }

  const ivaCents = Math.round(baseCents * (Number(ivaPorcentaje) / 100))
  const totalCents = baseCents + ivaCents - irpfCents
  return { iva: ivaCents / 100, irpf: irpfCents / 100, total: totalCents / 100 }
}

// Mejor aproximación en céntimos de la base imponible para un total e IVA
// dados (base ≈ total / (1 + IVA%)). Con solo 2 decimales de base, NINGÚN
// valor exacto reproduce el total original al aplicarle el IVA de nuevo
// (p. ej. para 80€ al 21%, ni 66,11€ ni 66,12€ dan exactamente 80,00€) —
// por eso el total final se fija con desglosarFactura(objetivoTotal: …)
// en vez de recalcularlo desde esta base.
export function baseAjustadaParaTotal(totalObjetivo, ivaPorcentaje) {
  const total = Number(totalObjetivo) || 0
  const factor = 1 + Number(ivaPorcentaje) / 100
  return Math.round((total / factor) * 100) / 100
}
