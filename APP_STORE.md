# Disko — App Store readiness

Status of Disko against the iOS App Store approval checklist
(legal, payments & transparency), plus the extra Apple rules that apply to
an app like this one. Replace `<your-domain>` with the Vercel address the
app is served from (e.g. `dj-app-coral.vercel.app`).

## Legal links — done

| Link | URL | In the app |
|---|---|---|
| Privacy Policy | `https://<your-domain>/privacy` | Account menu (tap your avatar) · sign-up screen |
| Terms of Service | `https://<your-domain>/terms` | Account menu · sign-up screen |
| Support | `https://<your-domain>/support` | Account menu · sign-in screen footer |

- Pages live in `app/public/` (`privacy.html`, `terms.html`,
  `support.html`); `app/vercel.json` turns on clean URLs so they're served
  without `.html`.
- Use these **exact same** three URLs in App Store Connect.
- The support page shows a visible support email
  (`disko.app.mail@gmail.com`) and says Disko is made by an independent
  developer. To change the email, edit `EMAIL` at the top of the three
  pages.
- The support page doubles as the app's one-page website: name, what it
  does, an "Open Disko" button, and links to all three legal pages.

## In-app legal access — done

Tap your profile picture (top right) → **Support**, **Privacy Policy**,
**Terms of Service** are each one tap, and open full-screen *inside* the
app (no trip out to Safari). The in-app view loads the same public pages,
so the in-app text and the App Store Connect URLs always match. The sign-up screen also links Terms
and Privacy ("By creating an account you agree to…"), and the sign-in
screen has a Privacy · Terms · Support footer.

## Paywall, Restore Purchases, cancellation — not applicable

Disko has no in-app purchases or subscriptions, so items 4–6 of the
checklist don't apply. If premium features are ever added, they'll need:
exact price + billing period on every option, trial terms next to the
button, a working **Restore Purchases** button, and "Cancel anytime from
Settings > Apple ID > Subscriptions" on the paywall.

## No deceptive UI — done

No countdown timers, no fake urgency, no hidden dismiss buttons. The
opening animation can be skipped with a tap.

## Account deletion — done (Apple guideline 5.1.1(v))

Any app that lets people create an account must let them delete it in the
app. Account menu → **Delete account** → type your username → **Delete
forever**. It removes the account, every logged set, uploaded photos and
videos, the profile photo, plus-ones, crew memberships and crews they
started (`delete_my_account()` in `supabase/schema.sql`).

## Reviewer credentials — your step

Disko requires a login, so App Review needs a working test account:

1. Sign up in the app with an email you control, e.g. a second Gmail.
2. Confirm it from the email, pick a username, and log a few sets (and
   add a plus-one) so the reviewer sees a populated app.
3. In App Store Connect → your app → **App Review Information**, enter
   that email and password under **Sign-in required**.
4. Don't delete or change that account while the app is in review.

## Still needed before submitting

- **Re-run `app/supabase/schema.sql`** in the Supabase SQL Editor — account
  deletion and several newer features need it.
- **User-generated content (Apple guideline 1.2).** Apps where people
  post content others see (notes, photos, comments, usernames) must offer a way to
  **report** posts/users and to **block** users, act on reports, and
  publish contact info. Right now reports go through the support email;
  in-app Report and Block buttons are the next thing to build.
- **A native iOS app.** Disko is a web app today. The App Store needs an
  iOS app built in Xcode on a Mac, usually by wrapping this web app with
  Capacitor and adding native touches (Apple rejects apps that are
  "just a website", guideline 4.2), plus an Apple Developer account
  ($99/year).
- **App Store Connect listing:** app name, subtitle, description,
  keywords, screenshots, the three URLs above, age rating, and the App
  Privacy questionnaire (data collected: email, username, photos/videos,
  user content, coarse location (city); no tracking, no ads).

## If you get rejected

1. Read the rejection notice — it cites the guideline number.
2. Fix only what's cited.
3. Use **Reply to App Review** in App Store Connect if it's unclear.
4. For a clear mistake on Apple's side, appeal to the App Review Board.
