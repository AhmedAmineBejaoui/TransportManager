import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

const MotionButton = motion(Button);

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: "Les mots de passe ne correspondent pas",
        description: "Verifiez votre saisie.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Mot de passe mis a jour",
        description: "Vous pouvez maintenant vous reconnecter.",
      });
    }, 750);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030914] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-[-38%] h-[82%] bg-[radial-gradient(100%_60%_at_50%_38%,rgba(18,216,255,0.18),transparent)]" />
        <div className="absolute inset-x-0 bottom-[-50%] h-[90%] bg-[radial-gradient(120%_90%_at_50%_82%,rgba(16,114,255,0.16),transparent)]" />
        <div className="absolute -left-24 top-12 h-64 w-64 bg-primary/20 blur-[140px]" />
        <div className="absolute right-0 bottom-12 h-72 w-72 bg-cyan-400/20 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 lg:py-16">
        <div className="flex items-center gap-3 text-sm text-white/70">
          <Link href="/login" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Retour a la connexion
          </Link>
        </div>

        <div className="grid items-start gap-10 lg:grid-cols-[1.05fr,0.95fr]">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Recuperation
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold font-heading leading-tight">
              Reinitialisez{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-blue-500">
                votre mot de passe
              </span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl">
              Saisissez votre email et choisissez un nouveau mot de passe. Nous protegerons l’acces a votre compte.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  Verification requise
                </div>
                <p className="text-sm text-white/70 mt-1">Nous verifions l'identite avant la mise a jour.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Acces renforce
                </div>
                <p className="text-sm text-white/70 mt-1">Activez ensuite l'authentification renforcee dans les reglages.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,14,24,0.92)] shadow-[0_24px_80px_-48px_rgba(0,0,0,0.75)]"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(18,216,255,0.08),transparent)]" />
            <div className="absolute -inset-px rounded-[28px] border border-white/10" aria-hidden />
            <div className="relative p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">Securite</p>
                  <h2 className="text-2xl font-semibold">Changer votre mot de passe</h2>
                </div>
                <div className="h-12 w-12 rounded-xl border border-primary/30 bg-primary/15 text-primary flex items-center justify-center shadow-glow">
                  <Lock className="h-5 w-5" />
                </div>
              </div>

              <Card className="border-none bg-transparent shadow-none">
                <CardHeader className="px-0">
                  <CardTitle className="text-xl text-white">Informations requises</CardTitle>
                  <CardDescription className="text-white/70">
                    Ajoutez votre email et un nouveau mot de passe.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="votre@email.com"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-password">Nouveau mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                        <Input
                          id="reset-password"
                          type="password"
                          placeholder="********"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-confirm">Confirmer le mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                        <Input
                          id="reset-confirm"
                          type="password"
                          placeholder="********"
                          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/50 focus-visible:ring-primary/70 focus-visible:border-primary/50"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <MotionButton
                      type="submit"
                      className="w-full bg-gradient-to-r from-primary via-cyan-400 to-blue-500 text-slate-950 font-semibold shadow-glow"
                      disabled={isSubmitting}
                      whileHover={{ y: -2, boxShadow: "0px 18px 45px -16px rgba(18,216,255,0.6)" }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                    >
                      {isSubmitting ? "Mise a jour..." : "Valider et mettre a jour"}
                    </MotionButton>
                  </form>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
