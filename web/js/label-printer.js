/**
 * LabelPrinterService
 * Gera e imprime etiquetas de estoque industrial com código de barras.
 * Utiliza JsBarcode (carregado via CDN no HTML).
 */
class LabelPrinterService {
  constructor() {
    this.modal = null;
    this.currentData = null;
    this._init();
  }

  _init() {
    this.modal = document.getElementById('labelPrintModal');
    if (!this.modal) return;

    // Fechar modal
    document.getElementById('btnCloseLabelModal').addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelLabel').addEventListener('click', () => this.closeModal());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    // Botão de impressão
    document.getElementById('btnPrintLabel').addEventListener('click', () => this._triggerPrint());

    // Quantidade de cópias
    document.getElementById('labelCopies').addEventListener('change', (e) => {
      this._updateCopiesPreview(parseInt(e.target.value) || 1);
    });

    // Opções de campos
    ['labelShowLote', 'labelShowCentro', 'labelShowDeposito', 'labelShowQtd', 'labelShowDesc'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this._refreshPreview());
    });

    console.log('[LabelPrinter] Serviço de etiquetas inicializado.');
  }

  /**
   * Abre o modal com dados de um item de estoque.
   * @param {object} data - { material, descricao, centro, deposito, lote, quantidade, unidade, ultimo_movimento }
   */
  openModal(data) {
    this.currentData = data;
    this._refreshPreview();
    this.modal.style.display = 'flex';
    document.body.classList.add('label-modal-open');

    // Animar entrada
    requestAnimationFrame(() => {
      this.modal.querySelector('.label-dialog').style.transform = 'scale(1)';
      this.modal.querySelector('.label-dialog').style.opacity = '1';
    });
  }

  closeModal() {
    const dialog = this.modal.querySelector('.label-dialog');
    dialog.style.transform = 'scale(0.95)';
    dialog.style.opacity = '0';
    setTimeout(() => {
      this.modal.style.display = 'none';
      document.body.classList.remove('label-modal-open');
    }, 200);
  }

  _refreshPreview() {
    if (!this.currentData) return;
    const data = this.currentData;

    const showLote = document.getElementById('labelShowLote')?.checked !== false;
    const showCentro = document.getElementById('labelShowCentro')?.checked !== false;
    const showDeposito = document.getElementById('labelShowDeposito')?.checked !== false;
    const showQtd = document.getElementById('labelShowQtd')?.checked !== false;
    const showDesc = document.getElementById('labelShowDesc')?.checked !== false;

    // Preencher campos visuais da etiqueta
    document.getElementById('lblMaterial').textContent = data.material || '-';
    document.getElementById('lblDescricao').textContent = showDesc ? (data.descricao || '-') : '';
    document.getElementById('lblDescricaoRow').style.display = showDesc ? '' : 'none';

    document.getElementById('lblLoteRow').style.display = showLote ? '' : 'none';
    document.getElementById('lblLote').textContent = data.lote || '-';

    document.getElementById('lblCentroRow').style.display = showCentro ? '' : 'none';
    document.getElementById('lblCentro').textContent = data.centro || '-';

    document.getElementById('lblDepositoRow').style.display = showDeposito ? '' : 'none';
    document.getElementById('lblDeposito').textContent = data.deposito || '-';

    document.getElementById('lblQtdRow').style.display = showQtd ? '' : 'none';
    document.getElementById('lblQtd').textContent = showQtd
      ? `${parseFloat(data.quantidade || 0).toLocaleString('pt-BR')} ${data.unidade || 'UN'}`
      : '';

    // Data/hora de impressão
    const now = new Date();
    document.getElementById('lblDataImpressao').textContent =
      now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Tipo de movimento badge
    const movBadge = document.getElementById('lblMovBadge');
    const mov = data.ultimo_movimento || '';
    const movMap = { '101': { label: 'ENT 101', color: '#10b981' }, '261': { label: 'SAÍ 261', color: '#f59e0b' }, '311': { label: 'TRF 311', color: '#6366f1' } };
    const movInfo = movMap[mov] || { label: mov || 'EST', color: '#64748b' };
    movBadge.textContent = movInfo.label;
    movBadge.style.backgroundColor = movInfo.color;

    // Gerar código de barras
    this._generateBarcode(data.material);
  }

  _generateBarcode(code) {
    if (!code) return;

    const svgEl = document.getElementById('labelBarcodeSvg');
    if (!svgEl) return;

    try {
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode(svgEl, code, {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 13,
          fontOptions: 'bold',
          margin: 8,
          background: '#ffffff',
          lineColor: '#0f172a',
          textMargin: 4,
        });
      } else {
        // Fallback: texto simples se JsBarcode não carregou
        svgEl.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="14" fill="#0f172a">${code}</text>`;
      }
    } catch (err) {
      console.warn('[LabelPrinter] Erro ao gerar barcode:', err);
    }
  }

  _updateCopiesPreview(copies) {
    document.getElementById('labelCopiesDisplay').textContent = `${copies} cópia${copies > 1 ? 's' : ''}`;
  }

  _triggerPrint() {
    const copies = parseInt(document.getElementById('labelCopies')?.value) || 1;

    // Criar janela de impressão dedicada
    const printWin = window.open('', '_blank', 'width=600,height=700');
    if (!printWin) {
      alert('Pop-up bloqueado. Permita pop-ups para imprimir.');
      return;
    }

    const labelHTML = document.getElementById('labelPreviewCard').outerHTML;
    const svgContent = document.getElementById('labelBarcodeSvg').outerHTML;

    // Replicar etiqueta para o número de cópias
    let labelsHTML = '';
    for (let i = 0; i < copies; i++) {
      labelsHTML += `<div class="label-print-unit">${labelHTML}</div>`;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Etiquetas - ${this.currentData?.material || ''}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; background: white; }

          .label-print-unit {
            width: 90mm;
            min-height: 55mm;
            border: 2px solid #0f172a;
            border-radius: 6px;
            padding: 8px 10px;
            margin: 6mm auto;
            page-break-inside: avoid;
            background: white;
          }

          .label-print-unit .lp-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 5px;
          }
          .label-print-unit .lp-company { font-size: 7pt; color: #64748b; font-weight: bold; }
          .label-print-unit .lp-mov-badge {
            font-size: 7pt; font-weight: bold; color: white;
            padding: 2px 6px; border-radius: 3px; background: #10b981;
          }

          .label-print-unit .lp-material {
            font-size: 18pt; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;
          }
          .label-print-unit .lp-descricao {
            font-size: 8pt; color: #475569; margin-bottom: 4px; line-height: 1.2;
          }

          .label-print-unit .lp-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3px 8px;
            margin-top: 4px;
          }
          .label-print-unit .lp-info-item label {
            display: block; font-size: 6pt; color: #94a3b8; text-transform: uppercase; font-weight: bold;
          }
          .label-print-unit .lp-info-item span {
            font-size: 9pt; color: #1e293b; font-weight: 600;
          }
          .label-print-unit .lp-qty-highlight {
            font-size: 13pt; font-weight: 900; color: #0070f2;
          }

          .label-print-unit .lp-barcode {
            text-align: center;
            margin-top: 6px;
          }
          .label-print-unit .lp-barcode svg { max-width: 100%; height: auto; }

          .label-print-unit .lp-footer {
            display: flex; justify-content: space-between;
            font-size: 6pt; color: #94a3b8; margin-top: 4px;
            border-top: 1px solid #f1f5f9; padding-top: 3px;
          }

          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label-print-unit { margin: 4mm auto; }
          }
        </style>
      </head>
      <body>
        ${this._buildPrintLabels(copies)}
        <script>
          window.onload = function() { window.print(); setTimeout(() => window.close(), 500); };
        <\/script>
      </body>
      </html>
    `);

    printWin.document.close();
  }

  _buildPrintLabels(copies) {
    const d = this.currentData;
    if (!d) return '';

    const showLote = document.getElementById('labelShowLote')?.checked !== false;
    const showCentro = document.getElementById('labelShowCentro')?.checked !== false;
    const showDeposito = document.getElementById('labelShowDeposito')?.checked !== false;
    const showQtd = document.getElementById('labelShowQtd')?.checked !== false;
    const showDesc = document.getElementById('labelShowDesc')?.checked !== false;

    const movMap = { '101': { label: 'ENT 101', color: '#10b981' }, '261': { label: 'SAÍ 261', color: '#f59e0b' }, '311': { label: 'TRF 311', color: '#6366f1' } };
    const movInfo = movMap[d.ultimo_movimento] || { label: 'ESTOQUE', color: '#64748b' };
    const now = new Date();
    const dataStr = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Gerar barcode SVG inline
    let barcodeSVG = '';
    try {
      const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      if (typeof JsBarcode !== 'undefined') {
        JsBarcode(svgEl, d.material, { format: 'CODE128', width: 1.8, height: 50, displayValue: true, fontSize: 11, margin: 6, background: '#ffffff', lineColor: '#0f172a' });
        barcodeSVG = svgEl.outerHTML;
      }
    } catch (e) {}

    let labels = '';
    for (let i = 0; i < copies; i++) {
      labels += `
        <div class="label-print-unit">
          <div class="lp-header">
            <span class="lp-company">SAP BTP | PORTAL ESTOQUE RF</span>
            <span class="lp-mov-badge" style="background:${movInfo.color}">${movInfo.label}</span>
          </div>
          <div class="lp-material">${d.material || '-'}</div>
          ${showDesc ? `<div class="lp-descricao">${d.descricao || '-'}</div>` : ''}
          <div class="lp-info-grid">
            ${showLote ? `<div class="lp-info-item"><label>Lote</label><span>${d.lote || '-'}</span></div>` : ''}
            ${showQtd ? `<div class="lp-info-item"><label>Quantidade</label><span class="lp-qty-highlight">${parseFloat(d.quantidade || 0).toLocaleString('pt-BR')} ${d.unidade || 'UN'}</span></div>` : ''}
            ${showCentro ? `<div class="lp-info-item"><label>Centro</label><span>${d.centro || '-'}</span></div>` : ''}
            ${showDeposito ? `<div class="lp-info-item"><label>Depósito</label><span>${d.deposito || '-'}</span></div>` : ''}
          </div>
          ${barcodeSVG ? `<div class="lp-barcode">${barcodeSVG}</div>` : ''}
          <div class="lp-footer">
            <span>Portal de Apontamento RF</span>
            <span>${dataStr}</span>
          </div>
        </div>
      `;
    }
    return labels;
  }
}

// Instância global
window.labelPrinter = new LabelPrinterService();
