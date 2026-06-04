# Roadmap MouseForge

## Objetivo

Transformar o MouseForge em um PDV web/PWA comercial para mercados pequenos e medios, com multiempresa, multifilial, controle de usuarios, estoque, vendas, fiscal, relatorios e auditoria suficiente para operacao e LGPD sem gerar armazenamento desnecessario.

## Fase 1 - Nucleo operacional

- Produtos com cadastro rapido, codigo de barras, preco, estoque minimo, estoque atual e dados fiscais basicos.
- Clientes com cadastro simples para venda identificada.
- Frente de caixa com busca de produto, carrinho, forma de pagamento e finalizacao de venda.
- Baixa automatica de estoque ao finalizar venda.
- Documento fiscal operacional gerado a partir da venda, inicialmente em status pendente.
- Dashboard com dados reais do dia, respeitando empresa e filial do usuario.
- Relatorio por periodo com exportacao CSV.
- Auditoria enxuta para eventos de negocio: produto, cliente, estoque, venda e fiscal.

## Fase 2 - Usabilidade de mercado

- Edicao completa de produtos, clientes e regras fiscais.
- Importacao/exportacao mais robusta para planilhas, com validacao antes de gravar.
- Atalhos de caixa, leitor de codigo de barras, quantidade rapida e cancelamento controlado.
- Fechamento de caixa, suprimento, sangria e conferencia por operador.
- Relatorios por filial, operador, produto, forma de pagamento e curva ABC.
- Filtros globais de empresa/filial para usuario mestre e gerentes.

## Fase 3 - Fiscal real

- Cadastro de certificado digital, CSC, serie, ambiente e parametros fiscais por empresa/filial.
- Integracao com emissor fiscal ou servico especializado de NFC-e/NF-e.
- Tratamento de autorizacao, rejeicao, inutilizacao, cancelamento e contingencia.
- Armazenamento economico de XML/chave/protocolo, evitando payloads redundantes no banco.

Status inicial: criada a configuracao fiscal por empresa/filial e uma camada de emissao preparada para provedor. O modo manual em homologacao simula autorizacao para validar fluxo; producao deve usar provedor fiscal real.

## Fase 4 - PWA e operacao resiliente

- Manifest e service worker revisados para uso em instalacao.
- Cache apenas de assets e dados essenciais, sem comprometer fiscal/estoque.
- Tela responsiva para tablet/notebook de caixa.
- Modo degradado planejado para internet instavel, com fila de sincronizacao apenas se fiscal permitir.

## Politica de rastreabilidade

Registrar somente eventos que tenham valor operacional, fiscal, financeiro ou de auditoria:

- criacao/edicao/inativacao de cadastros relevantes;
- movimentacoes de estoque;
- finalizacao/cancelamento de venda;
- alteracao de status fiscal;
- aceite de termos/LGPD.

Evitar logs de navegacao, cliques e leituras comuns para reduzir custo e volume no Supabase.
