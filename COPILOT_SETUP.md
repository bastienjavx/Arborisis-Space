# Configuration GitHub Copilot Auto-Review

## Vue d'ensemble

Ce workflow active la revue automatique des PRs par GitHub Copilot.

## Prérequis

1. **Organisation GitHub** : Le workflow `copilot-review.yml` utilise l'action officielle `github/copilot-code-review-gpt4@v1`
2. **Permissions** : L'action nécessite les permissions `pull-requests: write` et `contents: read`
3. **Token GitHub** : Utilise le token par défaut `${{ secrets.GITHUB_TOKEN }}` (fourni automatiquement par GitHub Actions)

## Fonctionnement

- **Déclencheur** : À chaque ouverture ou mise à jour d'une PR (synchronize)
- **Analyse** : Copilot analyse les changements de code
- **Commentaires** : Publie des commentaires de revue sur la PR
- **Non-bloquant** : La revue n'affecte pas le statut du CI (elle s'exécute en parallèle)

## Emplacement

- Workflow : `.github/workflows/copilot-review.yml`
- Le workflow s'exécute automatiquement pour toute PR vers `main`

## Limitation de concurrence

Le workflow utilise une concurrence groupée pour éviter les reviews dupliquées :
```yaml
concurrency:
  group: copilot-review-${{ github.ref }}
  cancel-in-progress: true
```

Cela signifie que si une nouvelle poussée arrive avant que la revue ne soit terminée, l'ancienne revue est annulée et une nouvelle débute.

## Désactivation

Pour désactiver temporairement les reviews Copilot :
1. Commentez le workflow dans `.github/workflows/copilot-review.yml`
2. Ou supprimez le fichier du workflow
3. Ou désactivez-le dans les paramètres GitHub Actions du repo

## Alternatives

Si `github/copilot-code-review-gpt4@v1` n'est pas disponible, des alternatives :
- **CodeRabbit** : `coderabbit/github-action@v1` (recommandé pour la stabilité)
- **Aider** : `aider/aider-action@v1` (nécessite une clé API)

