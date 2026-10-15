// PIN login screen. Enters the account via a single numeric field with inline error messages.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Wallet } from "lucide-react";

import { signIn } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn(pin);
      if (!result.ok) {
        setError(result.error);
        setPin("");
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="mb-1 inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <Wallet className="size-5.5" strokeWidth={2.2} aria-hidden />
        </span>
        <CardTitle className="text-xl tracking-tight">ShowMyMoney</CardTitle>
        <CardDescription>PIN을 입력하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={12}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, ""))
              }
              disabled={pending}
              autoFocus
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={pending || pin.length === 0}>
            {pending ? <Loader2 className="animate-spin" /> : "로그인"}
          </Button>
          <Link
            href="/signup"
            className="rounded-full px-3 py-1.5 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            새 계정 만들기
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
