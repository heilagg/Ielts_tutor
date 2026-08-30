import { requireProfile } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ChatPanel } from "@/components/tutor/ChatPanel";

export default async function TutorPage() {
  const user = await requireProfile();
  const messages = await prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 100 });

  return (
    <div className="max-w-lg mx-auto px-5 py-6 md:py-8 flex flex-col h-screen">
      <h1 className="text-xl font-semibold mb-3">AI Tutor</h1>
      <ChatPanel initialMessages={messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))} />
    </div>
  );
}
