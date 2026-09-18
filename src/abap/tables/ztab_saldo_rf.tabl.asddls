@EndUserText.label : 'Saldo de Estoque em Tempo Real'
@AbapCatalog.enhancement.category : #NOT_EXTENSIBLE
@AbapCatalog.tableCategory : #TRANSPARENT
@AbapCatalog.deliveryClass : #A
@AbapCatalog.dataMaintenance : #RESTRICTED
define table ztab_saldo_rf {
  key client       : abap.clnt not null;
  key material     : abap.char(18) not null;
  key centro       : abap.char(4) not null;
  key deposito     : abap.char(4) not null;
  key lote         : abap.char(10) not null;
  descricao        : abap.char(40);
  @Semantics.quantity.unitOfMeasure : 'ztab_saldo_rf.unidade'
  quantidade       : abap.quan(13,3);
  unidade          : abap.unit(3);
  ultimo_movimento : abap.char(3);
  last_changed_at  : abp_lastchange_tstmpl;
}
