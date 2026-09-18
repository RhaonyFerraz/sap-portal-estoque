CLASS zcl_estoque_rf DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC .

  PUBLIC SECTION.
    TYPES:
      BEGIN OF ty_movimento_input,
        tipo_movimento TYPE char3,
        material       TYPE char18,
        centro         TYPE char4,
        deposito       TYPE char4,
        deposito_dest  TYPE char4,
        lote           TYPE char10,
        ordem_producao TYPE char12,
        quantidade     TYPE p LENGTH 13 DECIMALS 3,
        unidade        TYPE c LENGTH 3,
        operador       TYPE char12,
      END OF ty_movimento_input,

      BEGIN OF ty_movimento_result,
        success      TYPE abap_bool,
        doc_material TYPE char10,
        ano_doc      TYPE numc4,
        mensagem     TYPE string,
        saldo_atual  TYPE p LENGTH 13 DECIMALS 3,
      END OF ty_movimento_result.

    CLASS-METHODS:
      validar_saldo
        IMPORTING
          is_mov         TYPE ty_movimento_input
        EXPORTING
          ev_valido      TYPE abap_bool
          ev_saldo_atual TYPE p
          ev_mensagem    TYPE string,

      executar_apontamento
        IMPORTING
          is_mov        TYPE ty_movimento_input
        RETURNING
          VALUE(rs_res) TYPE ty_movimento_result.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.

CLASS zcl_estoque_rf IMPLEMENTATION.

  METHOD validar_saldo.
    DATA: ls_saldo TYPE ztab_saldo_rf.
    ev_valido = abap_true.
    ev_mensagem = ''.
    ev_saldo_atual = 0.

    " Tipos de movimento 261 (baixa) e 311 (transferência) exigem saldo em estoque
    IF is_mov-tipo_movimento = '261' OR is_mov-tipo_movimento = '311'.
      SELECT SINGLE *
        FROM ztab_saldo_rf
        WHERE material = @is_mov-material
          AND centro   = @is_mov-centro
          AND deposito = @is_mov-deposito
          AND lote     = @is_mov-lote
        INTO @ls_saldo.

      IF sy-subrc <> 0.
        ev_valido = abap_false.
        ev_mensagem = |Material { is_mov-material } sem registro de saldo no Centro { is_mov-centro } Depósito { is_mov-deposito }.|.
        RETURN.
      ENDIF.

      ev_saldo_atual = ls_saldo-quantidade.

      IF ls_saldo-quantidade < is_mov-quantidade.
        ev_valido = abap_false.
        ev_mensagem = |Saldo insuficiente ({ ls_saldo-quantidade } { ls_saldo-unidade }) para a quantidade solicitada ({ is_mov-quantidade } { is_mov-unidade }).|.
        RETURN.
      ENDIF.
    ENDIF.
  ENDMETHOD.

  METHOD executar_apontamento.
    DATA: lv_valido       TYPE abap_bool,
          lv_saldo_atual  TYPE p LENGTH 13 DECIMALS 3,
          lv_msg          TYPE string,
          lv_timestamp    TYPE abp_lastchange_tstmpl,
          ls_saldo_origem TYPE ztab_saldo_rf,
          ls_saldo_dest   TYPE ztab_saldo_rf,
          ls_mov_db       TYPE ztab_estoque_rf,
          lv_doc_mat      TYPE char10,
          lv_ano          TYPE numc4.

    GET TIME STAMP FIELD lv_timestamp.
    lv_ano = sy-datum(4).

    " 1. Validação de regras de negócio e saldo
    validar_saldo(
      EXPORTING is_mov         = is_mov
      IMPORTING ev_valido      = lv_valido
                ev_saldo_atual = lv_saldo_atual
                ev_mensagem    = lv_msg ).

    IF lv_valido = abap_false.
      rs_res = VALUE #(
        success      = abap_false
        mensagem     = lv_msg
        saldo_atual  = lv_saldo_atual
      ).
      RETURN.
    ENDIF.

    " 2. Gerar número de documento simulado sequencial
    CASE is_mov-tipo_movimento.
      WHEN '101'.
        lv_doc_mat = |50{ sy-uzeit }|.
      WHEN '261'.
        lv_doc_mat = |49{ sy-uzeit }|.
      WHEN '311'.
        lv_doc_mat = |48{ sy-uzeit }|.
      WHEN OTHERS.
        lv_doc_mat = |10{ sy-uzeit }|.
    ENDCASE.

    " 3. Atualizar saldo (tabela ZTAB_SALDO_RF)
    CASE is_mov-tipo_movimento.
      WHEN '101'. " Entrada de Mercadoria (+ Saldo)
        SELECT SINGLE * FROM ztab_saldo_rf
          WHERE material = @is_mov-material AND centro = @is_mov-centro
            AND deposito = @is_mov-deposito AND lote = @is_mov-lote
          INTO @ls_saldo_origem.

        IF sy-subrc = 0.
          ls_saldo_origem-quantidade       = ls_saldo_origem-quantidade + is_mov-quantidade.
          ls_saldo_origem-ultimo_movimento = '101'.
          ls_saldo_origem-last_changed_at  = lv_timestamp.
          UPDATE ztab_saldo_rf FROM @ls_saldo_origem.
          lv_saldo_atual = ls_saldo_origem-quantidade.
        ELSE.
          ls_saldo_origem = VALUE #(
            client           = sy-mandt
            material         = is_mov-material
            centro           = is_mov-centro
            deposito         = is_mov-deposito
            lote             = is_mov-lote
            quantidade       = is_mov-quantidade
            unidade          = is_mov-unidade
            ultimo_movimento = '101'
            last_changed_at  = lv_timestamp
          ).
          INSERT ztab_saldo_rf FROM @ls_saldo_origem.
          lv_saldo_atual = ls_saldo_origem-quantidade.
        ENDIF.

      WHEN '261'. " Baixa para Ordem (- Saldo)
        SELECT SINGLE * FROM ztab_saldo_rf
          WHERE material = @is_mov-material AND centro = @is_mov-centro
            AND deposito = @is_mov-deposito AND lote = @is_mov-lote
          INTO @ls_saldo_origem.

        ls_saldo_origem-quantidade       = ls_saldo_origem-quantidade - is_mov-quantidade.
        ls_saldo_origem-ultimo_movimento = '261'.
        ls_saldo_origem-last_changed_at  = lv_timestamp.
        UPDATE ztab_saldo_rf FROM @ls_saldo_origem.
        lv_saldo_atual = ls_saldo_origem-quantidade.

      WHEN '311'. " Transferência entre Depósitos (- Origem, + Destino)
        SELECT SINGLE * FROM ztab_saldo_rf
          WHERE material = @is_mov-material AND centro = @is_mov-centro
            AND deposito = @is_mov-deposito AND lote = @is_mov-lote
          INTO @ls_saldo_origem.

        ls_saldo_origem-quantidade       = ls_saldo_origem-quantidade - is_mov-quantidade.
        ls_saldo_origem-ultimo_movimento = '311'.
        ls_saldo_origem-last_changed_at  = lv_timestamp.
        UPDATE ztab_saldo_rf FROM @ls_saldo_origem.
        lv_saldo_atual = ls_saldo_origem-quantidade.

        " Atualiza Destino
        SELECT SINGLE * FROM ztab_saldo_rf
          WHERE material = @is_mov-material AND centro = @is_mov-centro
            AND deposito = @is_mov-deposito_dest AND lote = @is_mov-lote
          INTO @ls_saldo_dest.

        IF sy-subrc = 0.
          ls_saldo_dest-quantidade       = ls_saldo_dest-quantidade + is_mov-quantidade.
          ls_saldo_dest-ultimo_movimento = '311'.
          ls_saldo_dest-last_changed_at  = lv_timestamp.
          UPDATE ztab_saldo_rf FROM @ls_saldo_dest.
        ELSE.
          ls_saldo_dest = VALUE #(
            client           = sy-mandt
            material         = is_mov-material
            centro           = is_mov-centro
            deposito         = is_mov-deposito_dest
            lote             = is_mov-lote
            quantidade       = is_mov-quantidade
            unidade          = is_mov-unidade
            ultimo_movimento = '311'
            last_changed_at  = lv_timestamp
          ).
          INSERT ztab_saldo_rf FROM @ls_saldo_dest.
        ENDIF.
    ENDCASE.

    " 4. Gravar registro em ZTAB_ESTOQUE_RF
    ls_mov_db = VALUE #(
      client          = sy-mandt
      mov_uuid        = cl_system_uuid=>create_uuid_x16_static( )
      doc_material    = lv_doc_mat
      ano_doc         = lv_ano
      tipo_movimento  = is_mov-tipo_movimento
      material        = is_mov-material
      centro          = is_mov-centro
      deposito        = is_mov-deposito
      deposito_dest   = is_mov-deposito_dest
      lote            = is_mov-lote
      ordem_producao  = is_mov-ordem_producao
      quantidade      = is_mov-quantidade
      unidade         = is_mov-unidade
      status          = 'S'
      mensagem        = |Movimentação { is_mov-tipo_movimento } processada com sucesso. Doc: { lv_doc_mat }|
      operador        = COND #( WHEN is_mov-operador IS NOT INITIAL THEN is_mov-operador ELSE sy-uname )
      created_at      = lv_timestamp
      last_changed_at = lv_timestamp
    ).

    INSERT ztab_estoque_rf FROM @ls_mov_db.

    rs_res = VALUE #(
      success      = abap_true
      doc_material = lv_doc_mat
      ano_doc      = lv_ano
      mensagem     = ls_mov_db-mensagem
      saldo_atual  = lv_saldo_atual
    ).
  ENDMETHOD.

ENDCLASS.
