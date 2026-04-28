# CardLens — Claude Code Rules

## CRITICAL: File Paths
- **Always write files to the MAIN project directory**: `/Users/architects/Desktop/New Folder/CardLens/`
- **Never write to a worktree path** (any path containing `.claude/worktrees/`)
- Before writing any file, confirm the absolute path starts with `/Users/architects/Desktop/New Folder/CardLens/` and does NOT contain `worktrees`
- After writing files, always run `git status` from the main directory to confirm changes are tracked there

## CRITICAL: Git
- All commits must go to `master` branch
- Before committing, run `git branch` to confirm you are on `master` — if not, run `git checkout master` first
- Always run `git push origin master` after committing
- Never assume a worktree branch equals master

## Project Structure
- `app/(tabs)/index.tsx` — Main scan screen with camera, level indicator, card capture flow
- `app/analysis.tsx` — Grade results screen
- `constants/apiConfig.ts` — API URL constants (Vercel proxy at `card-lens-ivory.vercel.app`)
- `constants/cardGrading.ts` — Claude Vision grading via `/api/grade`
- `constants/cardIdentification.ts` — Claude Vision identification via `/api/identify`
- `constants/centeringAnalysis.ts` — JS pixel-based centering math on captured image
- `store/collection.ts` — AsyncStorage collection persistence
- `backend/api/grade.ts` — Vercel serverless grading proxy
- `backend/api/identify.ts` — Vercel serverless identification proxy

## Tech Stack
- React Native with Expo (SDK 52, managed workflow)
- expo-router for file-based routing
- expo-camera for card capture
- expo-sensors (Accelerometer) for level indicator
- expo-file-system for base64 image encoding
- Claude Vision API via Vercel proxy (no user API key needed)

## API
- Vercel backend: `https://card-lens-ivory.vercel.app`
- `/api/identify` — POST `{ image: base64 }` → card identification
- `/api/grade` — POST `{ frontImage: base64, backImage?: base64 }` → grading result

## Grading Formula
- Centering: 30% weight (pixel analysis on captured photo)
- Corners: 25% weight (Claude Vision)
- Edges: 25% weight (Claude Vision)
- Surface: 20% weight (Claude Vision)
- Final PSA grade capped at min_subgrade + 1
