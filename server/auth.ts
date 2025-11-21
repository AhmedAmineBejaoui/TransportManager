import passport from "passport";
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from "passport-google-oauth20";
import { storage } from "./storage";

export function configurePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          passReqToCallback: false,
        },
        async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("Email requis par Google"), undefined);
            }
            const providerId = profile.id;

            const existingByProvider = await storage.getUserByEmail(email);
            if (existingByProvider && existingByProvider.auth_provider === "google") {
              return done(null, existingByProvider);
            }

            if (existingByProvider && existingByProvider.auth_provider !== "google") {
              return done(new Error("Cet email est déjà utilisé par un compte local"), undefined);
            }

            const newUser = await storage.createUser({
              email,
              password: "google-oauth",
              nom: profile.name?.familyName || "Google",
              prenom: profile.name?.givenName || "User",
              role: "CLIENT",
              telephone: undefined,
              auth_provider: "google",
              provider_id: providerId,
              statut: "actif",
            });

            return done(null, newUser);
          } catch (error) {
            done(error as Error);
          }
        }
      )
    );
  }
}
