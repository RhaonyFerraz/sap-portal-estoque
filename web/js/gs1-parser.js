/**
 * Decodificador GS1-128 / DataMatrix / QR Code Multi-Dados
 * Padrão Logístico Internacional para Cadeia de Suprimentos & SAP EWM / WM
 */

// Mapeamento de GTIN (EAN-14) para Código de Material SAP
const GTIN_MATERIAL_MAP = {
  '07891234567890': 'MAT-1001',
  '07891234567891': 'MAT-2002',
  '07891234567892': 'MAT-3003',
  '07891234567893': 'MAT-4004',
  '07891234567894': 'MAT-5005',
};

class GS1BarcodeDecoder {
  constructor() {
    this.gtinMap = GTIN_MATERIAL_MAP;
  }

  /**
   * Identifica se a string contém múltiplos dados estruturados (GS1 ou delimitado)
   */
  isMultiDataBarcode(code) {
    if (!code || typeof code !== 'string') return false;
    const trimmed = code.trim();
    return (
      trimmed.includes('(') && trimmed.includes(')') ||
      trimmed.includes('|') ||
      trimmed.includes(';') ||
      trimmed.includes('#') ||
      trimmed.startsWith('01') && trimmed.length >= 16
    );
  }

  /**
   * Decodifica qualquer padrão industrial de código de barras
   */
  decode(rawCode) {
    if (!rawCode) return null;
    const code = rawCode.trim();

    // 1. Formato GS1 com Parênteses (Ex: (01)07891234567890(10)LOTE-A1(30)50 )
    if (code.includes('(') && code.includes(')')) {
      return this._parseParenthesizedGS1(code);
    }

    // 2. Formato Delimitado Chave:Valor (Ex: MAT:MAT-1001|LOTE:LOTE-A1|QTD:50|DEP:1010 )
    if (code.includes('|') || code.includes(';')) {
      return this._parseDelimited(code);
    }

    // 3. Formato Posicional com '#' (Ex: MAT-1001#LOTE-A1#50#1010 )
    if (code.includes('#')) {
      return this._parseHashSeparated(code);
    }

    // 4. Formato GS1 Contínuo com AI 01 no início (Ex: 010789123456789010LOTE-A1... )
    if (code.startsWith('01') && code.length >= 16) {
      return this._parseContinuousGS1(code);
    }

    // Código simples individual (MAT-xxxx, LOTE-xxxx, etc.)
    return {
      isMultiData: false,
      raw: code,
      singleValue: code
    };
  }

  // Parser para GS1 formatado: (01)...(10)...(30)...
  _parseParenthesizedGS1(code) {
    const result = {
      isMultiData: true,
      standard: 'GS1-128 / DataMatrix',
      raw: code,
      fieldsFound: []
    };

    const regex = /\((01|10|17|21|30|37|240|310|400|410|90)\)([^()]+)/g;
    let match;

    while ((match = regex.exec(code)) !== null) {
      const ai = match[1];
      const val = match[2].trim();

      switch (ai) {
        case '01': // GTIN / EAN-14 (14 dígitos) ou código direto
          result.gtin = val;
          result.material = this.gtinMap[val] || (val.startsWith('MAT-') ? val : `MAT-${val}`);
          result.fieldsFound.push('Material / GTIN');
          break;

        case '240': // Identificação Adicional do Produto (Material Interno SAP)
          result.material = val;
          result.fieldsFound.push('Material');
          break;

        case '10': // Número do Lote (Batch)
          result.lote = val;
          result.fieldsFound.push('Lote');
          break;

        case '17': // Data de Validade (YYMMDD)
          result.validade = this._formatGS1Date(val);
          result.fieldsFound.push('Validade');
          break;

        case '30': // Quantidade Variável
        case '37':
          result.quantidade = parseFloat(val);
          result.fieldsFound.push('Quantidade');
          break;

        case '410': // Centro / Depósito de Destino
          result.deposito = val;
          result.fieldsFound.push('Depósito');
          break;

        case '90': // Fatura / Ordem de Produção Interna
        case '400':
          result.ordemProducao = val;
          result.fieldsFound.push('Ordem de Produção');
          break;
      }
    }

    return result;
  }

  // Parser delimitado: MAT:xxx|LOTE:yyy|QTD:zzz
  _parseDelimited(code) {
    const delimiter = code.includes('|') ? '|' : ';';
    const parts = code.split(delimiter);
    const result = {
      isMultiData: true,
      standard: 'QR Industrial Delimitado',
      raw: code,
      fieldsFound: []
    };

    parts.forEach(p => {
      const sep = p.includes(':') ? ':' : '=';
      const [key, val] = p.split(sep).map(s => (s || '').trim());
      if (!key || !val) return;

      const upperKey = key.toUpperCase();
      if (['MAT', 'MATERIAL', 'PROD', 'ITEM'].includes(upperKey)) {
        result.material = val;
        result.fieldsFound.push('Material');
      } else if (['LOTE', 'BATCH', 'LOT'].includes(upperKey)) {
        result.lote = val;
        result.fieldsFound.push('Lote');
      } else if (['QTD', 'QUANTIDADE', 'QTY', 'COUNT'].includes(upperKey)) {
        result.quantidade = parseFloat(val);
        result.fieldsFound.push('Quantidade');
      } else if (['DEP', 'DEPOSITO', 'SLOC', 'LOC'].includes(upperKey)) {
        result.deposito = val;
        result.fieldsFound.push('Depósito');
      } else if (['OP', 'ORDEM', 'ORDER'].includes(upperKey)) {
        result.ordemProducao = val;
        result.fieldsFound.push('Ordem de Produção');
      }
    });

    return result;
  }

  // Parser com '#': MAT-1001#LOTE-A1#50#1010
  _parseHashSeparated(code) {
    const parts = code.split('#').map(s => s.trim());
    const result = {
      isMultiData: true,
      standard: 'DataMatrix Hash SAP',
      raw: code,
      fieldsFound: []
    };

    if (parts[0]) {
      result.material = parts[0];
      result.fieldsFound.push('Material');
    }
    if (parts[1]) {
      result.lote = parts[1];
      result.fieldsFound.push('Lote');
    }
    if (parts[2]) {
      const q = parseFloat(parts[2]);
      if (!isNaN(q)) {
        result.quantidade = q;
        result.fieldsFound.push('Quantidade');
      }
    }
    if (parts[3]) {
      result.deposito = parts[3];
      result.fieldsFound.push('Depósito');
    }

    return result;
  }

  // Parser para GS1 contínuo sem parênteses: 01<14digitos>10<lote>...
  _parseContinuousGS1(code) {
    const result = {
      isMultiData: true,
      standard: 'GS1-128 Contínuo',
      raw: code,
      fieldsFound: []
    };

    // Extrai GTIN fixo de 14 dígitos após AI 01
    const gtin = code.substring(2, 16);
    result.gtin = gtin;
    result.material = this.gtinMap[gtin] || `MAT-${gtin.slice(-4)}`;
    result.fieldsFound.push('Material / GTIN');

    let remainder = code.substring(16);

    // Se contiver AI 10 (Lote)
    const idxLote = remainder.indexOf('10');
    if (idxLote !== -1) {
      const afterLote = remainder.substring(idxLote + 2);
      // Pega até o próximo AI ou até 10 caracteres
      const loteMatch = afterLote.match(/^([A-Za-z0-9\-]+)/);
      if (loteMatch) {
        result.lote = loteMatch[1];
        result.fieldsFound.push('Lote');
      }
    }

    // Se contiver AI 30 (Quantidade)
    const idxQtd = remainder.indexOf('30');
    if (idxQtd !== -1) {
      const afterQtd = remainder.substring(idxQtd + 2);
      const qtdMatch = afterQtd.match(/^(\d+)/);
      if (qtdMatch) {
        result.quantidade = parseFloat(qtdMatch[1]);
        result.fieldsFound.push('Quantidade');
      }
    }

    return result;
  }

  _formatGS1Date(yymmdd) {
    if (!yymmdd || yymmdd.length !== 6) return yymmdd;
    const yy = '20' + yymmdd.substring(0, 2);
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    return `${dd}/${mm}/${yy}`;
  }
}

// Instância global
window.gs1Decoder = new GS1BarcodeDecoder();
