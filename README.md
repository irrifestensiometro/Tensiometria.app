# Tensiometria.app

Aplicacao web para acompanhamento de tensiometria e irrigacao.

## Executar localmente

**Pre-requisitos:** Node.js 18 ou superior e npm.

1. Instale as dependencias:

   ```powershell
   npm install
   ```

2. Crie o arquivo local de configuracao a partir do modelo:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. No arquivo `.env.local`, substitua os valores `YOUR_...` pelos dados do app Web do Firebase, encontrados em **Firebase Console > Configuracoes do projeto > Geral > Seus apps**. As variaveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID` sao necessarias para iniciar a aplicacao.

   Para usar autenticacao e dados, habilite os provedores de login usados pelo projeto em **Authentication** e configure o **Firestore** no mesmo projeto. Adicione `localhost` aos dominios autorizados em **Authentication > Configuracoes > Dominios autorizados** se for usar login Google. Use `http://localhost:3000` (nao `http://127.0.0.1:3000`); se preferir o endereco IP, adicione tambem `127.0.0.1` nessa lista.

4. Inicie o servidor de desenvolvimento:

   ```powershell
   npm run dev
   ```

5. Abra [http://localhost:3000](http://localhost:3000). O servidor fica vinculado ao loopback local. Reinicie-o depois de alterar `.env.local`.

## Instalar como aplicativo (PWA)

Nos paineis de produtor e agronomo, abra o menu do perfil e escolha **Instalar aplicativo**. Em navegadores compativeis, o IRRIFES abre o fluxo nativo de instalacao; nos demais, mostra como adicionar o app a tela inicial ou ao menu de aplicativos. No iPhone e iPad, use o Safari e escolha **Compartilhar > Adicionar a Tela de Inicio**.

Para testar a instalacao localmente, gere e sirva a versao de producao em `localhost`:

```powershell
npm run build
npm run preview
```

Depois abra o endereco informado pelo Vite Preview (por padrao, `http://localhost:4173`). O servidor de desenvolvimento (`npm run dev`) nao registra o service worker. Em producao, publique o site em HTTPS e mantenha acessiveis `/manifest.webmanifest`, `/service-worker.js` e os icones em `/icons/`. O service worker armazena a interface e os recursos compilados para permitir abrir a estrutura do app sem conexao; autenticacao, dados do Firebase, mapas e outras integracoes online continuam dependendo de internet.

## Verificacoes

```powershell
npm run lint
npm test
npm run build
```

## Setores e recomendacoes de irrigacao

Cada setor agrupa seus proprios tensiometros e recebe um calculo independente de gatilho, lamina e tempo de irrigacao. Os parametros de solo, cultura e sistema de irrigacao sao compartilhados pela area; as leituras e as camadas monitoradas sao avaliadas separadamente dentro de cada setor. Para que a recomendacao seja calculada, cada setor precisa ter ao menos um tensiometro de decisao e seus sensores devem cobrir a profundidade radicular sem lacunas. Os resultados sao apresentados por setor para o produtor e para o agronomo.

Na criacao da area, o campo **Referencia textural do solo** permite registrar uma das classes do triangulo textural da EMBRAPA (muito argilosa, argilosa, media, siltosa ou arenosa). A selecao preenche CC com a media geral da planilha (21% gravimetrica, convertida para 0,252 cm3/cm3 com Ds = 1,2 g/cm3); a planilha nao fornece valores de CC distintos para cada classe. A faixa media de CC e 18–26%, e a de PMP e 8–12% (media 9,5%); PMP e informativo e nao entra no calculo atual. A referencia nao altera os coeficientes A e B, que devem ser obtidos no laudo fisico-hidrico do talhao. As abas de ensaios Planilha 1, Centro do pivo e Banana nao sao aplicadas como referencias texturais.

O passo de solo apresenta um triangulo textural vetorial e responsivo com os eixos de argila, areia e silte como apoio visual para identificar as classes; confirme a classificacao com a analise granulometrica.

No primeiro passo do cadastro, o agronomo informa livremente a cultura e a profundidade radicular. A partir de cinco areas com a mesma combinacao de cultura e profundidade, essa combinacao passa a aparecer entre as cinco mais usadas, ordenadas pela frequencia, como sugestao opcional. As sugestoes usam as areas cadastradas pelo proprio agronomo e se atualizam apos novos cadastros; areas antigas sem cultura registrada nao entram na contagem.

Os rascunhos do cadastro de areas so sao salvos localmente ou na nuvem depois que o passo 1 tiver nome da area, produtor vinculado, cultura e profundidade radicular valida (50–2000 mm).

## Regras seguras do Firestore

O app usa regras com permissao negada por padrao. Produtores podem criar o proprio perfil apos autenticacao por e-mail ou Google, sem aprovacao. Um agronomo autenticado pode criar contas de produtor e de outro agronomo pelo painel; a criacao de produtor usa uma instancia Firebase isolada para preservar a sessao do agronomo. Novos agronomos nao recebem privilegios de administrador. Para preencher a selecao de produtor, um agronomo autenticado pode consultar perfis com `tipo: "produtor"` na colecao `usuarios`. Essa permissao retorna os campos completos desses perfis, incluindo email e localizacao.

**Importante:** publique `firestore.rules` atualizado no Console do Firestore para permitir cadastro automatico de produtores e agronomos, consulta dos perfis de produtores por agronomos, sincronizacao de rascunhos de areas e compartilhamento de leituras. Leituras ficam em `areas/{areaId}/leituras`; apenas o produtor vinculado e o agronomo proprietario podem consulta-las ou registra-las, e cada registro identifica o UID do autor. A exclusao de uma area remove suas leituras em lotes antes de excluir o documento. A consulta de produtores exige o filtro `tipo == "produtor"`; sem as regras publicadas, a lista ou sincronizacao retornara `permission-denied`. Os rascunhos ficam em `rascunhos_areas`, acessiveis somente pelo agronomo que os criou, e so viram areas visiveis ao produtor quando o cadastro e finalizado.

```powershell
$env:FIREBASE_PROJECT_ID = "irrifes-tensiometria"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho-seguro\firebase-admin.json"
npm run provision:admin -- agro@adm.com "Agrônomo administrador"
```

Execute esse comando uma unica vez para criar a conta inicial. O script pede a senha duas vezes sem mostrá-la na tela e exige no minimo 12 caracteres. Use uma senha nova, forte e diferente de qualquer senha compartilhada em mensagens. A credencial de servico deve ficar fora do repositorio; nao a envie ao navegador nem ao Git. O comando usa o Admin SDK localmente, sem Cloud Functions ou plano Blaze.

Depois, qualquer agronomo autenticado pode criar uma conta de produtor ou outra conta de agronomo pela dashboard, informando nome, e-mail e senha inicial. O cadastro de agronomo permanece indisponivel na tela de login e no formulario de contato. Publique as regras atualizadas para permitir a criacao de contas/perfis pelo painel; o auto-cadastro continua permitido apenas para produtores.

### Gestao local e segura de agronomos

O botao **Visualizar agronomos**, exibido abaixo de **Novo agronomo** para administradores, permite listar os perfis e editar nomes. A listagem e a edicao usam as regras do Firestore: apenas perfis com `tipo: "agronomo"` e `cargo: "admin"` podem consultar outros perfis de agronomo e alterar somente o campo `nome`. Nao ha Cloud Functions no projeto.

Promocao, rebaixamento e exclusao de contas Authentication nao sao disponibilizados pelo app web; execute-os localmente com Firebase Admin SDK. O cargo fica em `usuarios/{UID}.cargo`, e as regras impedem usuarios de alterar esse campo pelo cliente. Configure o administrador inicial com o script `npm run provision:admin` descrito acima. Para operacoes posteriores, mantenha a credencial fora do repositorio:

```powershell
$env:FIREBASE_PROJECT_ID = "<ID_DO_PROJETO>"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho-seguro\firebase-admin.json"
npm run provision:user -- <UID_DO_AGRONOMO> agronomo --admin
npm run provision:user -- <UID_DO_ADMIN> agronomo --remove-admin
npm run delete:agronomist -- <UID_DO_AGRONOMO>
```

Os scripts locais exigem credencial administrativa apenas no terminal confiavel. Promova outro administrador antes de rebaixar o ultimo admin. A exclusao e bloqueada para administradores e agronomos com areas vinculadas, e pede confirmacao digitando o UID completo. Nunca copie a credencial de servico para o app web, nem a commite ou envie a terceiros.

O cadastro de produtor por formulario ou Google cria o perfil com `tipo: "produtor"` sem aprovacao. Tanto produtor quanto agronomo precisam ter perfil com o tipo correto para acessar o respectivo painel; tentar entrar no perfil errado encerra a sessao.

Para cadastrar areas, use o UID da conta de produtor existente em Authentication. As regras verificam que o perfil Firestore desse UID existe e tem `tipo: "produtor"`. Leituras ainda nao sao persistidas no Firestore e permanecem bloqueadas pelas regras.

Esse provisionamento nao usa Cloud Functions nem exige ativar o plano Blaze. No plano Spark, operacoes estao sujeitas as cotas gratuitas e podem ser limitadas quando a cota e atingida; nao habilite billing se quiser permanecer no gratuito.
