<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- legacy/ holds a read-only snapshot of the original Report-Advisor app; it is outside the build — port pieces into src/ rather than importing from legacy/.
- Roles live in public.user_roles with has_role(); a trigger on auth.users makes the first signup admin — never derive roles from user metadata.
- All pages share src/components/site-header.tsx; styling uses tokens/utilities in src/styles.css (glass, bg-gradient-gold, shadow-glow, lift).
