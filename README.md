# Salon Queue

Salon booking + live queue token system, built entirely on Firebase (free Spark plan)
and Vercel (free) — no cost.

## Roles

- **super-admin** — can do everything. Creates admin (salon owner) accounts.
- **admin** — the salon owner. Manages today's queue (serve next, mark done, skip).
- **customer** — can only be created via the signup form. Books an appointment,
  gets a token number, and sees the live queue.

## 1. Local setup

```
npm install
```

`.env.local` should already contain your Firebase web app config (from
Firebase Console -> Project Settings -> Your apps). If you need to recreate it,
copy `.env.local.example` to `.env.local` and fill in the values.

```
npm run dev
```

Open http://localhost:3000 to test.

## 2. Creating the first super-admin account

Super-admin accounts are never created through the public signup form (for
security). Create the first one manually:

1. Go to `/signup` and create an account with the email/password you want
   to use as super-admin. This is created with role "customer" by default.
2. In Firebase Console -> Firestore Database -> `users` collection, find the
   document for the account you just created (search by email).
3. Edit that document's `role` field from `"customer"` to `"super-admin"`.
4. Log out and log back in — you'll now be redirected to `/super-admin`.

After that, create every other admin (salon owner) account from the
`/super-admin` dashboard's "Create a New Admin" form.

## 3. Setting up Firestore Security Rules

Firebase Console -> Firestore Database -> Rules tab, then paste the contents
of this project's `firestore.rules` file and click Publish.

## 4. Deploying to Vercel

1. Push this code to a GitHub repo.
2. On vercel.com, "Add New Project" -> import that repo.
3. In Settings -> Environment Variables, add every value from `.env.local`.
4. Deploy. You'll get a live URL once it finishes.

## 5. Reusing this as a template for another salon

Firebase's free plan is "per project", so each salon needs its own Firebase
project:

1. Create a new Firebase project (can use a different Google/email account),
   from [Firebase Console](https://console.firebase.google.com).
2. In that project, enable Authentication (Email/Password) + Firestore +
   register a Web App + set up Rules — same as steps 1-3 above.
3. Push this code to a new GitHub repo, deploy it as a new Vercel project,
   and add that Firebase project's config as Environment Variables.
4. Follow step 2 above to create that salon's first super-admin account.

No code changes needed — each salon just needs its own Firebase project and
Vercel deployment.

## Queue / Skip Logic

- When a customer books, `tokenNumber` is assigned per day (1, 2, 3...).
- Admin clicks "Start Serving" to move the next waiting token to "serving".
- Admin clicks "Skip" to move a token to the Skipped section. Clicking
  "Re-insert into Queue" places it right after whoever is next in line (or
  currently being served) — not at the back of the whole queue.
