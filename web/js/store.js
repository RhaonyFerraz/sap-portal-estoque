// =========================================================================
// MÓDULO DE PERSISTÊNCIA & INTEGRAÇÃO SAP BTP ODATA V4
// Suporta execução autônoma (Modo Simulação/Demo) e Chamada Real BTP
// =========================================================================

const INITIAL_SALDOS = [
  {
    Material: 'MAT-1001',
    Descricao: 'Parafuso Sextavado M8x40 Aço Carbono',
    Centro: '1000',
    Deposito: '1010',
    Lote: 'LOTE-A1',
    Quantidade: 1250,
    Unidade: 'UN',
    UltimoMovimento: '101',
    LastChangedAt: new Date().toISOString()
  },
  {
    Material: 'MAT-2002',
    Descricao: 'Motor Elétrico Trifásico 2CV 4P',
    Centro: '1000',
    Deposito: '1010',
    Lote: 'LOTE-B2',
    Quantidade: 48,
    Unidade: 'UN',
    UltimoMovimento: '101',
    LastChangedAt: new Date().toISOString()
  },
  {
    Material: 'MAT-3003',
    Descricao: 'Chapa de Aço Inoxidável 304 2mm',
    Centro: '1000',
    Deposito: '1010',
    Lote: 'LOTE-C3',
    Quantidade: 320.5,
    Unidade: 'KG',
    UltimoMovimento: '101',
    LastChangedAt: new Date().toISOString()
  },
  {
    Material: 'MAT-4004',
    Descricao: 'Rolamento Rígido de Esferas 6204',
    Centro: '1000',
    Deposito: '1020',
    Lote: 'LOTE-D4',
    Quantidade: 85,
    Unidade: 'UN',
    UltimoMovimento: '311',
    LastChangedAt: new Date().toISOString()
  },
  {
    Material: 'MAT-5005',
    Descricao: 'Graxa Lubrificante Industrial Sintética',
    Centro: '1000',
    Deposito: '1010',
    Lote: 'LOTE-E5',
    Quantidade: 15,
    Unidade: 'L',
    UltimoMovimento: '101',
    LastChangedAt: new Date().toISOString()
  }
];

const INITIAL_MOVIMENTACOES = [
  {
    MovUuid: '10000000-0000-0000-0000-000000000001',
    DocMaterial: '5000000001',
    AnoDoc: '2026',
    TipoMovimento: '101',
    Material: 'MAT-1001',
    Descricao: 'Parafuso Sextavado M8x40 Aço Carbono',
    Centro: '1000',
    Deposito: '1010',
    DepositoDest: '',
    Lote: 'LOTE-A1',
    OrdemProducao: '',
    Quantidade: 1250,
    Unidade: 'UN',
    Status: 'S',
    Mensagem: 'Entrada por compra PO 4500012984 realizada com sucesso',
    Operador: 'OP_MARCOS',
    CreatedAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    MovUuid: '10000000-0000-0000-0000-000000000002',
    DocMaterial: '5000000002',
    AnoDoc: '2026',
    TipoMovimento: '101',
    Material: 'MAT-2002',
    Descricao: 'Motor Elétrico Trifásico 2CV 4P',
    Centro: '1000',
    Deposito: '1010',
    DepositoDest: '',
    Lote: 'LOTE-B2',
    OrdemProducao: '',
    Quantidade: 50,
    Unidade: 'UN',
    Status: 'S',
    Mensagem: 'Recebimento de fornecedor WEG NF 84920',
    Operador: 'OP_MARCOS',
    CreatedAt: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    MovUuid: '10000000-0000-0000-0000-000000000003',
    DocMaterial: '4900000001',
    AnoDoc: '2026',
    TipoMovimento: '261',
    Material: 'MAT-2002',
    Descricao: 'Motor Elétrico Trifásico 2CV 4P',
    Centro: '1000',
    Deposito: '1010',
    DepositoDest: '',
    Lote: 'LOTE-B2',
    OrdemProducao: 'OP100984',
    Quantidade: 2,
    Unidade: 'UN',
    Status: 'S',
    Mensagem: 'Baixa para ordem de produção linha de esteiras',
    Operador: 'OP_LUCAS',
    CreatedAt: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    MovUuid: '10000000-0000-0000-0000-000000000004',
    DocMaterial: '4800000002',
    AnoDoc: '2026',
    TipoMovimento: '311',
    Material: 'MAT-4004',
    Descricao: 'Rolamento Rígido de Esferas 6204',
    Centro: '1000',
    Deposito: '1010',
    DepositoDest: '1020',
    Lote: 'LOTE-D4',
    OrdemProducao: '',
    Quantidade: 85,
    Unidade: 'UN',
    Status: 'S',
    Mensagem: 'Transferência entre depósitos (Central -> Linha Montagem)',
    Operador: 'OP_LUCAS',
    CreatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

class SapStockStore {
  constructor() {
    this.storagePrefix = 'sap_portal_rf_';
    this.isBtpConnected = localStorage.getItem(this.storagePrefix + 'mode') === 'btp';
    this.btpConfig = JSON.parse(localStorage.getItem(this.storagePrefix + 'btp_config') || '{}');
    
    // Inicializar dados de demonstração caso não existam
    if (!localStorage.getItem(this.storagePrefix + 'saldos')) {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    localStorage.setItem(this.storagePrefix + 'saldos', JSON.stringify(INITIAL_SALDOS));
    localStorage.setItem(this.storagePrefix + 'movs', JSON.stringify(INITIAL_MOVIMENTACOES));
  }

  setBtpMode(isBtp, config = null) {
    this.isBtpConnected = isBtp;
    localStorage.setItem(this.storagePrefix + 'mode', isBtp ? 'btp' : 'demo');
    if (config) {
      this.btpConfig = config;
      localStorage.setItem(this.storagePrefix + 'btp_config', JSON.stringify(config));
    }
  }

  _getAuthHeaders() {
    const headers = {};
    if (this.btpConfig.user && this.btpConfig.password) {
      headers['Authorization'] = 'Basic ' + btoa(`${this.btpConfig.user}:${this.btpConfig.password}`);
    }
    return headers;
  }

  async _fetchCsrfToken() {
    if (this._csrfToken) return this._csrfToken;
    try {
      const url = `${this.btpConfig.endpointUrl}/$metadata`;
      const resp = await fetch(url, {
        method: 'GET',
        headers: {
          'X-CSRF-Token': 'Fetch',
          'Accept': 'application/xml, application/json',
          ...this._getAuthHeaders()
        }
      });
      const token = resp.headers.get('x-csrf-token');
      if (token) {
        this._csrfToken = token;
      }
      return token;
    } catch (e) {
      console.warn('Falha ao obter token CSRF BTP:', e);
      return null;
    }
  }

  async getSaldos() {
    if (this.isBtpConnected && this.btpConfig.endpointUrl) {
      try {
        const url = `${this.btpConfig.endpointUrl}/Saldos`;
        const headers = {
          'Accept': 'application/json',
          ...this._getAuthHeaders()
        };
        const resp = await fetch(url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          return data.value || [];
        } else {
          console.warn('BTP Saldos status:', resp.status);
        }
      } catch (err) {
        console.warn('Falha na consulta BTP, usando cache local:', err);
      }
    }
    return JSON.parse(localStorage.getItem(this.storagePrefix + 'saldos') || '[]');
  }

  async getMovimentacoes() {
    if (this.isBtpConnected && this.btpConfig.endpointUrl) {
      try {
        const url = `${this.btpConfig.endpointUrl}/Movimentacoes?$orderby=CreatedAt desc`;
        const headers = {
          'Accept': 'application/json',
          ...this._getAuthHeaders()
        };
        const resp = await fetch(url, { headers });
        if (resp.ok) {
          const data = await resp.json();
          return data.value || [];
        } else {
          console.warn('BTP Movimentacoes status:', resp.status);
        }
      } catch (err) {
        console.warn('Falha na consulta BTP, usando cache local:', err);
      }
    }
    return JSON.parse(localStorage.getItem(this.storagePrefix + 'movs') || '[]');
  }

  async findSaldo(material, centro, deposito, lote) {
    const saldos = await this.getSaldos();
    return saldos.find(s => 
      s.Material.toUpperCase() === material.toUpperCase() &&
      s.Centro === centro &&
      s.Deposito === deposito &&
      (!lote || s.Lote.toUpperCase() === lote.toUpperCase())
    ) || null;
  }

  async postMovimentacao(movData) {
    const { tipoMovimento, material, descricao, centro, deposito, depositoDest, lote, ordemProducao, quantidade, unidade, operador } = movData;
    const qtdNum = parseFloat(quantidade);

    if (isNaN(qtdNum) || qtdNum <= 0) {
      throw new Error('A quantidade deve ser um número positivo.');
    }

    // Regra de Validação de Saldo para Baixa (261) e Transferência (311)
    let saldos = JSON.parse(localStorage.getItem(this.storagePrefix + 'saldos') || '[]');
    let saldoItem = saldos.find(s =>
      s.Material.toUpperCase() === material.toUpperCase() &&
      s.Centro === centro &&
      s.Deposito === deposito &&
      s.Lote.toUpperCase() === lote.toUpperCase()
    );

    if (tipoMovimento === '261' || tipoMovimento === '311') {
      if (!saldoItem) {
        throw new Error(`Material ${material} não possui saldo no Centro ${centro} Depósito ${deposito} Lote ${lote}.`);
      }
      if (saldoItem.Quantidade < qtdNum) {
        throw new Error(`Saldo insuficiente! Disponível: ${saldoItem.Quantidade} ${saldoItem.Unidade}. Solicitado: ${qtdNum} ${saldoItem.Unidade}.`);
      }
    }

    // Integração real BTP via POST OData V4 se ativo
    let isQueuedOffline = false;
    if (this.isBtpConnected && this.btpConfig.endpointUrl) {
      // Se estiver comprovadamente offline, enfileira diretamente sem aguardar timeout
      if (!navigator.onLine && window.offlineQueue) {
        window.offlineQueue.enqueue(movData, 'Dispositivo desconectado da rede');
        isQueuedOffline = true;
      } else {
        try {
          const payload = {
            TipoMovimento: tipoMovimento,
            Material: material,
            Descricao: descricao || (saldoItem ? saldoItem.Descricao : ''),
            Centro: centro,
            Deposito: deposito,
            DepositoDest: depositoDest || '',
            Lote: lote,
            OrdemProducao: ordemProducao || '',
            Quantidade: qtdNum,
            Unidade: unidade || 'UN',
            Operador: operador || 'OPERADOR_RF'
          };

          const csrfToken = await this._fetchCsrfToken();

          const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...this._getAuthHeaders()
          };
          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
          }

          const resp = await fetch(`${this.btpConfig.endpointUrl}/Movimentacoes`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload)
          });

          if (resp.ok) {
            const result = await resp.json();
            return {
              success: true,
              docMaterial: result.DocMaterial,
              anoDoc: result.AnoDoc,
              mensagem: result.Mensagem || `Movimentação ${tipoMovimento} registrada no SAP BTP!`
            };
          } else {
            const errData = await resp.json().catch(() => ({}));
            const errMsg = errData.error?.message || `Erro SAP BTP (${resp.status}): ${resp.statusText}`;
            throw new Error(errMsg);
          }
        } catch (err) {
          console.warn('Falha na comunicação BTP:', err);
          // Enfileira na fila offline caso seja falha de rede/conexão
          if (window.offlineQueue && (err.message.includes('fetch') || err.message.includes('Network') || !navigator.onLine || err.message.includes('Failed'))) {
            window.offlineQueue.enqueue(movData, 'Conexão BTP oscilou / Offline');
            isQueuedOffline = true;
          } else if (!this.btpConfig.allowOfflineFallback) {
            throw err;
          }
        }
      }
    }

    // Processamento Local (Garante que o saldo na tela atualiza na hora)
    const now = new Date();
    const docPrefix = tipoMovimento === '101' ? '50' : (tipoMovimento === '261' ? '49' : '48');
    const docMaterial = `${docPrefix}${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (tipoMovimento === '101') {
      if (saldoItem) {
        saldoItem.Quantidade += qtdNum;
        saldoItem.UltimoMovimento = '101';
        saldoItem.LastChangedAt = now.toISOString();
      } else {
        saldos.push({
          Material: material.toUpperCase(),
          Descricao: descricao || 'Item cadastrado via Recebimento RF',
          Centro: centro,
          Deposito: deposito,
          Lote: lote.toUpperCase(),
          Quantidade: qtdNum,
          Unidade: unidade || 'UN',
          UltimoMovimento: '101',
          LastChangedAt: now.toISOString()
        });
      }
    } else if (tipoMovimento === '261') {
      saldoItem.Quantidade -= qtdNum;
      saldoItem.UltimoMovimento = '261';
      saldoItem.LastChangedAt = now.toISOString();
    } else if (tipoMovimento === '311') {
      saldoItem.Quantidade -= qtdNum;
      saldoItem.UltimoMovimento = '311';
      saldoItem.LastChangedAt = now.toISOString();

      let saldoDest = saldos.find(s =>
        s.Material.toUpperCase() === material.toUpperCase() &&
        s.Centro === centro &&
        s.Deposito === depositoDest &&
        s.Lote.toUpperCase() === lote.toUpperCase()
      );
      if (saldoDest) {
        saldoDest.Quantidade += qtdNum;
        saldoDest.UltimoMovimento = '311';
        saldoDest.LastChangedAt = now.toISOString();
      } else {
        saldos.push({
          Material: material.toUpperCase(),
          Descricao: saldoItem.Descricao,
          Centro: centro,
          Deposito: depositoDest,
          Lote: lote.toUpperCase(),
          Quantidade: qtdNum,
          Unidade: saldoItem.Unidade,
          UltimoMovimento: '311',
          LastChangedAt: now.toISOString()
        });
      }
    }

    localStorage.setItem(this.storagePrefix + 'saldos', JSON.stringify(saldos));

    // Adiciona ao histórico local
    const movs = JSON.parse(localStorage.getItem(this.storagePrefix + 'movs') || '[]');
    movs.unshift({
      MovUuid: `local-${Date.now()}`,
      DocMaterial: docMaterial,
      AnoDoc: `${now.getFullYear()}`,
      TipoMovimento: tipoMovimento,
      Material: material.toUpperCase(),
      Descricao: descricao || (saldoItem ? saldoItem.Descricao : ''),
      Centro: centro,
      Deposito: deposito,
      DepositoDest: depositoDest || '',
      Lote: lote.toUpperCase(),
      OrdemProducao: ordemProducao || '',
      Quantidade: qtdNum,
      Unidade: unidade || 'UN',
      Status: isQueuedOffline ? 'W' : 'S',
      Mensagem: isQueuedOffline 
        ? '📦 Salvo na Fila Offline (aguardando reconexão SAP BTP)' 
        : `Apontamento ${tipoMovimento} registrado localmente`,
      Operador: operador || 'OPERADOR_RF',
      CreatedAt: now.toISOString()
    });
    localStorage.setItem(this.storagePrefix + 'movs', JSON.stringify(movs));

    return {
      success: true,
      isOfflineQueued: isQueuedOffline,
      docMaterial: docMaterial,
      anoDoc: `${now.getFullYear()}`,
      mensagem: isQueuedOffline
        ? `📦 Apontamento salvo na Fila Offline! Sincronizará com o SAP BTP automaticamente.`
        : `Movimentação ${tipoMovimento} registrada com sucesso!`
    };
  }
}

window.sapStore = new SapStockStore();

