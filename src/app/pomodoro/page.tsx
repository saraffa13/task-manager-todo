import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import PomodoroReport from "@/components/PomodoroReport";

export default async function PomodoroPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <PomodoroReport userEmail={session.user.email} />;
}
