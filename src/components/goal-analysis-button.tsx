// 헤더의 "목표 분석" 버튼. Dialog로 placeholder를 띄운다. 실제 로직은 다음 단계에서 붙는다.
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GoalAnalysisButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          목표 분석
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>목표 분석</DialogTitle>
          <DialogDescription>
            구현 예정입니다. 다음 단계에서 저축 목표와 달성률을 분석해 보여 줍니다.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
