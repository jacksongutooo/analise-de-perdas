// MODELO: revise este texto com assessoria jurídica antes de publicar.
import type { Metadata } from "next";
import Link from "next/link";
import { LegalList, LegalPage, LegalSection } from "@/components/legal";
import { config } from "@/lib/env";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  const company = site.legalName || site.name;
  return (
    <LegalPage title="Termos de Uso" updatedAt="setembro de 2026">
      <p>
        Estes termos regulam o uso do site de {company}
        {site.cnpj ? ` (CNPJ ${site.cnpj})` : ""} para solicitar a análise documental de perdas em apostas online. Ao enviar uma solicitação, você
        declara que leu e concorda com estes termos e com a{" "}
        <Link href="/privacidade" className="font-medium text-navy-700 underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <LegalSection title="1. O que é o serviço">
        <p>
          Realizamos uma análise documental individual das informações e dos comprovantes enviados por você, para verificar se existem elementos que
          permitam prosseguir com o seu caso. A análise não é garantia de resultado.
        </p>
        <LegalList
          items={[
            "Cada caso é analisado individualmente.",
            "O envio das informações não garante recuperação de valores.",
            "Os valores exibidos no acompanhamento (declarado, identificado e validado) são referências da análise documental e não representam valores a serem recuperados.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Quem pode usar">
        <p>
          O serviço é exclusivo para maiores de 18 anos, que enviem informações sobre as próprias contas em plataformas de apostas. Você se
          compromete a fornecer informações verdadeiras e documentos autênticos, e a não enviar dados de terceiros além do estritamente necessário.
        </p>
      </LegalSection>

      <LegalSection title="3. Prazo">
        <p>
          O prazo máximo estimado para retorno é de até {config.reviewDays} dias a partir do envio completo. Se forem necessários documentos
          adicionais, a análise continua após o recebimento deles e o prazo pode ser ajustado.
        </p>
      </LegalSection>

      <LegalSection title="4. Compromisso voluntário">
        <p>
          O compromisso de não realizar novas apostas durante a análise é uma decisão pessoal e voluntária. Ele não representa bloqueio técnico das
          suas contas e o seu cumprimento não garante aprovação ou recuperação de valores. Para um bloqueio efetivo, existe a autoexclusão oficial do
          Governo Federal, disponível em gov.br/autoexclusaoapostas.
        </p>
      </LegalSection>

      <LegalSection title="5. Segurança e comunicação">
        <p>
          Nunca solicitaremos sua senha da plataforma, senha bancária, código SMS ou código de autenticação. Se alguém pedir esses dados em nosso
          nome, não informe e comunique-nos. O acompanhamento do caso é feito com o protocolo e o e-mail informados na solicitação; mantenha esses
          dados em sigilo.
        </p>
      </LegalSection>

      <LegalSection title="6. Responsabilidades">
        <LegalList
          items={[
            "Você é responsável pela veracidade das informações e pela autenticidade dos documentos enviados.",
            "Podemos recusar ou encerrar solicitações com indícios de fraude, dados falsos ou uso indevido do serviço.",
            "O site pode passar por manutenções e indisponibilidades temporárias.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Alterações e legislação">
        <p>
          Estes termos podem ser atualizados, e a versão vigente estará sempre nesta página. Aplica-se a legislação brasileira, inclusive o Código de
          Defesa do Consumidor, sendo competente o foro do domicílio do consumidor.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
