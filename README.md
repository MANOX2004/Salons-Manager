# Salon Queue

Salon booking + live queue token system. Firebase (free Spark plan) + Vercel (free) walin witharak
hadala thiyenne, cost ekak nathuwa.

## Roles

- **super-admin** - okkoma balanna/karanna puluwan. Admin (salon owner) accounts hadanne mekenma.
- **admin** - salon owner. Adha dawase queue eka manage karanawa (serve next, done, skip).
- **customer** - signup form eken witharai account hadaganna puluwan. Appointment book karala,
  token number ekak ganna, live queue eka balanna puluwan.

## 1. Local setup

```
npm install
cp .env.local.example .env.local
```

`.env.local` file eka open karala, Firebase Console -> Project Settings -> Your apps eke
web app config eken values tika danna.

```
npm run dev
```

http://localhost:3000 open karala test karanna.

## 2. Mulinma Super-Admin Account eka hadana widiya

Super-admin account eka public signup form eken hadanne naha (security risk). Me widiyata
manual widiyata Firebase Console eken hadaganna:

1. `/signup` page eken account ekak hadaganna (mema oyage super-admin email/password eka
   use karala). Meka default eka "customer" role ekakin hadenawa.
2. Firebase Console -> Firestore Database -> `users` collection eke, dan hadapu account
   ekage document eka find karaganna (email eken hoyaganna puluwan).
3. Ema document eke `role` field eka `"customer"` walin `"super-admin"` walata edit karanna.
4. Log out karala ayeth login karanna - dan `/super-admin` dashboard ekata redirect wenawa.

Meken passe, ithuru admin (salon owner) accounts okkoma `/super-admin` dashboard eken thamai
hadaganne - "Aluth Admin Ekak Hadanna" form eken.

## 3. Firestore Security Rules danna widiya

Firebase Console -> Firestore Database -> Rules tab ekata gihin, me project eke `firestore.rules`
file eke thiyena content eka copy karala paste karala Publish karanna.

## 4. Vercel ekata deploy karana widiya

1. Me code eka GitHub repo ekakata push karanna.
2. vercel.com eke "Add New Project" -> repo eka import karanna.
3. Settings -> Environment Variables walata `.env.local` eke tibba values okkoma danna.
4. Deploy karanna. Ivara unaata passe URL ekak denawa - eka thamai live site eka.

## 5. Wena Salon Ekakata Copy Karana Widiya (Template widiyata)

Firebase Free plan eka "per project" widiyata thamai denne, ekanisa salon ekakata Firebase
project ekak one:

1. Aluth Firebase project ekak hadaganna (aluth Google/email account ekakin,
   [Firebase Console](https://console.firebase.google.com) eken).
2. Ee project eke Authentication (Email/Password) + Firestore + Web App register + Rules
   README eke 1-3 steps widiyatama karanna.
3. Me code eka aluth GitHub repo ekakata copy karala, aluth Vercel project ekakin deploy
   karanna, aluth Firebase config eka Environment Variables walata danna.
4. README eke 2 wana step eka anuwa aluth salon ekata super-admin account eka hadaganna.

Me widiyata code eka wenas karanna oneme naha - salon ekak ekak ta wenama Firebase project +
Vercel deployment ekak witharai one wenne.

## Queue / Skip Logic

- Customer kenek book karaddi, `tokenNumber` eka dawasakata serial widiyata (1, 2, 3...) denawa.
- Admin "Serve Karanna Patan Ganna" click karama ilanga token eka "serving" wenawa.
- Admin "Skip Karanna" click karama, ee token eka "skipped" section ekata yanawa. Admin ta
  puluwan "Ayeth Queue Ekata Danna" click karala, ilanga (dan serve karana ho karapu) kenata
  passema ayeth queue ekata danna - anthimatama yanne naha.
