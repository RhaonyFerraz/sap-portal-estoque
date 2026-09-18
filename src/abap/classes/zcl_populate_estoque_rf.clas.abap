CLASS zcl_populate_estoque_rf DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    INTERFACES if_oo_adt_classrun .
  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_populate_estoque_rf IMPLEMENTATION.

  METHOD if_oo_adt_classrun~main.
    DATA: lt_saldos    TYPE TABLE OF ztab_saldo_rf,
          lt_movs      TYPE TABLE OF ztab_estoque_rf,
          lv_timestamp TYPE abp_lastchange_tstmpl.

    GET TIME STAMP FIELD lv_timestamp.

    " Limpar dados prévios para recarga
    DELETE FROM ztab_saldo_rf.
    DELETE FROM ztab_estoque_rf.

    " 1. Carga de Saldos Iniciais em Depósitos
    lt_saldos = VALUE #(
      ( client = sy-mandt material = 'MAT-1001' centro = '1000' deposito = '1010' lote = 'LOTE-A1'
        descricao = 'Parafuso Sextavado M8x40 Aço Carbono' quantidade = '1250.000' unidade = 'ST'
        ultimo_movimento = '101' last_changed_at = lv_timestamp )
      ( client = sy-mandt material = 'MAT-2002' centro = '1000' deposito = '1010' lote = 'LOTE-B2'
        descricao = 'Motor Elétrico Trifásico 2CV 4P' quantidade = '48.000' unidade = 'ST'
        ultimo_movimento = '101' last_changed_at = lv_timestamp )
      ( client = sy-mandt material = 'MAT-3003' centro = '1000' deposito = '1010' lote = 'LOTE-C3'
        descricao = 'Chapa de Aço Inoxidável 304 2mm' quantidade = '320.500' unidade = 'KG'
        ultimo_movimento = '101' last_changed_at = lv_timestamp )
      ( client = sy-mandt material = 'MAT-4004' centro = '1000' deposito = '1020' lote = 'LOTE-D4'
        descricao = 'Rolamento Rígido de Esferas 6204' quantidade = '85.000' unidade = 'ST'
        ultimo_movimento = '311' last_changed_at = lv_timestamp )
      ( client = sy-mandt material = 'MAT-5005' centro = '1000' deposito = '1010' lote = 'LOTE-E5'
        descricao = 'Graxa Lubrificante Industrial Sintética' quantidade = '15.000' unidade = 'L'
        ultimo_movimento = '101' last_changed_at = lv_timestamp )
    ).

    INSERT ztab_saldo_rf FROM TABLE @lt_saldos.
    out->write( |Saldos inseridos com sucesso: { lines( lt_saldos ) } registros.| ).

    " 2. Carga de Histórico Inicial de Movimentações
    lt_movs = VALUE #(
      ( client = sy-mandt mov_uuid = cl_system_uuid=>create_uuid_x16_static( )
        doc_material = '5000000001' ano_doc = '2026' tipo_movimento = '101'
        material = 'MAT-1001' descricao = 'Parafuso Sextavado M8x40 Aço Carbono'
        centro = '1000' deposito = '1010' lote = 'LOTE-A1'
        quantidade = '1250.000' unidade = 'ST' status = 'S'
        mensagem = 'Entrada por compra PO 4500012984 realizada com sucesso'
        operador = 'OP_MARCOS' created_at = lv_timestamp last_changed_at = lv_timestamp )

      ( client = sy-mandt mov_uuid = cl_system_uuid=>create_uuid_x16_static( )
        doc_material = '5000000002' ano_doc = '2026' tipo_movimento = '101'
        material = 'MAT-2002' descricao = 'Motor Elétrico Trifásico 2CV 4P'
        centro = '1000' deposito = '1010' lote = 'LOTE-B2'
        quantidade = '50.000' unidade = 'ST' status = 'S'
        mensagem = 'Recebimento de fornecedor WEG NF 84920'
        operador = 'OP_MARCOS' created_at = lv_timestamp last_changed_at = lv_timestamp )

      ( client = sy-mandt mov_uuid = cl_system_uuid=>create_uuid_x16_static( )
        doc_material = '4900000001' ano_doc = '2026' tipo_movimento = '261'
        material = 'MAT-2002' descricao = 'Motor Elétrico Trifásico 2CV 4P'
        centro = '1000' deposito = '1010' lote = 'LOTE-B2' ordem_producao = 'OP100984'
        quantidade = '2.000' unidade = 'ST' status = 'S'
        mensagem = 'Baixa para ordem de produção linha de esteiras'
        operador = 'OP_LUCAS' created_at = lv_timestamp last_changed_at = lv_timestamp )

      ( client = sy-mandt mov_uuid = cl_system_uuid=>create_uuid_x16_static( )
        doc_material = '4900000002' ano_doc = '2026' tipo_movimento = '311'
        material = 'MAT-4004' descricao = 'Rolamento Rígido de Esferas 6204'
        centro = '1000' deposito = '1010' deposito_dest = '1020' lote = 'LOTE-D4'
        quantidade = '85.000' unidade = 'ST' status = 'S'
        mensagem = 'Transferência entre depósitos (Central -> Linha Montagem)'
        operador = 'OP_LUCAS' created_at = lv_timestamp last_changed_at = lv_timestamp )
    ).

    INSERT ztab_estoque_rf FROM TABLE @lt_movs.
    out->write( |Movimentações inseridas com sucesso: { lines( lt_movs ) } registros.| ).
    out->write( 'Carga inicial do Portal de Logística & Estoque concluída com êxito!' ).
  ENDMETHOD.

ENDCLASS.
