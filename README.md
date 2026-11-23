# Meu Espaço Pessoal 💗

Um site **separado** do projeto Meus Sonhos & Metas, feito para GitHub Pages e celular/computador.

## O que já funciona

- Criar, renomear e excluir **pastas** (Português, Pedagogia, Minha rotina etc.) sem perder os textos ao excluir a pasta.
- Criar quantos **tópicos/documentos** quiser dentro de cada pasta.
- Editar texto com formatação inspirada no **Word**: títulos, negrito, itálico, sublinhado, listas, alinhamento, tabelas e links.
- Adicionar **fotos e vídeos diretamente dos seus arquivos**: clique em **📷 Foto do computador** ou **🎬 Vídeo do computador**. A opção **Vídeo por link** continua disponível, mas não é obrigatória. O modo local aceita arquivos até **100 MB**, sujeito à capacidade de armazenamento do navegador; o modo nuvem, até **25 MB**. Você pode reorganizar, alinhar e redimensionar as mídias.
- **Baixar este texto + arquivos** cria um **ZIP com um HTML legível e as fotos/vídeos originais incluídos na pasta `midias/`**. Extraia todos os arquivos e abra `abrir-meu-texto.html` no computador. Vídeos incorporados do YouTube continuam exigindo internet e não são baixados.
- Selecione uma foto ou vídeo que você enviou e clique em **Baixar foto/vídeo** para baixar só aquele arquivo.
- **Pesquisa geral** por título, palavras no conteúdo ou ambos, sem precisar abrir as pastas.
- **Salvar automaticamente**, modo apresentação com visual de leitura, layout responsivo.
- Fazer cópia de segurança e importar (no modo local, inclui mídias; na nuvem, exportação JSON inclui os textos e as referências aos arquivos privados, mas não os arquivos em si).
- **Login verdadeiro por e-mail e senha**, com armazenamento privado e sincronização entre aparelhos, depois de ligar seu próprio projeto Supabase (passos abaixo).

## A maneira mais simples de experimentar agora

1. Extraia o ZIP.
2. Abra `index.html` em um navegador. Para evitar restrições do navegador com arquivos locais, você pode colocar os quatro arquivos `index.html`, `styles.css`, `app.js` e `config.js` em um novo repositório do GitHub e ativar Pages.
3. Clique em **Experimentar no meu aparelho**. O site já traz pastas e dois documentos de exemplo.
4. Esse modo **não tem senha nem sincronização**. Os dados são guardados no armazenamento do navegador usado. **Faça backup** usando o botão *Exportar cópia*; não use navegação privada nem limpe os dados do site sem fazer backup.

## Como ativar LOGIN SEGURO com sincronização (Supabase)

É necessário ter seu próprio projeto gratuito no [Supabase](https://supabase.com/) para criar contas reais, guardar textos e mídias privadas. Não é seguro criar um login verdadeiro só com HTML e GitHub Pages sem um serviço de autenticação.

1. Crie uma conta no Supabase e um projeto novo. Guarde sua senha do Supabase de forma segura.
2. Na área **SQL Editor** do Supabase, cole o conteúdo completo de `supabase-setup.sql` e execute uma vez. Isso cria as duas tabelas, ativa regras de acesso por usuário (RLS) e um bucket privado de mídia.
3. Em **Project Settings / API** (a localização dos controles pode variar), copie o **Project URL** e a chave **anon**/**publishable** do projeto. **Nunca use a chave `service_role` ou `secret`** no site.
4. Abra `config.js` e preencha os dois valores:

   ```javascript
   window.CADERNO_CONFIG = {
     supabaseUrl: 'https://SEU-PROJETO.supabase.co',
     supabaseAnonKey: 'SUA_CHAVE_PUBLICA'
   };
   ```

5. Em **Authentication / Providers / Email**, mantenha autenticação por e-mail habilitada. Decida se deseja confirmação por e-mail. Configure o endereço público do seu site nas **URL Configuration / Site URL** e Redirect URLs, se necessário.
6. Publique os arquivos em um **repositório NOVO** do GitHub (não misture com o antigo). Em **Settings → Pages → Deploy from a branch → main / root** publique e abra o novo link HTTPS.
7. Agora escolha **Criar conta**, confirme o e-mail quando necessário e faça login. Seus textos e pastas são salvos por usuário no banco e as fotos/vídeos em uma área privada da mesma conta.

### Observações importantes

- O projeto **Meus Sonhos & Metas** não é modificado.
- As fotos e os vídeos no modo local são preservados no **IndexedDB do navegador**, não dentro do repositório público do GitHub. Se limpar os dados do navegador, usar outro aparelho ou outro domínio, poderá perder o acesso, então exporte cópias com frequência. Para vídeos grandes, prefira exportar cada texto com suas mídias em ZIP; o backup geral em JSON pode ficar muito pesado.
- O modo local e o modo de nuvem são **separados**: para migrar os textos, exporte/importa a cópia. Uma cópia local com fotos não faz automaticamente upload das fotos na nuvem; nesse caso, reinsira as imagens nos textos já importados. Faça uma cópia antes de migrar.
- O modo nuvem requer conexão com internet; a autenticação depende do CDN público do Supabase.
- Arquivos enviados à nuvem ficam em um bucket privado; o site cria links temporários durante a visualização. Um link de vídeo do YouTube continua seguindo as regras de privacidade do YouTube.
- Armazenamento em nuvem, uploads e tamanho de arquivos são sujeitos aos limites do seu plano Supabase. Vídeos de mais de 25 MB devem ser incorporados por link externo.
- O editor nativo usa recursos do navegador. Ele é ótimo para um caderno pessoal, mas não oferece todos os recursos avançados de Word e PowerPoint; “Apresentar” é uma visualização, não um arquivo `.pptx`.
- Segurança e privacidade: não adicione senhas ou dados confidenciais dentro de `config.js`; a chave pública do Supabase é destinada ao navegador, e o acesso é protegido pelas políticas RLS do arquivo SQL.

## Arquivos

`index.html` (páginas e editor), `styles.css` (visual), `app.js` (funcionalidades), `config.js` (conexão pública com Supabase), `supabase-setup.sql` (banco seguro), `README.md` (este guia).

## Atualização de um site já publicado

Se você já usa o Meu Espaço Pessoal no GitHub Pages, envie os **seis arquivos atualizados** para a raiz do **mesmo repositório** e confirme as alterações. Isso atualiza o site sem apagar as anotações locais previamente salvas nesse mesmo navegador e endereço. **Antes de atualizar, exporte uma cópia de segurança**. O modo local não sincroniza anotações entre aparelhos.
