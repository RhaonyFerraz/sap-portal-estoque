/**
 * OfflineQueueManager - Gerenciador de Fila Offline e Sincronização Automática
 * Garante que nenhuma movimentação de estoque seja perdida em áreas de sombra de Wi-Fi
 */

class OfflineQueueManager {
  constructor() {
    this.storageKey = 'sap_portal_rf_offline_queue';
    this.isSyncing = false;
    this.listeners = [];

    this.init();
  }

  init() {
    // 1. Escuta reconexão de rede (Online) para sincronização automática imediata
    window.addEventListener('online', () => {
      console.log('[OfflineQueue] Conexão restabelecida. Iniciando sincronização automática...');
      if (this.getPendingCount() > 0) {
        setTimeout(() => this.syncAll(), 1500);
      }
    });

    // 2. Heartbeat de verificação periódica a cada 30 segundos
    setInterval(() => {
      if (navigator.onLine && this.getPendingCount() > 0 && !this.isSyncing) {
        if (window.sapStore && window.sapStore.isBtpConnected) {
          this.syncAll(true); // sync silencioso
        }
      }
    }, 30000);
  }

  // ─── OPERAÇÕES DA FILA ────────────────────────────────────────────────────

  getQueue() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  _saveQueue(queue) {
    localStorage.setItem(this.storageKey, JSON.stringify(queue));
    this._notifyListeners();
  }

  getPendingCount() {
    return this.getQueue().filter(item => item.status === 'PENDING' || item.status === 'FAILED').length;
  }

  enqueue(movData, reason = 'Sem conexão de rede') {
    const queue = this.getQueue();
    const item = {
      id: 'OFFLINE-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      movData,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      attempts: 0,
      reason,
      error: null
    };

    queue.push(item);
    this._saveQueue(queue);
    console.log(`[OfflineQueue] Item adicionado à fila: ${item.id}`, movData);
    return item;
  }

  removeItem(id) {
    let queue = this.getQueue();
    queue = queue.filter(item => item.id !== id);
    this._saveQueue(queue);
  }

  clearQueue() {
    this._saveQueue([]);
  }

  // ─── SINCRONIZAÇÃO COM O SAP BTP ──────────────────────────────────────────

  async syncAll(isSilent = false) {
    if (this.isSyncing) return;
    const pendingItems = this.getQueue().filter(i => i.status === 'PENDING' || i.status === 'FAILED');
    if (pendingItems.length === 0) return;

    if (!window.sapStore || !window.sapStore.isBtpConnected) {
      if (!isSilent && window.showToast) {
        window.showToast('Para sincronizar, habilite a Conexão SAP BTP nas configurações.', 'warning');
      }
      return;
    }

    this.isSyncing = true;
    this._notifyListeners();

    if (!isSilent && window.showToast) {
      window.showToast(`Sincronizando ${pendingItems.length} apontamento(s) com o SAP BTP...`, 'info');
    }

    let successCount = 0;
    let failCount = 0;
    const queue = this.getQueue();

    for (const item of pendingItems) {
      const qIndex = queue.findIndex(i => i.id === item.id);
      if (qIndex === -1) continue;

      queue[qIndex].status = 'SYNCING';
      queue[qIndex].attempts += 1;
      this._saveQueue(queue);

      try {
        // Envia para o SAP BTP real
        const result = await this._postToBtp(item.movData);
        queue[qIndex].status = 'SYNCED';
        queue[qIndex].docMaterial = result.DocMaterial;
        queue[qIndex].syncedAt = new Date().toISOString();
        queue[qIndex].error = null;
        successCount++;
      } catch (err) {
        console.warn(`[OfflineQueue] Erro ao sincronizar item ${item.id}:`, err);
        queue[qIndex].status = 'FAILED';
        queue[qIndex].error = err.message || 'Erro de comunicação';
        failCount++;
      }
    }

    // Remove itens sincronizados com sucesso após 10 segundos para manter histórico limpo
    const remaining = queue.filter(i => i.status !== 'SYNCED');
    this._saveQueue(remaining);

    this.isSyncing = false;
    this._notifyListeners();

    // Feedback sonoro e notificação ao operador
    if (successCount > 0) {
      if (window.industrialBeeper) {
        window.industrialBeeper.beepPostSuccess();
      }
      if (window.showToast) {
        window.showToast(`${successCount} apontamento(s) sincronizado(s) no SAP BTP.`, 'success');
      }
      if (window.refreshCockpit) {
        window.refreshCockpit();
      }
    }

    if (failCount > 0 && !isSilent) {
      if (window.showToast) {
        window.showToast(`${failCount} apontamento(s) nao puderam ser sincronizados. Verifique o sinal ou saldo.`, 'warning');
      }
    }
  }

  async _postToBtp(movData) {
    const store = window.sapStore;
    const csrfToken = await store._fetchCsrfToken();
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...store._getAuthHeaders()
    };
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const payload = {
      TipoMovimento: movData.tipoMovimento,
      Material: movData.material,
      Descricao: movData.descricao || '',
      Centro: movData.centro,
      Deposito: movData.deposito,
      DepositoDest: movData.depositoDest || '',
      Lote: movData.lote,
      OrdemProducao: movData.ordemProducao || '',
      Quantidade: parseFloat(movData.quantidade),
      Unidade: movData.unidade || 'UN',
      Operador: movData.operador || 'OPERADOR_OFFLINE'
    };

    const resp = await fetch(`${store.btpConfig.endpointUrl}/Movimentacoes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errJson = await resp.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Status HTTP ${resp.status}`);
    }

    return await resp.json();
  }

  // ─── OBSERVERS ──────────────────────────────────────────────────────────

  onChange(callback) {
    this.listeners.push(callback);
    callback(this.getPendingCount(), this.isSyncing, this.getQueue());
  }

  _notifyListeners() {
    const count = this.getPendingCount();
    const syncing = this.isSyncing;
    const queue = this.getQueue();
    this.listeners.forEach(cb => {
      try { cb(count, syncing, queue); } catch (e) { console.error(e); }
    });
  }
}

// Instância global da Fila Offline
window.offlineQueue = new OfflineQueueManager();
