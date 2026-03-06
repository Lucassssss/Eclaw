import { ChatContainer } from "@/components/chat-container";

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 bg-background" />
      <div className="relative flex items-center justify-center min-h-screen p-6 md:p-8">
        <ChatContainer />
      </div>
    </main>
  );
}
