// =========================================================================
// CONTROLADOR PRINCIPAL DA APLICAÇÃO WEB (COLETOR RF + COCKPIT GERENCIAL)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Estado local do formulário
  let currentMovementType = '101';

  // Elementos do DOM
  const form = document.getElementById('movementForm');
  const movCards = document.querySelectorAll('.movement-radio-card');
  const inputMaterial = document.getElementById('inputMaterial');
  const inputCentro = document.getElementById('inputCentro');
  const inputDeposito = document.getElementById('inputDeposito');
  const inputDepositoDest = document.getElementById('inputDepositoDest');
  const groupDepositoDest = document.getElementById('groupDepositoDest');
  const inputLote = document.getElementById('inputLote');
  const inputOrdem = document.getElementById('inputOrdem');
  const groupOrdem = document.getElementById('groupOrdem');
  const inputQuantidade = document.getElementById('inputQuantidade');
  const inputUnidade = document.getElementById('inputUnidade');
  const inputOperador = document.getElementById('inputOperador');
  const stockPreviewBadge = document.getElementById('stockPreviewBadge');
  const stockPreviewValue = document.getElementById('stockPreviewValue');
  const stockPreviewDesc = document.getElementById('stockPreviewDesc');

  // Tabs de navegação
  const tabCollector = document.getElementById('tabCollector');
  const tabCockpit = document.getElementById('tabCockpit');
  const viewCollector = document.getElementById('viewCollector');
  const viewCockpit = document.getElementById('viewCockpit');

  // ROI Calculator
  const sliderOperators = document.getElementById('sliderOperators');
  const labelOperatorsCount = document.getElementById('labelOperatorsCount');
  const roiSavingsAmount = document.getElementById('roiSavingsAmount');
  const roiTradCost = document.getElementById('roiTradCost');
  const roiBtpCost = document.getElementById('roiBtpCost');

  // Configuração BTP
  const btnBtpConfig = document.getElementById('btnBtpConfig');
  const btpConfigModal = document.getElementById('btpConfigModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const formBtpConfig = document.getElementById('formBtpConfig');
  const toggleBtpMode = document.getElementById('toggleBtpMode');
  const inputBtpUrl = document.getElementById('inputBtpUrl');
  const inputBtpUser = document.getElementById('inputBtpUser');
  const inputBtpPass = document.getElementById('inputBtpPass');
  const headerStatusPill = document.getElementById('headerStatusPill');
  const headerStatusText = document.getElementById('headerStatusText');

  // 1. Inicializar Navegação por Abas
  function switchTab(target) {
    if (target === 'collector') {
      tabCollector.classList.add('active');
      tabCockpit.classList.remove('active');
      viewCollector.classList.add('active');
      viewCockpit.classList.remove('active');
    } else {
      tabCockpit.classList.add('active');
      tabCollector.classList.remove('active');
      viewCockpit.classList.add('active');
      viewCollector.classList.remove('active');
      refreshCockpit();
    }
  }

  tabCollector.addEventListener('click', () => switchTab('collector'));
  tabCockpit.addEventListener('click', () => switchTab('cockpit'));

  // 2. Alternar Tipo de Movimento (101, 261, 311)
  function setMovementType(type) {
    currentMovementType = type;
    movCards.forEach(card => {
      card.classList.remove('selected-101', 'selected-261', 'selected-311');
      if (card.dataset.mov === type) {
        card.classList.add(`selected-${type}`);
      }
    });

    if (type === '101') {
      groupDepositoDest.style.display = 'none';
      groupOrdem.style.display = 'none';
    } else if (type === '261') {
      groupDepositoDest.style.display = 'none';
      groupOrdem.style.display = 'block';
    } else if (type === '311') {
      groupDepositoDest.style.display = 'block';
      groupOrdem.style.display = 'none';
    }

    checkStockPreview();
  }

  movCards.forEach(card => {
    card.addEventListener('click', () => setMovementType(card.dataset.mov));
  });

  // 3. Consulta de Saldo em Tempo Real ao digitar Material/Depósito
  async function checkStockPreview() {
    const mat = inputMaterial.value.trim();
    const centro = inputCentro.value.trim();
    const dep = inputDeposito.value.trim();
    const lote = inputLote.value.trim();

    if (mat && dep) {
      const saldo = await window.sapStore.findSaldo(mat, centro, dep, lote);
      if (saldo) {
        stockPreviewBadge.style.display = 'flex';
        stockPreviewDesc.textContent = `${saldo.Descricao} (${saldo.Material})`;
        stockPreviewValue.textContent = `${saldo.Quantidade} ${saldo.Unidade}`;
        inputUnidade.value = saldo.Unidade;
        return;
      }
    }
    stockPreviewBadge.style.display = 'none';
  }

  inputMaterial.addEventListener('input', checkStockPreview);
  inputDeposito.addEventListener('input', checkStockPreview);
  inputLote.addEventListener('input', checkStockPreview);

  // 4. Integração com Scanner de Código de Barras (com suporte GS1-128 / DataMatrix)
  window.barcodeScanner.onScan((scannedValue) => {
    // 1. Verifica se é código industrial multi-dados (GS1-128 / DataMatrix / QR)
    if (window.gs1Decoder && window.gs1Decoder.isMultiDataBarcode(scannedValue)) {
      const decoded = window.gs1Decoder.decode(scannedValue);
      if (decoded && decoded.isMultiData) {
        if (decoded.material) inputMaterial.value = decoded.material;
        if (decoded.lote) inputLote.value = decoded.lote;
        if (decoded.quantidade) inputQuantidade.value = decoded.quantidade;
        if (decoded.deposito) inputDeposito.value = decoded.deposito;
        if (decoded.ordemProducao) {
          inputOrdem.value = decoded.ordemProducao;
          setMovementType('261'); // Se tem OP, sugere baixa 261 automaticamente
        }

        checkStockPreview();

        const fields = decoded.fieldsFound.join(' + ');
        showToast(`${decoded.standard} decodificado. Preenchido: ${fields}`, 'success');
        return;
      }
    }

    // 2. Leitura de campos individuais
    if (scannedValue.startsWith('MAT-')) {
      inputMaterial.value = scannedValue;
      checkStockPreview();
      showToast(`Material lido: ${scannedValue}`, 'success');
    } else if (scannedValue.startsWith('LOTE-')) {
      inputLote.value = scannedValue;
      checkStockPreview();
      showToast(`Lote lido: ${scannedValue}`, 'success');
    } else if (scannedValue.startsWith('OP')) {
      inputOrdem.value = scannedValue;
      setMovementType('261');
      showToast(`Ordem de Produção: ${scannedValue}`, 'success');
    } else {
      inputMaterial.value = scannedValue;
      checkStockPreview();
      showToast(`Código lido: ${scannedValue}`, 'success');
    }
  });

  // Amostras de Barcode clicáveis na barra lateral
  document.querySelectorAll('.sample-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const code = chip.dataset.code;
      window.barcodeScanner.triggerScan(code);
    });
  });

  // 5. Envio do Apontamento de Estoque
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const movData = {
      tipoMovimento: currentMovementType,
      material: inputMaterial.value.trim(),
      descricao: stockPreviewDesc.textContent || '',
      centro: inputCentro.value.trim(),
      deposito: inputDeposito.value.trim(),
      depositoDest: inputDepositoDest.value.trim(),
      lote: inputLote.value.trim(),
      ordemProducao: inputOrdem.value.trim(),
      quantidade: inputQuantidade.value.trim(),
      unidade: inputUnidade.value.trim(),
      operador: inputOperador.value.trim()
    };

    try {
      const result = await window.sapStore.postMovimentacao(movData);
      window.industrialBeeper.beepPostSuccess();
      
      if (result.isOfflineQueued) {
        showToast(`Apontamento salvo na Fila Offline. Sincronizara com o SAP BTP automaticamente.`, 'info');
      } else {
        showToast(`Movimento ${currentMovementType} gravado com sucesso! Doc: ${result.docMaterial}`, 'success');
      }
      
      // Limpa formulário parcialmente mantendo centro/operador
      inputQuantidade.value = '';
      checkStockPreview();
      refreshCockpit();
    } catch (err) {
      window.industrialBeeper.beepError();
      showToast(err.message, 'error');
    }
  });

  // Botão Limpar
  document.getElementById('btnResetForm').addEventListener('click', () => {
    form.reset();
    inputCentro.value = '1000';
    inputDeposito.value = '1010';
    inputDepositoDest.value = '1020';
    inputLote.value = 'LOTE-A1';
    inputOperador.value = 'OPERADOR_01';
    setMovementType('101');
  });

  // 6. Atualização do Cockpit Gerencial
  async function refreshCockpit() {
    const saldos = await window.sapStore.getSaldos();
    const movs = await window.sapStore.getMovimentacoes();

    // KPIs
    document.getElementById('kpiTotalItems').textContent = saldos.length;
    const totalQty = saldos.reduce((acc, curr) => acc + parseFloat(curr.Quantidade || 0), 0);
    document.getElementById('kpiTotalQty').textContent = Math.round(totalQty).toLocaleString('pt-BR');
    document.getElementById('kpiTotalMovs').textContent = movs.length;

    // Tabela de Saldos
    const tbodySaldos = document.getElementById('tbodySaldos');
    if (tbodySaldos) {
      tbodySaldos.innerHTML = saldos.map((s, idx) => `
        <tr>
          <td><strong>${s.Material}</strong></td>
          <td>${s.Descricao || '-'}</td>
          <td>${s.Centro}</td>
          <td><span class="badge-tag mov-261">${s.Deposito}</span></td>
          <td>${s.Lote}</td>
          <td style="font-weight:700; color:#34d399;">${parseFloat(s.Quantidade).toLocaleString('pt-BR')} ${s.Unidade}</td>
          <td><span class="badge-tag mov-${s.UltimoMovimento || '101'}">${s.UltimoMovimento || '101'}</span></td>
          <td>
            <button class="btn-print-row" data-idx="${idx}" title="Imprimir Etiqueta de ${s.Material}">
              Etiqueta
            </button>
          </td>
        </tr>
      `).join('');

      // Evento de clique nos botões de impressão de etiqueta
      tbodySaldos.querySelectorAll('.btn-print-row').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const s = saldos[idx];
          if (s && window.labelPrinter) {
            window.labelPrinter.openModal({
              material: s.Material,
              descricao: s.Descricao || '',
              centro: s.Centro,
              deposito: s.Deposito,
              lote: s.Lote,
              quantidade: s.Quantidade,
              unidade: s.Unidade,
              ultimo_movimento: s.UltimoMovimento || '101'
            });
          }
        });
      });
    }

    // Tabela de Movimentações Recentes
    const tbodyMovs = document.getElementById('tbodyMovs');
    if (tbodyMovs) {
      tbodyMovs.innerHTML = movs.slice(0, 15).map(m => {
        const dataFormatada = new Date(m.CreatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `
          <tr>
            <td><strong>${m.DocMaterial}</strong></td>
            <td><span class="badge-tag mov-${m.TipoMovimento}">${m.TipoMovimento}</span></td>
            <td>${m.Material}</td>
            <td>${m.Deposito} ${m.DepositoDest ? '-> ' + m.DepositoDest : ''}</td>
            <td>${m.Lote}</td>
            <td style="font-weight:700;">${m.Quantidade} ${m.Unidade}</td>
            <td>${m.Operador || 'SISTEMA'}</td>
            <td>${dataFormatada}</td>
          </tr>
        `;
      }).join('');
    }

    // Renderizar Alertas de Estoque Crítico e Gráficos Chart.js
    if (window.cockpitAnalytics) {
      window.cockpitAnalytics.render(saldos, movs);
    }
  }

  // 7. Calculadora Interativa de ROI & Economia de Licenças
  function updateRoi() {
    const operators = parseInt(sliderOperators.value, 10);
    labelOperatorsCount.textContent = operators;

    // Custo típico de licença SAP Professional / FOC = US$ 150/mês por operador
    const sapLicenseMonthly = 150;
    const annualTraditionalCost = operators * sapLicenseMonthly * 12;

    // Modelo BTP Centralizado: BTP Application Runtime fixo ~ US$ 400/mês
    const btpAnnualCost = 4800 + (operators * 5 * 12); // BTP + pequeno overhead de tráfego
    const annualSavings = annualTraditionalCost - btpAnnualCost;

    roiTradCost.textContent = `US$ ${annualTraditionalCost.toLocaleString('en-US')}/ano`;
    roiBtpCost.textContent = `US$ ${btpAnnualCost.toLocaleString('en-US')}/ano`;
    roiSavingsAmount.textContent = `US$ ${Math.max(0, annualSavings).toLocaleString('en-US')}/ano`;
  }

  sliderOperators.addEventListener('input', updateRoi);
  updateRoi();

  // 8. Toasts de Notificação
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex:1; font-size:0.9rem; font-weight:600;">${message}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // 9. Configurações de Conexão SAP BTP
  btnBtpConfig.addEventListener('click', () => {
    const config = window.sapStore.btpConfig || {};
    inputBtpUrl.value = config.endpointUrl || '';
    inputBtpUser.value = config.user || '';
    toggleBtpMode.checked = window.sapStore.isBtpConnected;
    if (window.sapStore.btpConfig.endpointUrl) {
      inputBtpUrl.value = window.sapStore.btpConfig.endpointUrl;
    } else {
      inputBtpUrl.value = '/sap/opu/odata4/sap/zui_estoque_rf_o4/srvd/sap/zui_estoque_rf_o4/0001';
    }
    if (window.sapStore.btpConfig.user) {
      inputBtpUser.value = window.sapStore.btpConfig.user;
    }
    if (window.sapStore.btpConfig.password) {
      inputBtpPass.value = window.sapStore.btpConfig.password;
    }
    btpConfigModal.style.display = 'flex';
  });

  btnCloseModal.addEventListener('click', () => {
    btpConfigModal.style.display = 'none';
  });

  // Botão Testar Conexão BTP
  const btnTestBtpConn = document.getElementById('btnTestBtpConn');
  const btpTestFeedback = document.getElementById('btpTestFeedback');

  if (btnTestBtpConn && btpTestFeedback) {
    btnTestBtpConn.addEventListener('click', async () => {
      const user = inputBtpUser.value.trim();
      const password = inputBtpPass.value.trim();

      if (!user || !password) {
        btpTestFeedback.style.display = 'block';
        btpTestFeedback.style.background = 'rgba(239, 68, 68, 0.2)';
        btpTestFeedback.style.color = '#f87171';
        btpTestFeedback.style.border = '1px solid #ef4444';
        btpTestFeedback.innerHTML = 'Informe o Usuário e a Senha do SAP BTP antes de testar.';
        return;
      }

      btpTestFeedback.style.display = 'block';
      btpTestFeedback.style.background = 'rgba(0, 112, 242, 0.2)';
      btpTestFeedback.style.color = '#38bdf8';
      btpTestFeedback.style.border = '1px solid #0070f2';
      btpTestFeedback.innerHTML = 'Testando conexão com o SAP BTP via Proxy...';

      try {
        const resp = await fetch('/api/btp-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, password })
        });
        const result = await resp.json();

        if (result.ok) {
          btpTestFeedback.style.background = 'rgba(16, 185, 129, 0.2)';
          btpTestFeedback.style.color = '#34d399';
          btpTestFeedback.style.border = '1px solid #10b981';
          btpTestFeedback.innerHTML = `<strong>Conexão bem-sucedida!</strong><br>Status: 200 OK — OData V4 autenticado.<br>Token CSRF obtido com sucesso do SAP BTP!`;
        } else if (result.status === 401) {
          btpTestFeedback.style.background = 'rgba(239, 68, 68, 0.2)';
          btpTestFeedback.style.color = '#f87171';
          btpTestFeedback.style.border = '1px solid #ef4444';
          btpTestFeedback.innerHTML = `<strong>Erro 401 (Não Autorizado)</strong>: Usuário ou senha incorretos para o SAP BTP.`;
        } else {
          btpTestFeedback.style.background = 'rgba(245, 158, 11, 0.2)';
          btpTestFeedback.style.color = '#fbbf24';
          btpTestFeedback.style.border = '1px solid #f59e0b';
          btpTestFeedback.innerHTML = `Resposta SAP BTP: Status ${result.status || 'Erro'}. Detalhes: ${result.message || result.error || 'Verifique o endpoint'}`;
        }
      } catch (err) {
        btpTestFeedback.style.background = 'rgba(239, 68, 68, 0.2)';
        btpTestFeedback.style.color = '#f87171';
        btpTestFeedback.style.border = '1px solid #ef4444';
        btpTestFeedback.innerHTML = `Erro ao contatar proxy local: ${err.message}`;
      }
    });
  }

  formBtpConfig.addEventListener('submit', async (e) => {
    e.preventDefault();
    const isBtp = toggleBtpMode.checked;
    const config = {
      endpointUrl: inputBtpUrl.value.trim(),
      user: inputBtpUser.value.trim(),
      password: inputBtpPass.value.trim(),
      allowOfflineFallback: true
    };

    window.sapStore.setBtpMode(isBtp, config);
    updateHeaderStatus();
    btpConfigModal.style.display = 'none';
    showToast(isBtp ? 'Conexao SAP BTP ativada. Atualizando dados...' : 'Modo Demonstracao ativado.', 'success');

    // Atualiza tabelas e gráficos com os dados reais do SAP BTP
    await refreshCockpit();
  });

  function updateHeaderStatus() {
    if (window.sapStore.isBtpConnected) {
      headerStatusPill.className = 'status-pill mode-btp';
      headerStatusText.textContent = 'SAP BTP OData V4 Real';
    } else {
      headerStatusPill.className = 'status-pill';
      headerStatusText.textContent = 'Modo Demo / Offline';
    }
  }

  // 10. Controle do Leitor de Câmera (Barcode Scanner)
  const btnOpenScanner = document.getElementById('btnOpenScanner');
  const cameraScannerModal = document.getElementById('cameraScannerModal');
  const btnCloseScannerModal = document.getElementById('btnCloseScannerModal');

  if (btnOpenScanner && cameraScannerModal) {
    btnOpenScanner.addEventListener('click', async () => {
      cameraScannerModal.style.display = 'flex';
      await window.barcodeScanner.startCamera('scannerVideo', 'scannerStatusBadge');
    });

    btnCloseScannerModal.addEventListener('click', () => {
      cameraScannerModal.style.display = 'none';
      window.barcodeScanner.stopCamera('scannerVideo');
    });

    cameraScannerModal.addEventListener('click', (e) => {
      if (e.target === cameraScannerModal) {
        cameraScannerModal.style.display = 'none';
        window.barcodeScanner.stopCamera('scannerVideo');
      }
    });

    // Amostras rápidas no modal da câmera
    cameraScannerModal.querySelectorAll('.btn-quick-sample').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        const lote = btn.dataset.lote;
        cameraScannerModal.style.display = 'none';
        window.barcodeScanner.stopCamera('scannerVideo');
        window.barcodeScanner.triggerScan(code);
        if (lote) inputLote.value = lote;
      });
    });
  }

  // 11. Controles de Feedback Industrial (Bip & Vibração Háptica)
  const btnToggleSound = document.getElementById('btnToggleSound');
  const soundIcon = document.getElementById('soundIcon');
  const btnToggleHaptic = document.getElementById('btnToggleHaptic');
  const hapticIcon = document.getElementById('hapticIcon');
  const btnTestFeedback = document.getElementById('btnTestFeedback');

  if (btnToggleSound && soundIcon) {
    const updateSoundUI = () => {
      const active = window.industrialBeeper.soundEnabled;
      btnToggleSound.classList.toggle('active', active);
      soundIcon.textContent = active ? 'ON' : 'OFF';
    };
    updateSoundUI();
    btnToggleSound.addEventListener('click', () => {
      window.industrialBeeper.setSound(!window.industrialBeeper.soundEnabled);
      updateSoundUI();
      showToast(window.industrialBeeper.soundEnabled ? 'Bip Industrial Ativado' : 'Bip Silenciado', 'info');
    });
  }

  if (btnToggleHaptic && hapticIcon) {
    const updateHapticUI = () => {
      const active = window.industrialBeeper.hapticEnabled;
      btnToggleHaptic.classList.toggle('active', active);
      hapticIcon.textContent = active ? 'ON' : 'OFF';
    };
    updateHapticUI();
    btnToggleHaptic.addEventListener('click', () => {
      window.industrialBeeper.setHaptic(!window.industrialBeeper.hapticEnabled);
      updateHapticUI();
      showToast(window.industrialBeeper.hapticEnabled ? 'Vibracao Haptica Ativada' : 'Vibracao Desativada', 'info');
    });
  }

  if (btnTestFeedback) {
    btnTestFeedback.addEventListener('click', () => {
      window.industrialBeeper.testAll();
      showToast('Teste: Bip Cortante + Vibracao Haptica!', 'success');
    });
  }

  // 12. Gestão da Fila de Apontamentos Offline (Auto-Sync)
  const btnOfflineQueue = document.getElementById('btnOfflineQueue');
  const queueBadgeCount = document.getElementById('queueBadgeCount');
  const offlineQueueModal = document.getElementById('offlineQueueModal');
  const btnCloseQueueModal = document.getElementById('btnCloseQueueModal');
  const btnCloseQueueModalBottom = document.getElementById('btnCloseQueueModalBottom');
  const btnSyncQueueNow = document.getElementById('btnSyncQueueNow');
  const btnClearQueue = document.getElementById('btnClearQueue');
  const queueListContainer = document.getElementById('queueListContainer');

  function renderQueueList(queue, isSyncing) {
    if (!queueListContainer) return;

    if (!queue || queue.length === 0) {
      queueListContainer.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
          <strong style="color: #34d399; font-size: 0.95rem;">Fila 100% Sincronizada</strong>
          <p style="font-size: 0.8rem; margin-top: 4px;">Nenhum apontamento pendente. Todos os registros estao consolidados no SAP BTP.</p>
        </div>
      `;
      return;
    }

    queueListContainer.innerHTML = queue.map(item => {
      const m = item.movData;
      const hora = new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      let statusClass = 'status-pending';
      let statusText = 'Pendente';
      if (item.status === 'SYNCING') {
        statusClass = 'status-syncing';
        statusText = 'Sincronizando...';
      } else if (item.status === 'FAILED') {
        statusClass = 'status-failed';
        statusText = 'Erro de Envio';
      }

      return `
        <div class="queue-row">
          <div style="display:flex; align-items:center; gap:12px;">
            <span class="badge-tag mov-${m.tipoMovimento}">${m.tipoMovimento}</span>
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">
                ${m.material} — <span style="color:#34d399;">${m.quantidade} ${m.unidade || 'UN'}</span>
              </div>
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">
                Lote: <strong>${m.lote}</strong> | Centro: ${m.centro} | Dep: ${m.deposito} ${m.depositoDest ? '-> ' + m.depositoDest : ''} ${m.ordemProducao ? '| OP: ' + m.ordemProducao : ''}
              </div>
              ${item.error ? `<div style="font-size:0.72rem; color:#f87171; margin-top:3px;">Motivo: ${item.error}</div>` : ''}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="queue-badge-status ${statusClass}">${statusText}</span>
            <span style="font-size:0.72rem; color:var(--text-muted);">${hora}</span>
            <button type="button" class="btn-discard-item" data-id="${item.id}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; padding:4px;" title="Descartar apontamento">&times;</button>
          </div>
        </div>
      `;
    }).join('');

    // Listener para botões individuais de descarte
    queueListContainer.querySelectorAll('.btn-discard-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.offlineQueue.removeItem(id);
      });
    });
  }

  if (window.offlineQueue) {
    window.offlineQueue.onChange((count, isSyncing, queue) => {
      if (btnOfflineQueue && queueBadgeCount) {
        if (count > 0) {
          btnOfflineQueue.style.display = 'inline-flex';
          queueBadgeCount.textContent = isSyncing ? 'Sincronizando...' : `${count} pendente${count > 1 ? 's' : ''}`;
        } else {
          btnOfflineQueue.style.display = 'none';
        }
      }

      if (offlineQueueModal && offlineQueueModal.style.display === 'flex') {
        renderQueueList(queue, isSyncing);
      }
    });

    if (btnOfflineQueue && offlineQueueModal) {
      btnOfflineQueue.addEventListener('click', () => {
        renderQueueList(window.offlineQueue.getQueue(), window.offlineQueue.isSyncing);
        offlineQueueModal.style.display = 'flex';
      });
    }

    if (btnCloseQueueModal) {
      btnCloseQueueModal.addEventListener('click', () => {
        offlineQueueModal.style.display = 'none';
      });
    }

    if (btnCloseQueueModalBottom) {
      btnCloseQueueModalBottom.addEventListener('click', () => {
        offlineQueueModal.style.display = 'none';
      });
    }

    if (btnSyncQueueNow) {
      btnSyncQueueNow.addEventListener('click', async () => {
        await window.offlineQueue.syncAll(false);
      });
    }

    if (btnClearQueue) {
      btnClearQueue.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja descartar todos os apontamentos pendentes da fila offline?')) {
          window.offlineQueue.clearQueue();
          showToast('Fila offline limpa com sucesso.', 'info');
        }
      });
    }
  }

  updateHeaderStatus();
  setMovementType('101');
  refreshCockpit();
});


