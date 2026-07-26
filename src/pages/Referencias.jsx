import './Referencias.css'

export default function Referencias() {
  return (
    <div className="referencias-layout">
      <p className="referencias-intro texto-dim">
        Definición e interpretación de cada variable de carga que usa la app, con la
        referencia científica en la que se basa cada una.
      </p>

      <section className="referencia-card">
        <h2>1. Carga de entrenamiento (Training Load)</h2>
        <p><strong>Definición:</strong> RPE de la sesión (escala 0-10) × duración de la sesión en minutos.</p>
        <p>
          <strong>Interpretación:</strong> es un número en unidades arbitrarias (u.a.), sin una escala
          "buena o mala" en sí misma. Su valor está en comparar sesiones entre sí y observar la
          tendencia en el tiempo, no en juzgar un número aislado.
        </p>
        <p className="referencia-cita">
          Foster C, Florhaug JA, Franklin J, et al. A new approach to monitoring exercise training.
          <em> J Strength Cond Res.</em> 2001;15(1):109-115.
        </p>
      </section>

      <section className="referencia-card">
        <h2>2. Carga Aguda y Carga Crónica</h2>
        <p>
          <strong>Definición:</strong> la <strong>carga aguda</strong> es la carga acumulada de los
          últimos 7 días. La <strong>carga crónica</strong> es la media diaria de carga de las últimas
          3-4 semanas — el nivel de forma al que está adaptado el jugador.
        </p>
        <p>
          <strong>Interpretación:</strong> por separado no se interpretan como "altas" o "bajas" — su
          utilidad real está en la relación entre ambas, que es precisamente el ACWR (siguiente punto).
        </p>
      </section>

      <section className="referencia-card">
        <h2>3. ACWR (Ratio Carga Aguda:Crónica)</h2>
        <p>
          <strong>Definición:</strong> Carga Aguda ÷ Carga Crónica — mide cuánto se aleja la carga
          reciente del nivel al que el jugador está habituado.
        </p>
        <p>Se calcula con dos métodos, seleccionables en la app:</p>
        <ul className="referencia-lista">
          <li><strong>Clásico (Rolling Average):</strong> usando medias simples de los días de cada ventana.</li>
          <li>
            <strong>EWMA:</strong> ponderando más los días recientes que los antiguos — reacciona antes
            ante un cambio brusco de carga, ya que un pico de los últimos 2-3 días pesa más que en el
            método Clásico.
          </li>
        </ul>
        <p className="referencia-nota">La interpretación de abajo es válida para ambos métodos — es la misma escala.</p>
        <table className="referencia-tabla">
          <thead>
            <tr><th>Rango</th><th>Categoría</th><th>Qué significa</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">&lt; 0.50</td>
              <td><span className="riesgo-badge riesgo-muy_baja">Muy baja</span></td>
              <td>Carga muy por debajo de lo habitual — riesgo de pérdida de forma</td>
            </tr>
            <tr>
              <td className="mono">0.50 – 0.80</td>
              <td><span className="riesgo-badge riesgo-baja">Baja</span></td>
              <td>Por debajo de lo habitual</td>
            </tr>
            <tr>
              <td className="mono">0.80 – 1.10</td>
              <td><span className="riesgo-badge riesgo-optima">Óptima</span></td>
              <td>Zona recomendada — carga ajustada a la capacidad del jugador</td>
            </tr>
            <tr>
              <td className="mono">1.10 – 1.50</td>
              <td><span className="riesgo-badge riesgo-moderada_alta">Mod. alta</span></td>
              <td>Aumento notable, vigilar</td>
            </tr>
            <tr>
              <td className="mono">1.50 – 2.00</td>
              <td><span className="riesgo-badge riesgo-alta">Alta</span></td>
              <td>Riesgo elevado de lesión por sobrecarga</td>
            </tr>
            <tr>
              <td className="mono">&gt; 2.00</td>
              <td><span className="riesgo-badge riesgo-muy_alta">Muy alta</span></td>
              <td>Pico de carga muy por encima de lo tolerado — riesgo alto</td>
            </tr>
          </tbody>
        </table>
        <p className="referencia-cita">
          Gabbett TJ. The training-injury prevention paradox: should athletes be training smarter and
          harder? <em>Br J Sports Med.</em> 2016;50(5):273-280.
        </p>
        <p className="referencia-cita">
          Hulin BT, Gabbett TJ, Lawson DW, et al. The acute:chronic workload ratio predicts injury: high
          chronic workload may decrease injury risk in elite rugby league players.
          <em> Br J Sports Med.</em> 2016;50(4):231-236.
        </p>
        <p className="referencia-cita">
          Williams S, West S, Cross MJ, Stokes KA. Better way to determine the acute:chronic workload
          ratio? <em>Br J Sports Med.</em> 2017;51(3):209-210.
        </p>
        <p className="referencia-cita">
          Murray NB, Gabbett TJ, Townshend AD, Blanch P. Calculating acute:chronic workload ratios using
          exponentially weighted moving averages provides a more sensitive indicator of injury
          likelihood than rolling averages. <em>Br J Sports Med.</em> 2017;51(9):749-754.
        </p>
      </section>

      <section className="referencia-card">
        <h2>4. Monotonía y Fatiga (Strain)</h2>
        <p>
          <strong>Definición:</strong> Monotonía = media diaria semanal ÷ desviación estándar semanal.
          Fatiga (Strain) = carga semanal × monotonía.
        </p>
        <table className="referencia-tabla">
          <thead>
            <tr><th>Monotonía</th><th>Categoría</th><th>Qué significa</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">&lt; 1</td>
              <td><span className="monotonia-badge monotonia-muy_variable">Muy variable</span></td>
              <td>Carga muy distinta día a día (normal, saludable)</td>
            </tr>
            <tr>
              <td className="mono">1 – 2</td>
              <td><span className="monotonia-badge monotonia-correcta">Correcta</span></td>
              <td>Variabilidad adecuada</td>
            </tr>
            <tr>
              <td className="mono">2 – 2.5</td>
              <td><span className="monotonia-badge monotonia-elevada">Elevada</span></td>
              <td>Semana muy uniforme, poca variación entre días</td>
            </tr>
            <tr>
              <td className="mono">&gt; 2.5</td>
              <td><span className="monotonia-badge monotonia-riesgo_elevado">Riesgo elevado</span></td>
              <td>Carga casi idéntica cada día, sin descansos claros — más riesgo de enfermedad/sobreentrenamiento</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Fatiga (Strain):</strong> no tiene un umbral fijo universal — se interpreta comparando
          la fatiga actual del jugador con sus propias semanas anteriores. Un salto brusco respecto a su
          media habitual es la señal de alerta, no un número concreto.
        </p>
        <p className="referencia-cita">
          Foster C. Monitoring training in athletes with reference to overtraining syndrome.
          <em> Med Sci Sports Exerc.</em> 1998;30(7):1164-1168.
        </p>
      </section>

      <section className="referencia-card">
        <h2>5. Bienestar (estilo Índice de Hooper)</h2>
        <p>
          <strong>Definición:</strong> media de sueño, fatiga, dolor muscular, estrés y ánimo,
          invirtiendo sueño y ánimo (donde un valor alto es bueno) antes de promediar.
        </p>
        <table className="referencia-tabla">
          <thead>
            <tr><th>Malestar medio (1-5)</th><th>Categoría</th><th>Qué significa</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="mono">≤ 2</td>
              <td><span className="bienestar-badge bienestar-optimo">Óptimo</span></td>
              <td>El jugador se encuentra bien, buena recuperación</td>
            </tr>
            <tr>
              <td className="mono">2 – 3</td>
              <td><span className="bienestar-badge bienestar-bueno">Bueno</span></td>
              <td>Estado aceptable, sin señales de alarma</td>
            </tr>
            <tr>
              <td className="mono">&gt; 3</td>
              <td><span className="bienestar-badge bienestar-malo">Malo</span></td>
              <td>Señales de mala recuperación — revisar carga, sueño o estrés del jugador</td>
            </tr>
          </tbody>
        </table>
        <p className="referencia-cita">
          Hooper SL, Mackinnon LT. Monitoring overtraining in athletes: recommendations.
          <em> Sports Med.</em> 1995;20(5):321-327.
        </p>
      </section>
    </div>
  )
}
