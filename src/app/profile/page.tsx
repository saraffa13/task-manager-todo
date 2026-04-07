import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ProfileForm from "@/components/ProfileForm";
import Header from "@/components/Header";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return (
    <div className="h-screen flex flex-col">
      <Header email={session.user.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto p-6">
          <h2 className="text-2xl font-bold text-nav mb-4">Profile</h2>
          <ProfileForm />
        </div>
      </main>
    </div>
  );
}
