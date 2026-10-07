# Gerenciador de Links

Aplicação em React Native + Expo para salvar e organizar links por categoria.

## Recursos

- Cadastro e login por e-mail
- Links salvos na nuvem
- Sincronização entre dispositivos
- Criar, editar e excluir links
- Abrir links diretamente pelo app
- Categorias
- Segurança por usuário com Row Level Security (RLS)
- Versão web pronta para deploy

## Configuração do Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute o arquivo `links/supabase/schema.sql`.
3. Copie a Project URL e a Publishable Key.
4. Dentro da pasta `links`, crie um arquivo `.env.local` baseado em `.env.example`.

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
```

## Executar localmente

```bash
cd links
npm install
npx expo start --web
```

## Deploy web no Vercel

- Root Directory: `links`
- Build Command: `npx expo export --platform web`
- Output Directory: `dist`

Adicione no Vercel as variáveis:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Depois faça o deploy.

> A Publishable Key do Supabase é própria para uso no cliente. O acesso aos dados é protegido pelas políticas RLS do banco.
