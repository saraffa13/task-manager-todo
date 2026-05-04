import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Loans from "@/components/Loans";

export default async function LoansPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return <Loans userEmail={session.user.email} />;
}
