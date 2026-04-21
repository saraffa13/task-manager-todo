import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Processes from "@/components/Processes";

export default async function ProcessesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <Processes userEmail={session.user.email} />;
}
