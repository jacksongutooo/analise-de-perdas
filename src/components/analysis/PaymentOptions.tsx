"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { startPayment } from "@/app/analise/pagamento/actions";

export function PaymentOptions() {
  const [accepted, setAccepted] = useState(false);
  return (
    <form action={startPayment} className="mt-6 space-y-5">
      <div className="rounded-2xl border-2 border-ok-600/40 bg-ok-50/60 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-ink">PIX</p>
            <p className="mt-1 text-sm text-ink-soft">Pagamento à vista via PIX</p>
          </div>
          <span className="rounded-full bg-ok-600 px-2.5 py-1 text-xs font-bold text-white">5% OFF</span>
        </div>
        <p className="mt-5 text-sm text-muted line-through">R$ 219,90</p>
        <p className="text-3xl font-semibold tracking-tight text-ink">R$ 208,91</p>
        <Button name="paymentMethod" value="pix" type="submit" size="lg" className="mt-5 w-full" disabled={!accepted}>
          Pagar R$ 208,91 com PIX
        </Button>
      </div>

      <div className="rounded-2xl border border-line bg-paper p-5">
        <p className="text-lg font-semibold text-ink">Pagamento padrão</p>
        <p className="mt-1 text-sm text-ink-soft">Cartão ou outro método integrado posteriormente</p>
        <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">R$ 219,90</p>
        <Button name="paymentMethod" value="standard" type="submit" variant="secondary" size="lg" className="mt-5 w-full" disabled={!accepted}>
          Pagar R$ 219,90
        </Button>
      </div>

      <div className="rounded-xl border border-line bg-surface p-4">
        <label className="flex items-start gap-3 text-sm leading-relaxed text-ink">
          <input type="checkbox" name="termsAccepted" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 size-4 accent-navy-900" />
          <span>
            Li e estou de acordo com as condições do serviço de análise e confirmo que a documentação foi enviada corretamente com o mesmo CPF informado no cadastro.
          </span>
        </label>
        <p className="mt-2 pl-7 text-xs leading-relaxed text-muted">
          A qualidade da análise melhora quando os dados e documentos estão completos e consistentes, e a solicitação só pode ser realizada uma vez para garantir integridade do processo.
        </p>
        <p className="mt-2 pl-7 text-xs text-muted">
          <Link href="/termos" className="underline hover:text-ink">Termos do Serviço</Link>
          {" · "}
          <Link href="/privacidade" className="underline hover:text-ink">Política de Privacidade</Link>
        </p>
      </div>
    </form>
  );
}
