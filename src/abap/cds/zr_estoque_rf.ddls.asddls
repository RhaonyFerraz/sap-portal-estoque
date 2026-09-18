@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS Root View Entity - Movimentações de Estoque'
define root view entity ZR_ESTOQUE_RF
  as select from ztab_estoque_rf
{
  key mov_uuid        as MovUuid,
      doc_material    as DocMaterial,
      ano_doc         as AnoDoc,
      tipo_movimento  as TipoMovimento,
      material        as Material,
      descricao       as Descricao,
      centro          as Centro,
      deposito        as Deposito,
      deposito_dest   as DepositoDest,
      lote            as Lote,
      ordem_producao  as OrdemProducao,
      @Semantics.quantity.unitOfMeasure: 'Unidade'
      quantidade      as Quantidade,
      unidade         as Unidade,
      status          as Status,
      mensagem        as Mensagem,
      operador        as Operador,
      @Semantics.systemDateTime.createdAt: true
      created_at      as CreatedAt,
      @Semantics.systemDateTime.lastChangedAt: true
      last_changed_at as LastChangedAt
}
