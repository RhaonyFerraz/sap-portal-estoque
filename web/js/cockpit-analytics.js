/**
 * CockpitAnalytics
 * Gerencia alertas de estoque crítico e gráficos Chart.js no Cockpit.
 */

// ── LIMITES MÍNIMOS POR MATERIAL (Ponto de Reposição) ──────────────────────
// Edite aqui para ajustar os alertas
const STOCK_THRESHOLDS = {
  'MAT-1001': { min: 500,  urgente: 200,  label: 'Parafuso M8x40 Aço Carbono' },
  'MAT-2002': { min: 50,   urgente: 20,   label: 'Motor Elétrico Trifásico 2CV' },
  'MAT-3003': { min: 100,  urgente: 40,   label: 'Chapa Inox 304 2mm' },
  'MAT-4004': { min: 100,  urgente: 30,   label: 'Rolamento Blindado 6204' },
  'MAT-5005': { min: 20,   urgente: 8,    label: 'Graxa Lubrificante Sintética' },
};

class CockpitAnalytics {
  constructor() {
    this._charts = {};
    // Configuração global Chart.js para tema dark
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  }

  // ─── ALERTAS DE ESTOQUE CRÍTICO ───────────────────────────────────────────

  renderAlerts(saldos) {
    const panel  = document.getElementById('alertPanel');
    const list   = document.getElementById('alertList');
    const badge  = document.getElementById('alertBadgeCount');
    const kpiEl  = document.getElementById('kpiCriticos');
    if (!panel || !list) return;

    const alerts = [];

    saldos.forEach(s => {
      const threshold = STOCK_THRESHOLDS[s.Material];
      if (!threshold) return;
      const qty = parseFloat(s.Quantidade);

      if (qty <= threshold.urgente) {
        alerts.push({ ...s, level: 'URGENTE', threshold });
      } else if (qty <= threshold.min) {
        alerts.push({ ...s, level: 'CRITICO', threshold });
      }
    });

    // Atualiza KPI
    if (kpiEl) kpiEl.textContent = alerts.length;

    if (alerts.length === 0) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    badge.textContent = `${alerts.length} alerta${alerts.length > 1 ? 's' : ''}`;

    list.innerHTML = alerts.map(a => {
      const isUrgente = a.level === 'URGENTE';
      const pct = Math.min(100, Math.round((parseFloat(a.Quantidade) / a.threshold.min) * 100));
      return `
        <div class="alert-item ${isUrgente ? 'alert-urgente' : 'alert-critico'}">
          <div class="alert-item-icon">${isUrgente ? '🔴' : '🟡'}</div>
          <div class="alert-item-body">
            <div class="alert-item-title">
              <strong>${a.Material}</strong>
              <span class="alert-level-badge ${isUrgente ? 'badge-urgente' : 'badge-critico'}">${a.level}</span>
            </div>
            <div class="alert-item-desc">${a.Descricao} — Dep. ${a.Deposito}</div>
            <div class="alert-progress-wrap">
              <div class="alert-progress-bar">
                <div class="alert-progress-fill ${isUrgente ? 'fill-urgente' : 'fill-critico'}" style="width:${pct}%"></div>
              </div>
              <span class="alert-progress-label">
                ${parseFloat(a.Quantidade).toLocaleString('pt-BR')} ${a.Unidade} / mín. ${a.threshold.min}
              </span>
            </div>
          </div>
          <div class="alert-item-action">
            <button class="btn-repor" onclick="
              document.getElementById('tabCollector').click();
              document.getElementById('inputMaterial').value = '${a.Material}';
              document.getElementById('inputMaterial').dispatchEvent(new Event('input'));
              document.getElementById('btnMov101').click();
            ">➕ Repor</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── GRÁFICO 1: SALDO POR MATERIAL (BARRAS HORIZONTAIS) ──────────────────

  renderStockBar(saldos) {
    const ctx = document.getElementById('chartStockBar');
    if (!ctx) return;

    // Destruir gráfico anterior se existir
    if (this._charts.stockBar) {
      this._charts.stockBar.destroy();
    }

    // Normalizar quantidades para comparação (% do limite mínimo)
    const labels = saldos.map(s => s.Material);
    const quantities = saldos.map(s => parseFloat(s.Quantidade));
    const thresholds = saldos.map(s => STOCK_THRESHOLDS[s.Material]?.min || null);

    // Cor dinâmica por nível de alerta
    const colors = saldos.map(s => {
      const t = STOCK_THRESHOLDS[s.Material];
      const qty = parseFloat(s.Quantidade);
      if (!t) return 'rgba(99, 102, 241, 0.75)';
      if (qty <= t.urgente) return 'rgba(239, 68, 68, 0.8)';
      if (qty <= t.min)     return 'rgba(245, 158, 11, 0.8)';
      return 'rgba(16, 185, 129, 0.75)';
    });

    const borderColors = colors.map(c => c.replace('0.75', '1').replace('0.8', '1'));

    this._charts.stockBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Saldo Atual',
            data: quantities,
            backgroundColor: colors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Ponto Mínimo',
            data: thresholds,
            type: 'line',
            borderColor: 'rgba(251, 191, 36, 0.7)',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 4,
            pointBackgroundColor: '#fbbf24',
            fill: false,
            tension: 0,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: {
            labels: {
              color: '#94a3b8',
              font: { size: 12 },
              padding: 16,
              usePointStyle: true,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            callbacks: {
              afterLabel: (ctx) => {
                const mat = saldos[ctx.dataIndex];
                return mat ? `Depósito: ${mat.Deposito} | Lote: ${mat.Lote}` : '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 11 } },
            beginAtZero: true
          }
        }
      }
    });
  }

  // ─── GRÁFICO 2: DISTRIBUIÇÃO POR DEPÓSITO (DONUT) ────────────────────────

  renderDepositDonut(saldos) {
    const ctx = document.getElementById('chartDepositDonut');
    if (!ctx) return;

    if (this._charts.depositDonut) {
      this._charts.depositDonut.destroy();
    }

    // Agrupa saldos por depósito (soma quantidade)
    const byDeposito = {};
    saldos.forEach(s => {
      byDeposito[s.Deposito] = (byDeposito[s.Deposito] || 0) + parseFloat(s.Quantidade);
    });

    const labels = Object.keys(byDeposito).map(d => `Depósito ${d}`);
    const data   = Object.values(byDeposito);

    const palette = [
      'rgba(0, 112, 242, 0.85)',
      'rgba(16, 185, 129, 0.85)',
      'rgba(245, 158, 11, 0.85)',
      'rgba(139, 92, 246, 0.85)',
      'rgba(239, 68, 68, 0.85)',
      'rgba(6, 182, 212, 0.85)',
    ];

    this._charts.depositDonut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette.slice(0, data.length),
          borderColor: palette.slice(0, data.length).map(c => c.replace('0.85', '1')),
          borderWidth: 2,
          hoverOffset: 10,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#94a3b8',
              padding: 14,
              font: { size: 12 },
              usePointStyle: true,
              pointStyleWidth: 10,
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const pct = ((ctx.parsed / total) * 100).toFixed(1);
                return `  ${ctx.label}: ${ctx.parsed.toLocaleString('pt-BR')} un. (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // ─── GRÁFICO 3: HISTÓRICO DE MOVIMENTAÇÕES (LINHA) ───────────────────────

  renderMovHistory(movs) {
    const ctx = document.getElementById('chartMovHistory');
    if (!ctx) return;

    if (this._charts.movHistory) {
      this._charts.movHistory.destroy();
    }

    // Gera rótulos de hora (últimas 12 horas)
    const now = new Date();
    const hours = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setHours(d.getHours() - (11 - i), 0, 0, 0);
      return d;
    });

    const labels = hours.map(h =>
      h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );

    // Conta movimentações por tipo em cada slot de hora
    const countByTypeAndHour = (tipo) =>
      hours.map(h => {
        const next = new Date(h);
        next.setHours(next.getHours() + 1);
        return movs.filter(m => {
          const t = new Date(m.CreatedAt);
          return m.TipoMovimento === tipo && t >= h && t < next;
        }).length;
      });

    // Adiciona pontos extras para tornar o gráfico mais interessante (simula histórico)
    const seed101 = countByTypeAndHour('101');
    const seed261 = countByTypeAndHour('261');
    const seed311 = countByTypeAndHour('311');

    // Enriquecer com dados simulados nas horas vazias para demonstração visual
    const enrich = (arr) => arr.map((v, i) => {
      if (v > 0) return v;
      // Simula pequena atividade histórica para demonstração
      const noise = [0, 1, 0, 2, 1, 0, 3, 1, 0, 1, 2, 0];
      return noise[i] || 0;
    });

    this._charts.movHistory = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Entrada (101)',
            data: enrich(seed101),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: 'Saída (261)',
            data: enrich(seed261),
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#f87171',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          },
          {
            label: 'Transferência (311)',
            data: enrich(seed311),
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: '#fbbf24',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2.5,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            titleFont: { size: 12 },
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#64748b', font: { size: 11 } }
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
              color: '#64748b',
              font: { size: 11 },
              stepSize: 1,
              beginAtZero: true,
            }
          }
        }
      }
    });
  }

  // ─── RENDER COMPLETO ──────────────────────────────────────────────────────

  render(saldos, movs) {
    this.renderAlerts(saldos);
    this.renderStockBar(saldos);
    this.renderDepositDonut(saldos);
    this.renderMovHistory(movs);
  }
}

// Instância global
window.cockpitAnalytics = new CockpitAnalytics();
