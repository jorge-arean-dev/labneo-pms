# Syncing Replicated Apps with Reference Repository

Pull updates from the reference PMS repository into a replicated app.

## Commands

```bash
# 1. Navigate to your replicated app
cd /path/to/replicated-app

# 2. Create a sync branch
git checkout -b sync-from-reference

# 3. Add reference repo as remote (only needed once)
git remote add reference https://github.com/[owner]/pms.git

# 4. Fetch from reference
git fetch reference

# 5. Merge
git merge reference/main --allow-unrelated-histories

# 6. Resolve conflicts if any

# 7. Switch to main and merge
git checkout main
git merge sync-from-reference

# 8. Push to origin
git push origin main
```

## Future Syncs

Skip step 3 (remote already exists):

```bash
git checkout -b sync-from-reference
git fetch reference
git merge reference/main --allow-unrelated-histories
git checkout main
git merge sync-from-reference
git push origin main
```

## Post-Sync

- Run `pnpm install` for new dependencies
- Run `pnpm build` to verify no errors
- Apply any new database migrations
