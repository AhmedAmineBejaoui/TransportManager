import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, User, Phone, Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { ParticleBackground } from "@/components/ParticleBackground";

const MotionButton = motion(Button);

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

  const floatingVariant = {
    animate: {
      x: [0, 18, -12, 0],
      y: [0, -14, 12, 0],
      rotate: [0, 2, -2, 0],
      transition: {
        duration: 18,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, y: 26, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const formVariants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut", delay: 0.12 } },
  };

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
    <div
      className="min-h-screen relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/back.png')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/45 via-white/35 to-white/20 pointer-events-none" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">

        <motion.div
          className="relative w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100 grid lg:grid-cols-[1.1fr,0.9fr]"
          initial="hidden"
          animate="visible"
          variants={panelVariants}
        >
          <div className="p-6 sm:p-10">
            <motion.div
              className="flex flex-col items-center mb-8 gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            >
              <div className="h-16 w-16 rounded-full bg-white shadow flex items-center justify-center overflow-hidden border border-slate-100">
                <img src="/logo.png" alt="Ministere du Transport" className="h-full w-full object-contain p-2" />
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-3xl font-bold text-slate-900">Transport Tunis</h1>
                <p className="text-sm text-slate-500">Accedez a votre compte ou creez-en un nouveau</p>
              </div>
            </motion.div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100">
                <TabsTrigger value="login" data-testid="tab-login" className="data-[state=active]:bg-white">
                  Connexion
                </TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup" className="data-[state=active]:bg-white">
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" asChild>
                <motion.div variants={formVariants} initial="hidden" animate="visible">
                  <Card className="border-none shadow-none">
                    <CardHeader className="px-0">
                      <CardTitle className="text-2xl text-slate-900">Connexion</CardTitle>
                      <CardDescription>Accedez a votre compte</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0 space-y-4">
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="votre@email.com"
                              className="pl-9"
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
                            <a className="text-xs text-primary hover:underline" href="#">
                              Mot de passe oublie ?
                            </a>
                          </div>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              className="pl-9 pr-10"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              data-testid="input-login-password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <MotionButton
                          type="submit"
                          className="w-full"
                          data-testid="button-login"
                          disabled={isLoggingIn}
                          whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(79,70,229,0.45)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        >
                          {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Se connecter
                        </MotionButton>
                      </form>
                      <div className="flex items-center my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="px-2 text-xs text-muted-foreground">Ou</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <MotionButton
                        type="button"
                        variant="outline"
                        className="w-full"
                        whileHover={{ y: -2, boxShadow: "0px 18px 45px -18px rgba(15,23,42,0.25)" }}
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
                  <Card className="border-none shadow-none">
                    <CardHeader className="px-0">
                      <CardTitle className="text-2xl text-slate-900">Inscription</CardTitle>
                      <CardDescription>Creez un nouveau compte client</CardDescription>
                    </CardHeader>
                    <CardContent className="px-0">
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="signup-nom">Nom</Label>
                            <div className="relative">
                              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="signup-nom"
                                placeholder="Nom"
                                className="pl-9"
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
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-email"
                              type="email"
                              placeholder="votre@email.com"
                              className="pl-9"
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
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-telephone"
                              type="tel"
                              placeholder="+216 XX XXX XXX"
                              className="pl-9"
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
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="********"
                              className="pl-9 pr-10"
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              data-testid="input-signup-password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <MotionButton
                          type="submit"
                          className="w-full"
                          data-testid="button-signup"
                          disabled={isSigningUp}
                          whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(79,70,229,0.45)" }}
                          whileTap={{ scale: 0.99 }}
                          transition={{ type: "spring", stiffness: 320, damping: 22 }}
                        >
                          {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          S'inscrire
                        </MotionButton>
                      </form>
                      <div className="flex items-center my-4">
                        <div className="flex-1 h-px bg-border" />
                        <span className="px-2 text-xs text-muted-foreground">Ou</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      <MotionButton
                        type="button"
                        variant="outline"
                        className="w-full"
                        whileHover={{ y: -2, boxShadow: "0px 18px 45px -18px rgba(15,23,42,0.25)" }}
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

          <motion.div
            className="hidden lg:block relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <ParticleBackground />
            <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-white/20 pointer-events-none" aria-hidden />
            
            <div className="absolute bottom-10 left-10 right-10 z-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Experience liftoff</h2>
              <p className="text-lg text-slate-600">
                with te Transport management platform
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
