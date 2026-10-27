import { normalizeAngolanPhone, PHONE_ERROR } from "@/lib/phone";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — Moyo Markit" }],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, "Nome obrigatório").max(100),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeAngolanPhone(v) !== null, PHONE_ERROR),
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-block">
            <img src="/logo-icon.png" alt="Moyo Markit" className="size-16" />
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Bem-vindo à Moyo Markit</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre ou crie conta para publicar anúncios.
          </p>
        </div>

        {pendingEmail ? (
          <ConfirmEmailPanel email={pendingEmail} onBack={() => setPendingEmail(null)} />
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <SignInForm onNeedsConfirmation={setPendingEmail} />
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <SignUpForm onNeedsConfirmation={setPendingEmail} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function SignInForm({ onNeedsConfirmation }: { onNeedsConfirmation: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      if (error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)) {
        onNeedsConfirmation(parsed.data.email);
        return;
      }
      if (/invalid login credentials/i.test(error.message)) {
        toast.error("Email ou palavra-passe incorretos.");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="email-in">Email</Label>
        <Input
          id="email-in"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password-in">Palavra-passe</Label>
        <Input
          id="password-in"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          maxLength={72}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "A entrar..." : "Entrar"}
      </Button>
    </form>
  );
}

function SignUpForm({ onNeedsConfirmation }: { onNeedsConfirmation: (email: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = signUpSchema.safeParse({ full_name: fullName, phone, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          phone: normalizeAngolanPhone(parsed.data.phone),
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      onNeedsConfirmation(parsed.data.email);
      return;
    }
    toast.success("Conta criada! Já pode publicar.");
    navigate({ to: "/" });
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="name-up">Nome completo</Label>
        <Input
          id="name-up"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone-up">Telefone (WhatsApp)</Label>
        <Input
          id="phone-up"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="923 456 789"
          inputMode="tel"
          required
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground">
          Número angolano, o mesmo que usa no WhatsApp. É por ele que os compradores falam consigo.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-up">Email</Label>
        <Input
          id="email-up"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          maxLength={255}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password-up">Palavra-passe</Label>
        <Input
          id="password-up"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          maxLength={72}
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "A criar..." : "Criar conta"}
      </Button>
    </form>
  );
}

function ConfirmEmailPanel({ email, onBack }: { email: string; onBack: () => void }) {
  const [cooldown, setCooldown] = useState(60);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) {
      toast.error(
        /rate limit|seconds/i.test(error.message)
          ? "Aguarde um pouco antes de pedir outro e-mail."
          : error.message,
      );
      return;
    }
    toast.success("E-mail reenviado.");
    setCooldown(60);
  }

  return (
    <div className="text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="size-7" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Verifique o seu e-mail</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enviámos um link de confirmação para <strong className="text-foreground">{email}</strong>.
        Abra o e-mail e toque no link para ativar a sua conta. Veja também a pasta de spam.
      </p>
      <Button
        type="button"
        variant="outline"
        className="mt-5 w-full"
        disabled={sending || cooldown > 0}
        onClick={resend}
      >
        {sending
          ? "A enviar..."
          : cooldown > 0
            ? `Reenviar e-mail (${cooldown}s)`
            : "Reenviar e-mail"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="mt-3 text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Voltar
      </button>
    </div>
  );
}
