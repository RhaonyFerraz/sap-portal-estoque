@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'CDS View Entity - Saldo em Estoque'
define root view entity ZR_SALDO_RF
  as select from ztab_saldo_rf
{
  key material         as Material,
  key centro           as Centro,
  key deposito         as Deposito,
  key lote             as Lote,
      descricao        as Descricao,
      @Semantics.quantity.unitOfMeasure: 'Unidade'
      quantidade       as Quantidade,
      unidade          as Unidade,
      ultimo_movimento as UltimoMovimento,
      last_changed_at  as LastChangedAt
}
