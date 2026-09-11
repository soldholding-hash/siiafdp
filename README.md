# SIGEF — Projet déployable

Ce dossier est un projet React/Vite autonome, prêt à être poussé sur GitHub
et déployé sur Render — le même flux que vos autres projets (SIPGN, SICFP).

## Déploiement sur Render (démo, sans backend)

1. Créez un dépôt GitHub, poussez le contenu de ce dossier.
2. Sur Render : **New → Static Site**.
3. Branchez le dépôt GitHub.
4. Build Command : `npm install && npm run build`
5. Publish Directory : `dist`
6. Déployez. Render vous donne une URL `*.onrender.com` ; vous pouvez ensuite
   y attacher un nom de domaine personnalisé depuis les réglages du service.

Avec cette configuration, **l'application fonctionne entièrement** —
cloisonnement des comptes, cadastre, cartes foncières, Sécuri-Gage,
Connexion Judiciaire, etc. — à une exception près : les modules
d'intelligence artificielle (Assistant IA, Laboratoire d'Anticipation,
Copilote IA de la Brigade) afficheront une erreur propre tant que le point
d'entrée `/api/ask-claude` n'existe pas (voir ci-dessous). Le reste de
l'application n'est pas affecté.

## Activer les modules d'intelligence artificielle

Dans l'environnement Claude.ai, les appels à l'IA passaient par un proxy
interne qui n'existe plus une fois l'application sortie de cet
environnement. Pour réactiver ces modules, il faut un petit service
serveur qui reçoit `{ systemPrompt, userPrompt }` et relaie l'appel à
l'API Anthropic en gardant la clé API secrète côté serveur — jamais dans
le code envoyé au navigateur.

Deux options, cohérentes avec votre stack :

**Option A — Supabase Edge Function** (recommandé si vous branchez déjà
Supabase comme base de données) :

```ts
// supabase/functions/ask-claude/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const { systemPrompt, userPrompt } = await req.json();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") ?? "";
  return new Response(JSON.stringify({ text }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
```

Puis changez dans `src/App.jsx` l'URL appelée par `askClaude` pour pointer
vers l'URL de cette fonction Supabase, et stockez `ANTHROPIC_API_KEY` dans
les secrets Supabase (jamais dans le code).

**Option B — Petit service Node sur Render**, si vous préférez tout garder
sur Render : un service Express minimal avec la même logique, la clé API
stockée dans les variables d'environnement Render (jamais commitée).

## Prochaine étape — persistance des données

Actuellement, toutes les données (parcelles, dossiers, cartes) vivent en
mémoire React et se réinitialisent au rechargement — exactement comme dans
l'artefact de démonstration. Pour un usage réel, il faut brancher Supabase
comme base de données : remplacer les `useState` qui portent les données
métier par des appels à l'API Supabase (lecture au chargement, écriture à
chaque action). C'est un chantier séparé, à faire module par module plutôt
que d'un coup.
