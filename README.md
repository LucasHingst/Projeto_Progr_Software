# Sticker Mural

Aplicação em desenvolvimento para criar murais pessoais e organizá-los com stickers.

## Tecnologias

- Bun
- TypeScript
- SQLite com `bun:sqlite`

## Executar localmente

1. Instale o [Bun](https://bun.sh/).
2. Clone o repositório.
3. Na pasta do projeto, execute:

```bash
bun run index.ts
```

O servidor inicia na porta `3000` por padrão. Para escolher outra porta, defina a variável de ambiente `PORT`.

O arquivo `database.sqlite` é criado automaticamente. As tabelas `users` e `stickers` também são criadas na inicialização.

## Endpoints

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| GET | `/user` | Lista usuários |
| POST | `/user` | Cadastra usuário |
| GET | `/user/:id` | Consulta usuário |
| PUT | `/user/:id` | Substitui os dados do usuário |
| PATCH | `/user/:id` | Atualiza somente os campos enviados |
| DELETE | `/user/:id` | Exclui usuário |

Exemplo de cadastro:

```json
{
  "username": "usuario",
  "email": "usuario@email.com",
  "password": "uma-senha-segura"
}
```

A senha precisa ter entre 8 e 128 caracteres e é armazenada usando `Bun.password.hash`. As respostas de consulta nunca incluem o hash.

### Stickers

| Método | Rota | Descrição |
|---|---|---|
| GET | `/sticker` | Lista stickers |
| GET | `/sticker?categoria=natureza` | Filtra por categoria |
| POST | `/sticker` | Cadastra sticker |
| GET | `/sticker/:id` | Consulta sticker |
| PUT | `/sticker/:id` | Substitui os dados do sticker |
| PATCH | `/sticker/:id` | Atualiza somente os campos enviados |
| DELETE | `/sticker/:id` | Exclui sticker |

Exemplo de cadastro:

```json
{
  "nome": "Folha",
  "imagem": "https://exemplo.com/folha.png",
  "categoria": "natureza"
}
```

## Respostas e validações

- JSON inválido ou campos incorretos retornam HTTP 400.
- Registros inexistentes retornam HTTP 404.
- Username/email duplicados retornam HTTP 409.
- Erros inesperados retornam HTTP 500.
- Consultas de usuários retornam apenas `id`, `username` e `email`.

## Próximas etapas

Esta versão implementa a base CRUD de usuários e stickers. Ainda faltam autenticação/login, autorização por usuário, murais, associação entre murais e stickers e testes automatizados. Para produção, também será necessário configurar limites de requisição e armazenamento apropriado das imagens.

## Interface HTML

O painel de desenvolvimento está no arquivo `index.html` e é servido pelo próprio Bun.

Depois de iniciar a API com:

```bash
bun run index.ts
```

Acesse no navegador:

```text
http://localhost:3000
```

O painel permite listar, cadastrar, editar e excluir usuários e stickers. Ele utiliza as rotas REST descritas acima, sem precisar de um servidor frontend separado.

> **Atenção:** esta é uma interface de desenvolvimento. A API ainda não possui autenticação nem controle de permissões; não exponha o servidor publicamente.
