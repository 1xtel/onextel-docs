# Contributing to the OneXtel docs

Anything merged here publishes to the live docs site within a few minutes. So every change goes
through a pull request, and `main` takes no direct commits.

## The flow

1. **Branch.** `git checkout -b sms/dlr-codes` — name it after what you are changing.
2. **Write.** Follow [STYLE_GUIDE.md](STYLE_GUIDE.md). It is the standard reviewers apply.
3. **Check it yourself**, before anyone reads it:

   ```bash
   vale api-reference guides plugins legacy index.mdx   # house style
   npx -y mint@4.2.917 validate                         # build, frontmatter, nav
   npx -y mint@4.2.917 broken-links                     # internal links
   npx -y mint@4.2.917 dev                              # preview at localhost:3000
   ```

   Install Vale once with `brew install vale`. It reads `.vale.ini` in this repo.
4. **Open a pull request.** Fill in the template: what changed, where the facts came from, and
   what you checked.
5. **Checks run automatically** on every pull request, whoever opened it:
   - **House style (Vale)** — terminology, marketing language, minimisers. Errors block the merge.
   - **Build and links (Mintlify)** — a broken link or bad frontmatter blocks the merge.
   - **Brand voice review** — reads the diff and comments on tone, structure and unearned
     warnings. Advisory: it comments, it does not block.
6. **Get one approval**, then merge. Delete the branch.

## What reviewers check

- **Is it true?** Endpoints, parameters, codes and limits match the live API or a named source.
  Anything unverified says so.
- **Does it read like the rest of the docs?** Second person, present tense, no marketing register,
  consequences stated plainly.
- **Is it in the right place?** One page, one job, and the navigation in `docs.json` updated.
- **Would someone finish the task?** Steps in the order the reader does them, with what to check
  at the end.

## Facts before prose

These pages are pasted into production code. Never guess a parameter name, an enum value, an
error code or a limit. Where a vendor document and the live API disagree, document the live
behaviour. Where something cannot be confirmed, write what is known, say what is not, and record
the gap in the internal review notes rather than filling it with something plausible.

## Things that are not documentation

Screenshots go in `images/`, referenced with `<Frame>`. Keep API keys, customer names, real
recipient numbers and internal hostnames out of this repo entirely — it is public.
