const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (e) {
    done(e);
  }
});

// ─── Local Strategy ────────────────────────────────────────────────────────────
passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash)
        return done(null, false, { message: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return done(null, false, { message: 'Invalid credentials' });
      if (user.isBlocked) return done(null, false, { message: 'Account blocked' });

      return done(null, user);
    } catch (e) {
      done(e);
    }
  })
);

// ─── OAuth helper ──────────────────────────────────────────────────────────────
async function handleOAuth(provider, profile, done) {
  try {
    const email =
      profile.emails?.[0]?.value ||
      `${provider}_${profile.id}@noemail.invalid`;

    const existing = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId: String(profile.id) } },
      include: { user: true },
    });

    if (existing) {
      if (existing.user.isBlocked)
        return done(null, false, { message: 'Account blocked' });

      // ✅ Абнаўляем аватар, калі ён змяніўся
      const newAvatar = profile.photos?.[0]?.value || null;
      if (newAvatar && existing.user.avatarUrl !== newAvatar) {
        const updated = await prisma.user.update({
          where: { id: existing.user.id },
          data: { avatarUrl: newAvatar },
        });
        return done(null, updated);
      }

      // ✅ Калі username быў пустым (напрыклад, пасля старой памылкі), запаўняем яго поштай
      if (!existing.user.username || existing.user.username.includes('___')) {
        const updated = await prisma.user.update({
          where: { id: existing.user.id },
          data: { username: email },
        });
        return done(null, updated);
      }

      return done(null, existing.user);
    }

    // ✅ Спрабуем звязаць з існуючым карыстальнікам па email
    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // ✅ Абнаўляем аватар і заадно запаўняем username, калі ён пусты
      const newAvatar = profile.photos?.[0]?.value || null;
      user = await prisma.user.update({
        where: { id: user.id },
        data: { 
          avatarUrl: newAvatar || user.avatarUrl,
          username: user.username || email // Калі username пусты — пішам пошту
        },
      });
    } else {
      // ✅ Для НОВАГА карыстальніка адразу ставім email як username
      let username = email;

      // На ўсялякі выпадак праверым, ці не заняты такі username (хоць email унікальны)
      const conflict = await prisma.user.findUnique({ where: { username } });
      if (conflict) {
        username = `${email}_${Math.floor(Math.random() * 1000)}`;
      }

      user = await prisma.user.create({
        data: {
          email,
          username,
          avatarUrl: profile.photos?.[0]?.value || null,
        },
      });
    }

    // Ствараем сувязь з OAuth акаўнтам
    await prisma.oAuthAccount.upsert({
      where: { provider_providerId: { provider, providerId: String(profile.id) } },
      update: {},
      create: { provider, providerId: String(profile.id), userId: user.id },
    });

    return done(null, user);
  } catch (e) {
    done(e);
  }
}

// ─── Google Strategy ───────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
      },
      (accessToken, refreshToken, profile, done) =>
        handleOAuth('google', profile, done)
    )
  );
}

// ─── GitHub Strategy ───────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL}/api/auth/github/callback`,
        scope: ['user:email'],
      },
      (accessToken, refreshToken, profile, done) =>
        handleOAuth('github', profile, done)
    )
  );
}

module.exports = passport;