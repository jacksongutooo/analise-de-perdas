import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { NOT_INFORMED, STORE, STORE_LINKS } from "@/lib/natal/store";
import { IconTree, IconTruck } from "./icons";
import { Container } from "./ui";

// Topo, cabeçalho e rodapé da página /kit-de-natal.

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="12" fill="#0d3627" />
      <path d="M20 11.2 15.4 17.2h2.2l-4.2 5.4h2.8l-4.6 6h16.8l-4.6-6h2.8l-4.2-5.4h2.2z" fill="#f8f2e7" />
      <rect x="19" y="28.4" width="2" height="3.2" rx="0.6" fill="#f8f2e7" />
      <path d="M20 4.4c.3 2 1.3 3 3.3 3.3-2 .3-3 1.3-3.3 3.3-.3-2-1.3-3-3.3-3.3 2-.3 3-1.3 3.3-3.3z" fill="#e2c47c" />
    </svg>
  );
}

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <a href="#" className="inline-flex items-center gap-2.5 rounded-lg" aria-label={`${STORE.name} — voltar ao início`}>
      <LogoMark className={cx("size-9", dark && "ring-1 ring-white/15 rounded-xl")} />
      <span className={cx("font-display text-[1.3rem] font-semibold tracking-[-0.01em]", dark ? "text-cream-50" : "text-pine-950")}>{STORE.name}</span>
    </a>
  );
}

export function TopBar() {
  return (
    <div className="bg-pine-950 text-cream-100">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-[0.78rem] font-medium sm:text-[0.82rem]">
        <span className="inline-flex items-center gap-1.5">
          <IconTree size={15} className="text-gold-300" />
          Pré-Venda Especial de Natal
        </span>
        <span aria-hidden="true" className="hidden text-gold-300/70 md:inline">
          •
        </span>
        <span className="inline-flex items-center gap-1.5">
          <IconTruck size={16} className="text-gold-300" />
          Frete Grátis para Todo o Brasil
        </span>
      </p>
    </div>
  );
}

export function StoreHeader() {
  return (
    <header className="border-b border-pine-900/10 bg-cream-50">
      <Container className="flex h-16 items-center justify-center sm:h-[4.5rem]">
        <Logo />
      </Container>
    </header>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <a href={href} className="rounded transition-colors hover:text-gold-200">
        {children}
      </a>
    </li>
  );
}

function FooterHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-gold-300">{children}</h2>;
}

export function StoreFooter() {
  const company: [string, ReactNode][] = [
    ["Razão social", STORE.legalName],
    ["CNPJ", STORE.cnpj],
    ["E-mail", STORE.email && <a href={`mailto:${STORE.email}`} className="hover:text-gold-200">{STORE.email}</a>],
    ["Endereço", STORE.address],
  ];
  return (
    <footer className="bg-pine-950 text-[0.92rem] text-cream-100/75">
      {/* Espaço extra no celular para a barra fixa de compra não cobrir o rodapé. */}
      <Container className="pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-14 lg:pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo dark />
            <p className="mt-4 max-w-xs leading-relaxed">
              Kit de Natal Completo com árvore de 1,5 m, pisca-pisca LED e enfeites, em pré-venda com frete grátis.
            </p>
          </div>
          <nav aria-label="Ajuda" className="lg:col-span-2">
            <FooterHeading>Ajuda</FooterHeading>
            <ul className="mt-4 space-y-2.5">
              <FooterLink href={STORE_LINKS.atendimento}>Atendimento</FooterLink>
              <FooterLink href={STORE_LINKS.preVenda}>Informações sobre pré-venda</FooterLink>
              <FooterLink href={STORE_LINKS.entrega}>Política de Entrega</FooterLink>
            </ul>
          </nav>
          <nav aria-label="Políticas" className="lg:col-span-3">
            <FooterHeading>Políticas</FooterHeading>
            <ul className="mt-4 space-y-2.5">
              <FooterLink href={STORE_LINKS.privacidade}>Política de Privacidade</FooterLink>
              <FooterLink href={STORE_LINKS.termos}>Termos de Uso</FooterLink>
              <FooterLink href={STORE_LINKS.trocas}>Política de Trocas e Devoluções</FooterLink>
            </ul>
          </nav>
          <div className="lg:col-span-3">
            <FooterHeading>Empresa</FooterHeading>
            <dl className="mt-4 space-y-2.5">
              {company.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[0.72rem] uppercase tracking-[0.12em] text-cream-100/50">{label}</dt>
                  <dd className={cx("break-words", !value && "italic text-cream-100/45")}>{value || NOT_INFORMED}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 text-[0.8rem] text-cream-100/55">© 2026 {STORE.name}. Todos os direitos reservados.</p>
      </Container>
    </footer>
  );
}
