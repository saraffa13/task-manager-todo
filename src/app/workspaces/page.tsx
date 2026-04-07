import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default async function WorkspacesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <Dashboard userEmail={session.user.email} />;
}
