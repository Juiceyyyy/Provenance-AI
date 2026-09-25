import { CreateBotForm } from "@/components/bots/create-bot-form";
import { PageHeader, PageShell } from "@/components/app/page-shell";

export default function NewBotPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Custom assistant"
        title="Create your own assistant"
        description="Your specialist assistants are already configured and ready to use. Create a custom assistant only when you need a different role, workflow or knowledge collection."
      />
      <div className="mt-6">
        <CreateBotForm />
      </div>
    </PageShell>
  );
}
