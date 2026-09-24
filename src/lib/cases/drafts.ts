import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage";

/** Remove um rascunho não enviado e todos os seus arquivos (banco + armazenamento). */
export async function deleteDraftCompletely(draftId: string): Promise<void> {
  const docs = await prisma.document.findMany({ where: { draftId }, select: { storageKey: true } });
  if (docs.length) {
    const storage = await getStorage();
    for (const doc of docs) {
      await storage.remove(doc.storageKey).catch((error) => console.error("[drafts] falha ao remover arquivo", error));
    }
  }
  await prisma.caseDraft.deleteMany({ where: { id: draftId, submittedAt: null } });
}
