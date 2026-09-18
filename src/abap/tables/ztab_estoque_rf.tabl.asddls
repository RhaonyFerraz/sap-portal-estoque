@EndUserText.label : 'Movimentações de Estoque Chão de Fábrica RF'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table ztab_estoque_rf {
  key client       : abap.clnt not null;
  key mov_uuid     : sysuuid_x16 not null;
  doc_material     : abap.char(10);
  ano_doc          : abap.numc(4);
  tipo_movimento   : abap.char(3);
  material         : abap.char(18);
  descricao        : abap.char(40);
  centro           : abap.char(4);
  deposito         : abap.char(4);
  deposito_dest    : abap.char(4);
  lote             : abap.char(10);
  ordem_producao   : abap.char(12);
  @Semantics.quantity.unitOfMeasure : 'ztab_estoque_rf.unidade'
  quantidade       : abap.quan(13,3);
  unidade          : abap.unit(3);
  status           : abap.char(1);
  mensagem         : abap.char(100);
  operador         : abap.char(12);
  created_at       : abp_creation_tstmpl;
  last_changed_at  : abp_lastchange_tstmpl;
}
