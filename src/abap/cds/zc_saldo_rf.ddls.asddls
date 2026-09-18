@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS Projection View - Saldo em Estoque'
@Metadata.allowExtensions: true

@UI.headerInfo: {
  typeName: 'Saldo de Material',
  typeNamePlural: 'Saldos de Materiais',
  title: { type: #STANDARD, value: 'Material' },
  description: { value: 'Descricao' }
}

/* Habilita visualização com Gráfico + Tabela como padrão no Fiori Elements (sem qualifier) */
@UI.presentationVariant: [{
  text: 'Visão Padrão',
  visualizations: [
    { type: #AS_CHART },
    { type: #AS_LINEITEM }
  ]
}]

/* Gráfico Padrão da Entidade (sem qualifier para ser consumido automaticamente pelo FEAP) */
@UI.chart: [{
  title: 'Saldo Físico por Material',
  chartType: #COLUMN,
  dimensions: ['Material'],
  measures: ['Quantidade'],
  dimensionAttributes: [{
    dimension: 'Material',
    role: #CATEGORY
  }],
  measureAttributes: [{
    measure: 'Quantidade',
    role: #AXIS_1,
    asDataPoint: true
  }]
}]

define root view entity ZC_SALDO_RF
  provider contract transactional_query
  as projection on ZR_SALDO_RF
{
  @UI.facet: [
    { id: 'SaldoDetails', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'Detalhes do Saldo', position: 10 }
  ]

  @UI.lineItem: [{ position: 10, label: 'Material' }]
  @UI.identification: [{ position: 10, label: 'Material' }]
  @UI.selectionField: [{ position: 10 }]
  key Material,

  @UI.lineItem: [{ position: 20, label: 'Centro' }]
  @UI.identification: [{ position: 20, label: 'Centro' }]
  @UI.selectionField: [{ position: 20 }]
  key Centro,

  @UI.lineItem: [{ position: 30, label: 'Depósito' }]
  @UI.identification: [{ position: 30, label: 'Depósito' }]
  @UI.selectionField: [{ position: 30 }]
  key Deposito,

  @UI.lineItem: [{ position: 40, label: 'Lote' }]
  @UI.identification: [{ position: 40, label: 'Lote' }]
  key Lote,

  @UI.lineItem: [{ position: 50, label: 'Descrição' }]
  @UI.identification: [{ position: 50, label: 'Descrição' }]
  Descricao,

  @UI.lineItem: [{ position: 60, label: 'Quantidade Disponível' }]
  @UI.identification: [{ position: 60, label: 'Quantidade Disponível' }]
  @Semantics.quantity.unitOfMeasure: 'Unidade'
  @Aggregation.default: #SUM
  Quantidade,

  @UI.lineItem: [{ position: 70, label: 'UN' }]
  @UI.identification: [{ position: 70, label: 'UN' }]
  Unidade,

  @UI.lineItem: [{ position: 80, label: 'Último Movimento' }]
  @UI.identification: [{ position: 80, label: 'Último Movimento' }]
  UltimoMovimento,

  LastChangedAt
}
