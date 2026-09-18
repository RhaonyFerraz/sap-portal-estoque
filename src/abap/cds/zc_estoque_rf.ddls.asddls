@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS Projection View - Cockpit Movimentações'
@Metadata.allowExtensions: true
@UI.headerInfo: {
  typeName: 'Movimentação de Estoque',
  typeNamePlural: 'Movimentações de Estoque',
  title: { type: #STANDARD, value: 'DocMaterial' },
  description: { value: 'Descricao' }
}

@UI.selectionPresentationVariant: [{
  qualifier: 'Default',
  presentationVariantQualifier: 'DefaultPV',
  selectionVariantQualifier: ''
}]

@UI.presentationVariant: [{
  qualifier: 'DefaultPV',
  text: 'Gráfico e Tabela',
  visualizations: [
    { type: #AS_CHART, qualifier: 'ChartMovTipo' },
    { type: #AS_LINEITEM }
  ]
}]

@UI.chart: [
  {
    qualifier: 'ChartMovTipo',
    title: 'Movimentações por Tipo (101 / 261 / 311)',
    chartType: #DONUT,
    dimensions: ['TipoMovimento'],
    measures: ['Quantidade'],
    dimensionAttributes: [{
      dimension: 'TipoMovimento',
      role: #CATEGORY
    }],
    measureAttributes: [{
      measure: 'Quantidade',
      role: #AXIS_1,
      asDataPoint: true
    }]
  },
  {
    qualifier: 'ChartMovMaterial',
    title: 'Volume Movimentado por Material',
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
  }
]

define root view entity ZC_ESTOQUE_RF
  provider contract transactional_query
  as projection on ZR_ESTOQUE_RF
{
  @UI.facet: [
    { id: 'HeaderFacet', purpose: #HEADER, type: #DATAPOINT_REFERENCE, targetQualifier: 'StatusBadge', position: 10 },
    { id: 'GeneralInfo', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'Dados da Movimentação', position: 10 }
  ]

  key MovUuid,

  @UI.lineItem: [{ position: 10, label: 'Doc. Material', importance: #HIGH }]
  @UI.identification: [{ position: 10, label: 'Documento Material' }]
  @UI.selectionField: [{ position: 10 }]
  DocMaterial,

  @UI.lineItem: [{ position: 20, label: 'Ano' }]
  @UI.identification: [{ position: 20, label: 'Ano do Documento' }]
  AnoDoc,

  @UI.lineItem: [{ position: 30, label: 'Tipo Mov.', importance: #HIGH }]
  @UI.identification: [{ position: 30, label: 'Tipo de Movimento (101/261/311)' }]
  @UI.selectionField: [{ position: 20 }]
  TipoMovimento,

  @UI.lineItem: [{ position: 40, label: 'Material', importance: #HIGH }]
  @UI.identification: [{ position: 40, label: 'Código do Material' }]
  @UI.selectionField: [{ position: 30 }]
  Material,

  @UI.lineItem: [{ position: 50, label: 'Descrição' }]
  @UI.identification: [{ position: 50, label: 'Descrição do Material' }]
  Descricao,

  @UI.lineItem: [{ position: 60, label: 'Centro' }]
  @UI.identification: [{ position: 60, label: 'Centro' }]
  Centro,

  @UI.lineItem: [{ position: 70, label: 'Dep. Origem' }]
  @UI.identification: [{ position: 70, label: 'Depósito de Origem' }]
  Deposito,

  @UI.lineItem: [{ position: 80, label: 'Dep. Destino' }]
  @UI.identification: [{ position: 80, label: 'Depósito de Destino (311)' }]
  DepositoDest,

  @UI.lineItem: [{ position: 90, label: 'Lote' }]
  @UI.identification: [{ position: 90, label: 'Lote' }]
  Lote,

  @UI.lineItem: [{ position: 100, label: 'Ordem Prod.' }]
  @UI.identification: [{ position: 100, label: 'Ordem de Produção (261)' }]
  OrdemProducao,

  @UI.lineItem: [{ position: 110, label: 'Quantidade', importance: #HIGH }]
  @UI.identification: [{ position: 110, label: 'Quantidade Movimentada' }]
  @Semantics.quantity.unitOfMeasure: 'Unidade'
  @Aggregation.default: #SUM
  Quantidade,

  @UI.lineItem: [{ position: 120, label: 'UN' }]
  @UI.identification: [{ position: 120, label: 'Unidade de Medida' }]
  Unidade,

  @UI.lineItem: [{ position: 130, label: 'Status', criticality: 'Status' }]
  @UI.dataPoint: { qualifier: 'StatusBadge', title: 'Status' }
  Status,

  @UI.lineItem: [{ position: 140, label: 'Mensagem' }]
  @UI.identification: [{ position: 140, label: 'Mensagem de Retorno' }]
  Mensagem,

  @UI.lineItem: [{ position: 150, label: 'Operador', importance: #LOW }]
  @UI.identification: [{ position: 150, label: 'Operador / Usuário' }]
  Operador,

  @UI.lineItem: [{ position: 160, label: 'Data/Hora' }]
  @UI.identification: [{ position: 160, label: 'Criado em' }]
  CreatedAt,

  LastChangedAt
}
