# Guia de Ativação no SAP BTP via VS Code (SAP ADT)

Este guia orienta a criação e ativação sequencial dos objetos no seu sistema **TRL (SAP BTP ABAP Environment Trial)** conectado no VS Code.

---

## Ordem de Criação e Ativação no SAP ADT

Para evitar erros de dependência, crie e ative os objetos exatamente na seguinte ordem:

```
1. Tabelas de Banco (DDIC)
   └── ZTAB_SALDO_RF
   └── ZTAB_ESTOQUE_RF

2. Classe de Lógica de Domínio
   └── ZCL_ESTOQUE_RF

3. Classe de Carga Inicial (Seed Data)
   └── ZCL_POPULATE_ESTOQUE_RF (Executar com F9)

4. CDS View Entities Básicas
   └── ZR_SALDO_RF
   └── ZR_ESTOQUE_RF

5. CDS Projection Views (Fiori UI)
   └── ZC_SALDO_RF
   └── ZC_ESTOQUE_RF

6. Behavior Definition & Implementation (RAP)
   └── ZR_ESTOQUE_RF (BDEF)
   └── ZBP_R_ESTOQUE_RF (Classe Behavior Pool)
   └── ZC_ESTOQUE_RF (BDEF de Projeção)

7. Exposição OData V4
   └── ZUI_ESTOQUE_RF_O4 (Service Definition)
   └── ZUI_ESTOQUE_RF_O4_V4 (Service Binding)
```

---

## Passo a Passo no VS Code com a Extensão SAP ADT

### 1. Criar o Pacote ABAP (caso ainda não tenha criado)
- No menu do SAP ADT, clique com botão direito no seu sistema **TRL** > **New ABAP Package**.
- **Name**: `ZLOGISTICA_ESTOQUE` (ou use `$TMP` para objetos locais).
- **Description**: `Portal de Logística e Estoque RF`.

### 2. Criar as Tabelas Transparentes
1. Clique com botão direito no pacote > **New Database Table**.
2. Nome: `ZTAB_SALDO_RF`. Cole o conteúdo de `src/abap/tables/ztab_saldo_rf.tabl.asddls`. Pressione `Ctrl + S` e `Ctrl + F3` (Activate).
3. Nome: `ZTAB_ESTOQUE_RF`. Cole o conteúdo de `src/abap/tables/ztab_estoque_rf.tabl.asddls`. Pressione `Ctrl + S` e `Ctrl + F3` (Activate).

### 3. Criar a Classe de Lógica `ZCL_ESTOQUE_RF`
1. Botão direito no pacote > **New ABAP Class**.
2. Nome: `ZCL_ESTOQUE_RF`.
3. Cole o conteúdo de `src/abap/classes/zcl_estoque_rf.clas.abap`.
4. Pressione `Ctrl + S` e `Ctrl + F3` (Activate).

### 4. Criar a Classe de Carga Inicial e Rodar o F9
1. Botão direito no pacote > **New ABAP Class**.
2. Nome: `ZCL_POPULATE_ESTOQUE_RF`.
3. Cole o conteúdo de `src/abap/classes/zcl_populate_estoque_rf.clas.abap`.
4. Pressione `Ctrl + S` e `Ctrl + F3` (Activate).
5. **Executar**: Pressione **`F9`** (Run ABAP Application as Console). O terminal do console ADT exibirá as mensagens de confirmação e os registros inseridos nas tabelas do SAP HANA!

### 5. Criar as CDS Views
1. Botão direito em **Core Data Services** > **New Data Definition**.
   - `ZR_SALDO_RF` -> cole `src/abap/cds/zr_saldo_rf.ddls.asddls` -> Ativar (`Ctrl + F3`).
   - `ZR_ESTOQUE_RF` -> cole `src/abap/cds/zr_estoque_rf.ddls.asddls` -> Ativar (`Ctrl + F3`).
   - `ZC_SALDO_RF` -> cole `src/abap/cds/zc_saldo_rf.ddls.asddls` -> Ativar (`Ctrl + F3`).
   - `ZC_ESTOQUE_RF` -> cole `src/abap/cds/zc_estoque_rf.ddls.asddls` -> Ativar (`Ctrl + F3`).

### 6. Criar o RAP Behavior Definition (BDEF)
1. Botão direito em `ZR_ESTOQUE_RF` > **New Behavior Definition**.
   - Tipo: **Managed**.
   - Cole o código de `src/abap/rap/zr_estoque_rf.bdef.asbdef`.
2. Posicione o cursor no nome da classe `zbp_r_estoque_rf` e aperte `Ctrl + 1` (Quick Fix) para gerar o Behavior Pool automaticamente, ou crie a classe e cole `zbp_r_estoque_rf.clas.abap` e a aba `Local Types` com `zbp_r_estoque_rf.clas.locals_imp.abap`.
3. Crie a Behavior Definition para a projeção `ZC_ESTOQUE_RF` usando `src/abap/rap/zc_estoque_rf.bdef.asbdef`. Ative todos (`Ctrl + Shift + F3`).

### 7. Criar a Service Definition e o Service Binding OData V4
1. Botão direito em **Core Data Services** > **New Service Definition**.
   - Nome: `ZUI_ESTOQUE_RF_O4`.
   - Cole `src/abap/service/zui_estoque_rf_o4.srvd.asrvds`. Ative (`Ctrl + F3`).
2. Botão direito na Service Definition criada > **New Service Binding**.
   - **Name**: `ZUI_ESTOQUE_RF_O4_V4`.
   - **Binding Type**: `OData V4 - UI` (ou `OData V4 - Web API`).
   - Clique em **Activate** e depois em **Publish**.
3. No painel de entidades publicado, clique duas vezes em **Movimentacoes** ou **Saldos** para abrir o **Fiori Elements Preview** diretamente no navegador e testar a API!
