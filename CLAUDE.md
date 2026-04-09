# CheckCart.io Project Rules
- **Stack:** Next.js 16.2 (App Router), TypeScript, Zustand, Tailwind, Shadcn UI.
- **AI Strategy:** Multi-agent orchestration (Vision Agent -> Critic Agent).
- **Core Goal:** Verify supermarket prices via image scanning to prevent checkout errors.
- **Code Style:** - Functional components with TypeScript.
  - Logic isolated in `/lib` or `/services`.
  - Global state strictly in `/store/useCartStore.ts`.
- **Constraint:** AI-generated data MUST be validated by Zod before hitting the state.