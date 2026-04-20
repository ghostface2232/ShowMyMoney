// 신규 계정 생성 화면. 표시 이름과 PIN, PIN 재확인을 받아 계정과 기본 카테고리를 만든다.
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { signUp } from "@/actions/auth";
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

export default function SignupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (pin !== pinConfirm) {
      setError("PIN이 일치하지 않습니다.");
      return;
    }

    startTransition(async () => {
      const result = await signUp(displayName, pin);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  const canSubmit =
    !pending &&
    displayName.trim().length > 0 &&
    pin.length > 0 &&
    pinConfirm.length > 0;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>새 계정 만들기</CardTitle>
        <CardDescription>표시 이름과 PIN을 설정하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">표시 이름</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={40}
              disabled={pending}
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pin">PIN (숫자 6~12자리)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={12}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, ""))
              }
              disabled={pending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="pinConfirm">PIN 재확인</Label>
            <Input
              id="pinConfirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={12}
              value={pinConfirm}
              onChange={(event) =>
                setPinConfirm(event.target.value.replace(/\D/g, ""))
              }
              disabled={pending}
            />
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
          <Button type="submit" disabled={!canSubmit}>
            {pending ? <Loader2 className="animate-spin" /> : "계정 생성"}
          </Button>
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-center text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            기존 계정으로 로그인
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
