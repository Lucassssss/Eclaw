import { ChatContainer } from "@/components/chat-container";

export default function Home() {
  return (
    <main className="min-h-screen relative">
      <div className="absolute inset-0 bg-background" />
      <div className="relative flex justify-center min-h-screen ">
        <div className="w-full p-6">
          Aratifact
        </div>
        <ChatContainer />
      </div>
    </main>
  );
}
