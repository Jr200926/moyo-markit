import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Entrar — Moyo Mark" }],
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
    .min(9, "Telefone obrigatório")
    .max(20)
    .regex(/^[+\d\s-]+$/, "Telefone inválido"),
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground text-xl font-bold">
            M
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Bem-vindo à Moyo Mark</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre ou crie conta para publicar anúncios.
          </p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            <SignInForm />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignUpForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm() {
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

function SignUpForm() {
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
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
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
          placeholder="+244 9XX XXX XXX"
          required
          maxLength={20}
        />
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
