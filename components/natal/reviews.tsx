import { publicFileExists } from "@/lib/natal/public-files";
import { reviews, toReviewView } from "@/lib/natal/reviews";
import { IconTree } from "./icons";
import { ReviewsCarousel } from "./ReviewsCarousel";
import { Container, SectionHeading } from "./ui";

// Avaliações: os dados ficam em lib/natal/reviews.ts. A foto só aparece quando o arquivo existe em
// /public/images/reviews/; sem ela, o card mostra um avatar neutro com as iniciais.
export function Reviews() {
  const items = reviews.map((review) => toReviewView(review, publicFileExists));
  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-title" className="overflow-hidden bg-cream-100 py-16 sm:py-24">
      <Container>
        <SectionHeading
          id="avaliacoes-title"
          eyebrow="Avaliações de clientes"
          title={
            <>
              Quem Já Está Entrando no Clima de Natal
              <IconTree size={30} className="ml-2 inline-block -translate-y-0.5 align-middle text-gold-500" />
            </>
          }
        />
        <div className="reveal mt-10 sm:mt-12">
          <ReviewsCarousel reviews={items} />
        </div>
      </Container>
    </section>
  );
}
