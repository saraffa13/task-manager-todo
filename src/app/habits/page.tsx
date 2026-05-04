import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Habits from "@/components/Habits";

export default async function HabitsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <Habits userEmail={session.user.email} />;
}
