// PIN 로그인 화면. 단일 숫자 필드와 인라인 에러 메시지로 계정에 진입한다.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

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
        <CardTitle>로그인</CardTitle>
        <CardDescription>PIN을 입력해 계정에 접속하세요.</CardDescription>
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
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            새 계정 만들기
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
