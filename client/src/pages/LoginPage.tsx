import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Phone, Loader2, Eye, EyeOff, Sparkles, ShieldCheck, Clock3, QrCode } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ParticleBackground } from "@/components/ParticleBackground";

const MotionButton = motion(Button);

const heroFeatures = [
  { icon: ShieldCheck, title: "Acces securise", desc: "SSO, OTP et suivi en temps reel." },
  { icon: Clock3, title: "Dispatch instantane", desc: "Planifiez et trackez sans friction." },
  { icon: Sparkles, title: "Copilote IA", desc: "Suggestions de trajets et stats pro." },
  { icon: QrCode, title: "Validation terrain", desc: "QR codes et preuve de passage." },
];

export default function LoginPage() {
  const { login, signup, isLoggingIn, isSigningUp } = useAuth();
  const { toast } = useToast();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupNom, setSignupNom] = useState("");
  const [signupPrenom, setSignupPrenom] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupTelephone, setSignupTelephone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const panelVariants = {
    hidden: { opacity: 0, y: 26, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const formVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay: 0.12 } },
  };

  const focusLoginInput = () => document.getElementById("login-email")?.focus();
  const focusSignupInput = () => document.getElementById("signup-email")?.focus();

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    login(
      { email: loginEmail, password: loginPassword },
      {
        onError: (error: any) =>
          toast({
            title: "Erreur de connexion",
            description: error?.message || "Email ou mot de passe incorrect",
            variant: "destructive",
          }),
      },
    );
  };

  const handleSignup = (e: FormEvent) => {
    e.preventDefault();
    signup(
      {
        email: signupEmail,
        password: signupPassword,
        nom: signupNom,
        prenom: signupPrenom,
        telephone: signupTelephone,
      },
      {
        onError: (error: any) =>
          toast({
            title: "Erreur d'inscription",
            description: error?.message || "Impossible de creer le compte",
            variant: "destructive",
          }),
        onSuccess: () =>
          toast({
            title: "Compte cree",
            description: "Votre compte a ete cree avec succes",
          }),
      },
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030914] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-[-38%] h-[82%] bg-[radial-gradient(100%_60%_at_50%_38%,rgba(18,216,255,0.18),transparent)]" />
        <div className="absolute inset-x-0 bottom-[-50%] h-[90%] bg-[radial-gradient(120%_90%_at_50%_82%,rgba(16,114,255,0.16),transparent)]" />
        <div className="absolute -left-24 top-12 h-64 w-64 bg-primary/20 blur-[140px]" />
        <div className="absolute right-0 bottom-12 h-72 w-72 bg-cyan-400/20 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 lg:py-16 space-y-10">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_10px_30px_-18px_rgba(0,0,0,0.8)]">
              <img src="/logo.png" alt="Ministere du Transport" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">Transport Tunis</p>
              <p className="text-lg font-semibold">Plateforme de gestion</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="h-4 w-4 text-primary" />
            Nouvelle experience visuelle
          </div>
        </div>

        <div className="grid items-stretch gap-10 lg:grid-cols-[1.05fr,0.95fr]">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Portail unifie
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-heading leading-tight">
              Que voulez-vous{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-blue-500">
                piloter
              </span>{" "}
              aujourd'hui ?
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Creez, planifiez et controlez vos trajets avec une experience inspiree des meilleurs outils pro.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              {heroFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.7)]"
                >
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
                    <feature.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">{feature.title}</p>
                    <p className="text-sm text-white/70">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <MotionButton
                type="button"
                onClick={focusLoginInput}
                className="bg-gradient-to-r from-primary via-cyan-400 to-blue-500 text-slate-950 font-semibold px-6 shadow-glow"
                whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(18,216,255,0.6)" }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
              >
                Acceder au portail
              </MotionButton>
              <Button
                type="button"
                variant="outline"
                onClick={focusSignupInput}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                Creer un compte
              </Button>
              <div className="flex items-center gap-2 text-xs text-white/60">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Conformite et chiffrement
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold">2.4k</p>
                <p className="text-xs text-white/60">Trajets mensuels</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold">99.2%</p>
                <p className="text-xs text-white/60">Taux de ponctualite</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-xs text-white/60">Support prioritaire</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,14,24,0.92)] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.75)]"
            initial="hidden"
            animate="visible"
            variants={panelVariants}
          >
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(18,216,255,0.08),transparent)]" />
            <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen">
              <ParticleBackground />
            </div>
            <div className="absolute -inset-px rounded-[28px] border border-white/10" aria-hidden />

            <div className="relative p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">Portail securise</p>
                  <h2 className="text-2xl font-semibold">Connexion & inscription</h2>
                </div>
                <div className="h-12 w-12 rounded-xl border border-primary/30 bg-primary/15 text-primary flex items-center justify-center shadow-glow">
                  <Lock className="h-5 w-5" />
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full space-y-6">
                <TabsList className="grid w-full grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1">
                  <TabsTrigger
                    value="login"
                    data-testid="tab-login"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-slate-950 data-[state=active]:shadow-glow"
                  >
                    Connexion
                  </TabsTrigger>
                  <TabsTrigger
                    value="signup"
                    data-testid="tab-signup"
                    className="rounded-lg text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-slate-950 data-[state=active]:shadow-glow"
                  >
                    Inscription
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" asChild>
                  <motion.div variants={formVariants} initial="hidden" animate="visible">
                    <Card className="border-none bg-transparent shadow-none">
                      <CardHeader className="px-0">
                        <CardTitle className="text-2xl text-white">Connexion</CardTitle>
                        <CardDescription className="text-white/70">Accedez a votre compte</CardDescription>
                      </CardHeader>
                      <CardContent className="px-0 space-y-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="login-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                              <Input
                                id="login-email"
                                type="email"
                                placeholder="votre@email.com"
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                data-testid="input-login-email"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Mot de passe</Label>
                              <Link className="text-xs text-primary hover:underline" href="/forgot-password">
                                Mot de passe oublie ?
                              </Link>
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                              <Input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                className="pl-10 pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                data-testid="input-login-password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-white/60 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <MotionButton
                            type="submit"
                            className="w-full bg-gradient-to-r from-primary via-cyan-400 to-blue-500 text-slate-950 font-semibold shadow-glow"
                            data-testid="button-login"
                            disabled={isLoggingIn}
                            whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(18,216,255,0.6)" }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 320, damping: 22 }}
                          >
                            {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Se connecter
                          </MotionButton>
                        </form>
                        <div className="flex items-center my-4 text-white/60">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="px-2 text-xs">Ou</span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>
                        <MotionButton
                          type="button"
                          variant="outline"
                          className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                          whileHover={{ y: -2, boxShadow: "0px 18px 45px -18px rgba(0,0,0,0.45)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 320, damping: 22 }}
                          onClick={() => {
                            window.location.href = "/api/auth/google";
                          }}
                        >
                          Continuer avec Google
                        </MotionButton>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>

                <TabsContent value="signup" asChild>
                  <motion.div variants={formVariants} initial="hidden" animate="visible">
                    <Card className="border-none bg-transparent shadow-none">
                      <CardHeader className="px-0">
                        <CardTitle className="text-2xl text-white">Inscription</CardTitle>
                        <CardDescription className="text-white/70">Creez un nouveau compte client</CardDescription>
                      </CardHeader>
                      <CardContent className="px-0">
                        <form onSubmit={handleSignup} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="signup-nom">Nom</Label>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                                <Input
                                  id="signup-nom"
                                  placeholder="Nom"
                                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                  value={signupNom}
                                  onChange={(e) => setSignupNom(e.target.value)}
                                  data-testid="input-signup-nom"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-prenom">Prenom</Label>
                              <Input
                                id="signup-prenom"
                                placeholder="Prenom"
                                className="bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={signupPrenom}
                                onChange={(e) => setSignupPrenom(e.target.value)}
                                data-testid="input-signup-prenom"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                              <Input
                                id="signup-email"
                                type="email"
                                placeholder="votre@email.com"
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={signupEmail}
                                onChange={(e) => setSignupEmail(e.target.value)}
                                data-testid="input-signup-email"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-telephone">Telephone</Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                              <Input
                                id="signup-telephone"
                                type="tel"
                                placeholder="+216 XX XXX XXX"
                                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={signupTelephone}
                                onChange={(e) => setSignupTelephone(e.target.value)}
                                data-testid="input-signup-telephone"
                                required
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="signup-password">Mot de passe</Label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                              <Input
                                id="signup-password"
                                type={showPassword ? "text" : "password"}
                                placeholder="********"
                                className="pl-10 pr-12 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                                value={signupPassword}
                                onChange={(e) => setSignupPassword(e.target.value)}
                                data-testid="input-signup-password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-white/60 hover:text-white transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          <MotionButton
                            type="submit"
                            className="w-full bg-gradient-to-r from-primary via-cyan-400 to-blue-500 text-slate-950 font-semibold shadow-glow"
                            data-testid="button-signup"
                            disabled={isSigningUp}
                            whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(18,216,255,0.6)" }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 320, damping: 22 }}
                          >
                            {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            S'inscrire
                          </MotionButton>
                        </form>
                        <div className="flex items-center my-4 text-white/60">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="px-2 text-xs">Ou</span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>
                        <MotionButton
                          type="button"
                          variant="outline"
                          className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10"
                          whileHover={{ y: -2, boxShadow: "0px 18px 45px -18px rgba(0,0,0,0.45)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 320, damping: 22 }}
                          onClick={() => {
                            window.location.href = "/api/auth/google";
                          }}
                        >
                          Creer avec Google
                        </MotionButton>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
