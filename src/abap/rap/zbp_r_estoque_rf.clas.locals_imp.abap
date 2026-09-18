CLASS lhc_Movimento DEFINITION INHERITING FROM cl_abap_behavior_handler.
  PRIVATE SECTION.

    METHODS get_instance_authorizations FOR INSTANCE AUTHORIZATION
      IMPORTING keys REQUEST requested_authorizations FOR Movimento RESULT result.

    METHODS validarDados FOR VALIDATE ON SAVE
      IMPORTING keys FOR Movimento~validarDados.

    METHODS determinarDocumento FOR DETERMINE ON MODIFY
      IMPORTING keys FOR Movimento~determinarDocumento.

ENDCLASS.

CLASS lhc_Movimento IMPLEMENTATION.

  METHOD get_instance_authorizations.
  ENDMETHOD.

  METHOD validarDados.
    READ ENTITIES OF zr_estoque_rf IN LOCAL MODE
      ENTITY Movimento
      ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_movimentos).

    LOOP AT lt_movimentos INTO DATA(ls_mov).
      " 1. Validação básica de campos obrigatórios
      IF ls_mov-Quantidade <= 0.
        APPEND VALUE #( %tky = ls_mov-%tky ) TO failed-movimento.
        APPEND VALUE #( %tky = ls_mov-%tky
                        %msg = new_message_with_text(
                                 severity = if_abap_behv_message=>severity-error
                                 text     = 'A quantidade movimentada deve ser maior que zero.' )
                      ) TO reported-movimento.
        CONTINUE.
      ENDIF.

      " 2. Validação de regras de saldo via classe de domínio ZCL_ESTOQUE_RF
      DATA(ls_input) = VALUE zcl_estoque_rf=>ty_movimento_input(
        tipo_movimento = ls_mov-TipoMovimento
        material       = ls_mov-Material
        centro         = ls_mov-Centro
        deposito       = ls_mov-Deposito
        deposito_dest  = ls_mov-DepositoDest
        lote           = ls_mov-Lote
        ordem_producao = ls_mov-OrdemProducao
        quantidade     = ls_mov-Quantidade
        unidade        = ls_mov-Unidade
        operador       = ls_mov-Operador
      ).

      zcl_estoque_rf=>validar_saldo(
        EXPORTING is_mov         = ls_input
        IMPORTING ev_valido      = DATA(lv_valido)
                  ev_saldo_atual = DATA(lv_saldo)
                  ev_mensagem    = DATA(lv_msg) ).

      IF lv_valido = abap_false.
        APPEND VALUE #( %tky = ls_mov-%tky ) TO failed-movimento.
        APPEND VALUE #( %tky = ls_mov-%tky
                        %msg = new_message_with_text(
                                 severity = if_abap_behv_message=>severity-error
                                 text     = lv_msg )
                      ) TO reported-movimento.
      ENDIF.
    ENDLOOP.
  ENDMETHOD.

  METHOD determinarDocumento.
    READ ENTITIES OF zr_estoque_rf IN LOCAL MODE
      ENTITY Movimento
      ALL FIELDS WITH CORRESPONDING #( keys )
      RESULT DATA(lt_movimentos).

    LOOP AT lt_movimentos INTO DATA(ls_mov).
      DATA(lv_prefixo) = COND string( WHEN ls_mov-TipoMovimento = '101' THEN '50'
                                      WHEN ls_mov-TipoMovimento = '261' THEN '49'
                                      WHEN ls_mov-TipoMovimento = '311' THEN '48'
                                      ELSE '10' ).

      DATA(lv_doc) = |{ lv_prefixo }{ sy-uzeit }|.
      DATA(lv_ano) = CONV numc4( sy-datum(4) ).
      DATA(lv_user) = COND char12( WHEN ls_mov-Operador IS NOT INITIAL THEN ls_mov-Operador ELSE sy-uname ).

      MODIFY ENTITIES OF zr_estoque_rf IN LOCAL MODE
        ENTITY Movimento
        UPDATE FIELDS ( DocMaterial AnoDoc Status Mensagem Operador )
        WITH VALUE #( ( %tky        = ls_mov-%tky
                        DocMaterial = lv_doc
                        AnoDoc      = lv_ano
                        Status      = 'S'
                        Mensagem    = |Movimentação { ls_mov-TipoMovimento } processada com sucesso via Coletor RF.|
                        Operador    = lv_user ) ).

      " Atualizar tabelas de saldo físico em tempo real
      DATA(ls_input) = VALUE zcl_estoque_rf=>ty_movimento_input(
        tipo_movimento = ls_mov-TipoMovimento
        material       = ls_mov-Material
        centro         = ls_mov-Centro
        deposito       = ls_mov-Deposito
        deposito_dest  = ls_mov-DepositoDest
        lote           = ls_mov-Lote
        ordem_producao = ls_mov-OrdemProducao
        quantidade     = ls_mov-Quantidade
        unidade        = ls_mov-Unidade
        operador       = lv_user
      ).

      zcl_estoque_rf=>executar_apontamento( ls_input ).
    ENDLOOP.
  ENDMETHOD.

ENDCLASS.
